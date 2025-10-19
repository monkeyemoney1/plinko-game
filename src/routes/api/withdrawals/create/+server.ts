import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, amount, wallet_address } = await request.json();

    // Валидация входных данных
    if (!user_id || !amount || !wallet_address) {
      return json({ 
        success: false, 
        error: 'Missing required fields: user_id, amount, wallet_address' 
      }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) {
      return json({ 
        success: false, 
        error: 'Amount must be greater than 0' 
      }, { status: 400 });
    }

    // Минимальная сумма вывода
    const MIN_WITHDRAWAL = 0.1; // 0.1 TON
    if (withdrawAmount < MIN_WITHDRAWAL) {
      return json({ 
        success: false, 
        error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL} TON` 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Проверяем баланс пользователя
      const userResult = await client.query(
        'SELECT ton_balance FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      const currentBalance = parseFloat(userResult.rows[0].ton_balance);
      
      if (currentBalance < withdrawAmount) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: `Insufficient balance. Current balance: ${currentBalance} TON, requested: ${withdrawAmount} TON` 
        }, { status: 400 });
      }

      // Создаем запись о выводе со статусом "pending"
      const withdrawalResult = await client.query(
        `INSERT INTO withdrawals (user_id, amount, wallet_address, status, created_at) 
         VALUES ($1, $2, $3, 'pending', NOW()) 
         RETURNING id, created_at`,
        [user_id, withdrawAmount, wallet_address]
      );

      const withdrawalId = withdrawalResult.rows[0].id;

      // Резервируем средства (уменьшаем баланс)
      await client.query(
        'UPDATE users SET ton_balance = ton_balance - $1 WHERE id = $2',
        [withdrawAmount, user_id]
      );

      await client.query('COMMIT');

      console.log(`Withdrawal request created: ID ${withdrawalId}, User ${user_id}, Amount ${withdrawAmount} TON`);

      return json({
        success: true,
        withdrawal: {
          id: withdrawalId,
          user_id,
          amount: withdrawAmount,
          wallet_address,
          status: 'pending',
          created_at: withdrawalResult.rows[0].created_at
        },
        message: 'Withdrawal request created successfully. Processing...'
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create withdrawal error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};