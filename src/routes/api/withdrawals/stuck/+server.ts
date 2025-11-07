import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { env as privateEnv } from '$env/dynamic/private';

// GET - получить застрявшие заявки в processing
export const GET: RequestHandler = async ({ request }) => {
  console.log('[STUCK] GET request received');
  try {
    // Простая проверка admin пароля (опционально)
    const adminPassword = request.headers.get('X-Admin-Password');
    const expectedPassword = privateEnv.ADMIN_PASSWORD || '2282211q';
    
    console.log('[STUCK] Admin password check:', adminPassword ? 'provided' : 'missing');
    
    if (adminPassword !== expectedPassword) {
      console.log('[STUCK] Unauthorized access attempt');
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[STUCK] Connecting to database...');
    const client = await pool.connect();
    try {
      console.log('[STUCK] Querying stuck withdrawals...');
      // Находим заявки в processing без completed_at
      const result = await client.query(`
        SELECT 
          w.id, 
          w.user_id, 
          w.amount, 
          w.wallet_address, 
          w.status, 
          w.created_at,
          w.error_message,
          w.transaction_hash,
          w.blockchain_transaction_id
        FROM withdrawals w
        WHERE w.status = 'processing' 
          AND w.completed_at IS NULL
        ORDER BY w.created_at ASC
      `);

      console.log(`[STUCK] Found ${result.rows.length} stuck withdrawals`);
      
      return json({
        success: true,
        stuck_withdrawals: result.rows,
        count: result.rows.length,
        total_amount: result.rows.reduce((sum, w) => sum + parseFloat(w.amount), 0)
      });

    } catch (dbError) {
      console.error('[STUCK] Database error:', dbError);
      throw dbError;
    } finally {
      client.release();
      console.log('[STUCK] Database connection released');
    }

  } catch (error) {
    console.error('[STUCK] Get stuck withdrawals error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};

// POST - вернуть застрявшие заявки в pending
export const POST: RequestHandler = async ({ request }) => {
  try {
    const adminPassword = request.headers.get('X-Admin-Password');
    const expectedPassword = privateEnv.ADMIN_PASSWORD || '2282211q';
    
    if (adminPassword !== expectedPassword) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, withdrawal_ids } = await request.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (action === 'reset_to_pending') {
        // Вернуть в pending для повторной обработки
        const result = await client.query(`
          UPDATE withdrawals 
          SET status = 'pending', 
              error_message = 'Reset from stuck processing state'
          WHERE status = 'processing' 
            AND completed_at IS NULL
            AND transaction_hash IS NULL
            AND (
              $1::int[] IS NULL 
              OR id = ANY($1::int[])
            )
          RETURNING id, user_id, amount
        `, [withdrawal_ids || null]);

        await client.query('COMMIT');

        console.log(`[STUCK] Reset ${result.rows.length} withdrawals to pending:`, result.rows.map(w => w.id));

        return json({
          success: true,
          action: 'reset_to_pending',
          affected_count: result.rows.length,
          withdrawals: result.rows
        });

      } else if (action === 'cancel_and_refund') {
        // Отменить и вернуть деньги
        const result = await client.query(`
          UPDATE withdrawals 
          SET status = 'cancelled', 
              error_message = 'Cancelled from stuck processing state - funds refunded'
          WHERE status = 'processing' 
            AND completed_at IS NULL
            AND (
              $1::int[] IS NULL 
              OR id = ANY($1::int[])
            )
          RETURNING id, user_id, amount
        `, [withdrawal_ids || null]);

        // Вернуть средства пользователям
        for (const w of result.rows) {
          await client.query(
            'UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2',
            [w.amount, w.user_id]
          );
          console.log(`[STUCK] Refunded ${w.amount} TON to user ${w.user_id} for withdrawal ${w.id}`);
        }

        await client.query('COMMIT');

        return json({
          success: true,
          action: 'cancel_and_refund',
          affected_count: result.rows.length,
          withdrawals: result.rows
        });

      } else {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: 'Invalid action. Use "reset_to_pending" or "cancel_and_refund"' 
        }, { status: 400 });
      }

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Fix stuck withdrawals error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};
