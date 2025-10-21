import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/db';
import { env as privateEnv } from '$env/dynamic/private';
import { sendAdminMessage } from '$lib/telegram/botAPI';

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

    // Комиссия на вывод и минимальная сумма
    const WITHDRAWAL_FEE_TON = 0.1; // фиксированная комиссия 0.1 TON
    // Требуем, чтобы пользователь выводил сумму строго больше комиссии, иначе на руки придет 0 или меньше
    if (withdrawAmount <= WITHDRAWAL_FEE_TON) {
      return json({ 
        success: false, 
        error: `Minimum withdrawal amount is > ${WITHDRAWAL_FEE_TON} TON (fee ${WITHDRAWAL_FEE_TON} TON)` 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Hidden daily limit per user
      const DAILY_LIMIT = parseFloat(privateEnv.WITHDRAWAL_DAILY_LIMIT_TON || '5');
      const dailySumRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM withdrawals
         WHERE user_id = $1
           AND created_at >= NOW() - INTERVAL '1 day'
           AND status IN ('pending','processing','completed')`,
        [user_id]
      );
      const spentToday = parseFloat(dailySumRes.rows[0].total);
      if (spentToday + withdrawAmount > DAILY_LIMIT) {
        // Notify admin silently
        sendAdminMessage(
          `🚫 Попытка превышения лимита вывода\nUser: ${user_id}\nRequested: ${withdrawAmount} TON\nSpent today: ${spentToday} TON\nLimit: ${DAILY_LIMIT} TON\nAddress: ${wallet_address}`
        ).catch(() => {});
        await client.query('ROLLBACK');
        return json({
          success: false,
          error: 'Withdrawal temporarily unavailable. Please try again later.'
        }, { status: 429 });
      }

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
      // Notify admin about new withdrawal request
      const fee = WITHDRAWAL_FEE_TON;
      const net = Math.max(withdrawAmount - fee, 0);
      sendAdminMessage(
        `🆕 Новый запрос на вывод\nID: ${withdrawalId}\nUser: ${user_id}\nAmount: ${withdrawAmount} TON\nFee: ${fee} TON\nNet: ${net} TON\nTo: ${wallet_address}`
      ).catch(() => {});

      return json({
        success: true,
        withdrawal: {
          id: withdrawalId,
          user_id,
          amount: withdrawAmount,
          fee: WITHDRAWAL_FEE_TON,
          net_amount: Math.max(withdrawAmount - WITHDRAWAL_FEE_TON, 0),
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