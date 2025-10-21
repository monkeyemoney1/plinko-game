import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { WITHDRAWAL_CONFIG } from '$lib/config/withdrawals';

// GET - получить список выплат для админа
export const GET: RequestHandler = async ({ url }) => {
  try {
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const userId = url.searchParams.get('user_id');

    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          w.*,
          u.telegram_id,
          u.wallet_address as user_wallet,
          u.created_at as user_created_at,
          reviewer.telegram_id as reviewer_telegram_id
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        LEFT JOIN users reviewer ON w.reviewed_by = reviewer.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status !== 'all') {
        query += ` AND w.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (userId) {
        query += ` AND w.user_id = $${paramIndex}`;
        params.push(parseInt(userId));
        paramIndex++;
      }

      query += ` ORDER BY w.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await client.query(query, params);
      
      // Получаем общую статистику
      const statsResult = await client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM withdrawals 
        GROUP BY status
      `);

      const stats = statsResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          total_amount: parseFloat(row.total_amount)
        };
        return acc;
      }, {});

      return json({
        success: true,
        withdrawals: result.rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          user_telegram_id: row.telegram_id,
          user_wallet: row.user_wallet,
          user_created_at: row.user_created_at,
          amount: parseFloat(row.amount),
          fee: parseFloat(row.fee || 0),
          net_amount: parseFloat(row.net_amount),
          wallet_address: row.wallet_address,
          status: row.status,
          auto_process: row.auto_process,
          transaction_hash: row.transaction_hash,
          error_message: row.error_message,
          admin_notes: row.admin_notes,
          created_at: row.created_at,
          completed_at: row.completed_at,
          reviewed_by: row.reviewed_by,
          reviewer_telegram_id: row.reviewer_telegram_id
        })),
        stats,
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Admin withdrawals GET error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};

// POST - действия админа (одобрить, отклонить, добавить заметку)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { 
      action, 
      withdrawal_id, 
      admin_id, 
      admin_notes, 
      reject_reason 
    } = await request.json();

    if (!withdrawal_id || !admin_id || !action) {
      return json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Получаем информацию о выводе
      const withdrawalResult = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1',
        [withdrawal_id]
      );

      if (withdrawalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: 'Withdrawal not found' 
        }, { status: 404 });
      }

      const withdrawal = withdrawalResult.rows[0];

      let updateQuery: string;
      let updateParams: any[];

      switch (action) {
        case 'approve':
          if (withdrawal.status !== WITHDRAWAL_CONFIG.STATUSES.MANUAL_REVIEW) {
            await client.query('ROLLBACK');
            return json({ 
              success: false, 
              error: 'Only manual_review withdrawals can be approved' 
            }, { status: 400 });
          }

          updateQuery = `
            UPDATE withdrawals 
            SET status = $1, reviewed_by = $2, admin_notes = $3
            WHERE id = $4
          `;
          updateParams = [
            WITHDRAWAL_CONFIG.STATUSES.PENDING, 
            admin_id, 
            admin_notes || 'Approved by admin', 
            withdrawal_id
          ];
          break;

        case 'reject':
          if (!['pending', 'manual_review'].includes(withdrawal.status)) {
            await client.query('ROLLBACK');
            return json({ 
              success: false, 
              error: 'Cannot reject processed withdrawal' 
            }, { status: 400 });
          }

          // Возвращаем средства пользователю
          await client.query(
            'UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2',
            [withdrawal.amount, withdrawal.user_id]
          );

          updateQuery = `
            UPDATE withdrawals 
            SET status = $1, reviewed_by = $2, admin_notes = $3, error_message = $4
            WHERE id = $5
          `;
          updateParams = [
            WITHDRAWAL_CONFIG.STATUSES.CANCELLED, 
            admin_id, 
            admin_notes || 'Rejected by admin',
            reject_reason || 'Rejected by administrator',
            withdrawal_id
          ];
          break;

        case 'add_note':
          updateQuery = `
            UPDATE withdrawals 
            SET admin_notes = $1, reviewed_by = $2
            WHERE id = $3
          `;
          updateParams = [admin_notes, admin_id, withdrawal_id];
          break;

        default:
          await client.query('ROLLBACK');
          return json({ 
            success: false, 
            error: 'Invalid action' 
          }, { status: 400 });
      }

      await client.query(updateQuery, updateParams);
      
      // Если одобрили и включена автообработка, запускаем процессинг
      if (action === 'approve' && withdrawal.auto_process) {
        fetch('/api/withdrawals/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawal_id })
        }).catch(err => {
          console.error('Auto-process after approval failed:', err);
        });
      }

      await client.query('COMMIT');

      return json({
        success: true,
        message: `Withdrawal ${action}d successfully`
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Admin withdrawals POST error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};