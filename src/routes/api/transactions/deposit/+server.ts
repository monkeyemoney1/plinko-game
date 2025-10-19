import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Создание депозита
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { user_id, amount, transaction_hash } = body;

    // Валидация
    if (!user_id || !amount || !transaction_hash) {
      return json({ error: 'Missing required fields: user_id, amount, transaction_hash' }, { status: 400 });
    }

    const userId = parseInt(user_id);
    const amountNum = parseFloat(amount);

    if (isNaN(userId) || isNaN(amountNum) || amountNum <= 0) {
      return json({ error: 'Invalid user_id or amount' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Проверяем существование пользователя
    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем уникальность хеша транзакции
    const existingTx = await client.query(
      'SELECT id FROM ton_transactions WHERE transaction_hash = $1',
      [transaction_hash]
    );

    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      return json({ error: 'Transaction already exists' }, { status: 409 });
    }

    // Создаем транзакцию депозита
    const txResult = await client.query(`
      INSERT INTO ton_transactions (
        user_id, transaction_hash, transaction_type, amount, status
      ) VALUES ($1, $2, 'DEPOSIT', $3, 'PENDING')
      RETURNING *
    `, [userId, transaction_hash, amountNum]);

    await client.query('COMMIT');

    const transaction = txResult.rows[0];
    return json({
      success: true,
      transaction: {
        id: transaction.id,
        user_id: transaction.user_id,
        transaction_hash: transaction.transaction_hash,
        transaction_type: transaction.transaction_type,
        amount: parseFloat(transaction.amount),
        status: transaction.status,
        created_at: transaction.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deposit creation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};