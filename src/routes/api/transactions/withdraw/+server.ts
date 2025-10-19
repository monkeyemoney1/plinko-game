import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Создание запроса на вывод
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { user_id, amount, to_address } = body;

    // Валидация
    if (!user_id || !amount || !to_address) {
      return json({ error: 'Missing required fields: user_id, amount, to_address' }, { status: 400 });
    }

    const userId = parseInt(user_id);
    const amountNum = parseFloat(amount);

    if (isNaN(userId) || isNaN(amountNum) || amountNum <= 0) {
      return json({ error: 'Invalid user_id or amount' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Проверяем баланс пользователя
    const userResult = await client.query(
      'SELECT id, ton_balance FROM users WHERE id = $1 FOR UPDATE', 
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.ton_balance);

    if (currentBalance < amountNum) {
      await client.query('ROLLBACK');
      return json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Создаем транзакцию вывода
    const txResult = await client.query(`
      INSERT INTO ton_transactions (
        user_id, transaction_type, amount, to_address, status
      ) VALUES ($1, 'WITHDRAWAL', $2, $3, 'PENDING')
      RETURNING *
    `, [userId, amountNum, to_address]);

    // Резервируем средства (уменьшаем баланс)
    await client.query(
      'UPDATE users SET ton_balance = ton_balance - $1, updated_at = NOW() WHERE id = $2',
      [amountNum, userId]
    );

    await client.query('COMMIT');

    const transaction = txResult.rows[0];
    return json({
      success: true,
      transaction: {
        id: transaction.id,
        user_id: transaction.user_id,
        transaction_type: transaction.transaction_type,
        amount: parseFloat(transaction.amount),
        to_address: transaction.to_address,
        status: transaction.status,
        created_at: transaction.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdrawal creation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};