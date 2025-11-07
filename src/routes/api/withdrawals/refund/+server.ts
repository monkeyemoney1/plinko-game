import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * Админский эндпоинт для отмены вывода и возврата средств на игровой баланс.
 * Поддерживаются статусы: pending, processing, manual_review.
 * Для already completed возврат НЕ выполняется (нужна иная операция, так как on-chain уже ушёл TON).
 *
 * Безопасность: требуется заголовок X-Admin-Password, совпадающий с ADMIN_PASSWORD в env.
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const adminPassword = request.headers.get('x-admin-password') || request.headers.get('X-Admin-Password');
    if (!privateEnv.ADMIN_PASSWORD || adminPassword !== privateEnv.ADMIN_PASSWORD) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const withdrawal_id = Number(body.withdrawal_id);
    const reason = (body.reason ?? 'cancelled by admin').toString().slice(0, 500);
    if (!withdrawal_id || Number.isNaN(withdrawal_id)) {
      return json({ success: false, error: 'withdrawal_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [withdrawal_id]);
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ success: false, error: 'Withdrawal not found' }, { status: 404 });
      }

      const w = res.rows[0];
      const cancellable = ['pending', 'processing', 'manual_review'];
      if (!cancellable.includes(w.status)) {
        await client.query('ROLLBACK');
        return json({ success: false, error: `Withdrawal status '${w.status}' is not cancellable` }, { status: 400 });
      }

      // Возвращаем зарезервированные средства на игровой баланс
      await client.query('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2', [w.amount, w.user_id]);

      await client.query(
        `UPDATE withdrawals 
           SET status = 'cancelled', 
               error_message = COALESCE(error_message,'') || CASE WHEN error_message IS NULL OR error_message = '' THEN '' ELSE '\n' END || $1,
               admin_notes = COALESCE(admin_notes,'') || CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE '\n' END || $2,
               completed_at = NOW()
         WHERE id = $3`,
        [
          `[refund] cancelled by admin: ${reason}`,
          `[refund] reason: ${reason}`,
          withdrawal_id
        ]
      );

      await client.query('COMMIT');
      return json({ success: true, message: 'Withdrawal cancelled and funds returned to game balance.' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Refund endpoint error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};
