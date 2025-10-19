import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { deposit_id, force_confirm, mock_tx_hash } = await request.json();
    console.log('Mock verifying deposit ID:', deposit_id);

    if (!deposit_id || !force_confirm) {
      return json({ error: 'Missing required fields for mock verification' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      // Получаем информацию о депозите
      const depositResult = await client.query(
        'SELECT * FROM deposits WHERE id = $1 AND status = $2',
        [deposit_id, 'pending']
      );

      if (depositResult.rows.length === 0) {
        console.log('Deposit not found or already processed:', deposit_id);
        return json({ error: 'Deposit not found or already processed' }, { status: 404 });
      }

      const deposit = depositResult.rows[0];
      console.log('Found deposit for mock verification:', {
        id: deposit.id,
        wallet_address: deposit.wallet_address,
        amount: deposit.amount,
        created_at: deposit.created_at
      });

      // Принудительно подтверждаем депозит без проверки блокчейна
      await client.query('BEGIN');

      // Обновляем статус депозита
      await client.query(
        'UPDATE deposits SET status = $1, transaction_hash = $2, confirmed_at = NOW() WHERE id = $3',
        ['confirmed', mock_tx_hash, deposit.id]
      );

      // Обновляем баланс пользователя
      await client.query(
        'UPDATE users SET ton_balance = ton_balance + $1, updated_at = NOW() WHERE id = $2',
        [deposit.amount, deposit.user_id]
      );

      await client.query('COMMIT');
      console.log('Mock deposit confirmed, balance updated for user:', deposit.user_id);

      // Получаем обновленный баланс
      const userResult = await client.query(
        'SELECT ton_balance, stars_balance FROM users WHERE id = $1',
        [deposit.user_id]
      );

      const user = userResult.rows[0];

      return json({
        success: true,
        confirmed: true,
        mock: true,
        transaction_hash: mock_tx_hash,
        balance: {
          ton: Number(user.ton_balance),
          stars: Number(user.stars_balance)
        },
        message: 'Deposit confirmed via mock verification (for testing)'
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Mock deposit verification error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};