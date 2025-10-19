import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Создание новой транзакции TON
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      user_id,
      transaction_hash,
      transaction_type,
      amount,
      from_address,
      to_address,
      fee = null
    } = body;

    // Валидация параметров
    if (!user_id || !transaction_hash || !transaction_type || !amount) {
      return json({ 
        error: 'Missing required fields: user_id, transaction_hash, transaction_type, amount' 
      }, { status: 400 });
    }

    if (!['DEPOSIT', 'WITHDRAWAL', 'BET', 'PAYOUT'].includes(transaction_type)) {
      return json({ 
        error: 'Invalid transaction_type. Must be DEPOSIT, WITHDRAWAL, BET, or PAYOUT' 
      }, { status: 400 });
    }

    const userId = parseInt(user_id);
    const amountNum = parseFloat(amount);
  const feeNum = fee !== null && fee !== undefined ? parseFloat(fee) : null;

    if (isNaN(userId) || isNaN(amountNum) || amountNum <= 0) {
      return json({ error: 'Invalid user_id or amount' }, { status: 400 });
    }

    if (feeNum !== null && (isNaN(feeNum) || feeNum < 0)) {
      return json({ error: 'Invalid fee amount' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Проверяем существование пользователя
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

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
      return json({ error: 'Transaction with this hash already exists' }, { status: 409 });
    }

    // Создаем транзакцию
    const txResult = await client.query(`
      INSERT INTO ton_transactions (
        user_id, transaction_hash, transaction_type, amount,
        from_address, to_address, fee, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *
    `, [userId, transaction_hash, transaction_type, amountNum, from_address, to_address, feeNum]);

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
        from_address: transaction.from_address,
        to_address: transaction.to_address,
        status: transaction.status,
        fee: transaction.fee ? parseFloat(transaction.fee) : null,
        created_at: transaction.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};

// Получение транзакций пользователя
export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('user_id');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

  if (!userId) {
    return json({ error: 'user_id parameter is required' }, { status: 400 });
  }

  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    return json({ error: 'Invalid user_id' }, { status: 400 });
  }

  const offset = (page - 1) * limit;
  const client = await pool.connect();
  
  try {
    // Строим WHERE условие
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userIdNum];
    let paramCounter = 2;

    if (status && ['PENDING', 'CONFIRMED', 'FAILED'].includes(status.toUpperCase())) {
      whereConditions.push(`status = $${paramCounter}`);
      queryParams.push(status.toUpperCase());
      paramCounter++;
    }

    if (type && ['DEPOSIT', 'WITHDRAWAL', 'BET', 'PAYOUT'].includes(type.toUpperCase())) {
      whereConditions.push(`transaction_type = $${paramCounter}`);
      queryParams.push(type.toUpperCase());
      paramCounter++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Запрос данных
    const dataQuery = `
      SELECT 
        id, transaction_hash, transaction_type, amount,
        from_address, to_address, status, fee,
        block_number, created_at, confirmed_at
      FROM ton_transactions 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);

    // Запрос общего количества
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ton_transactions 
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      client.query(dataQuery, queryParams),
      client.query(countQuery, queryParams.slice(0, -2))
    ]);

    const transactions = dataResult.rows.map(row => ({
      id: row.id,
      transaction_hash: row.transaction_hash,
      transaction_type: row.transaction_type,
      amount: parseFloat(row.amount),
      from_address: row.from_address,
      to_address: row.to_address,
      status: row.status,
      fee: row.fee ? parseFloat(row.fee) : null,
      block_number: row.block_number,
      created_at: row.created_at,
      confirmed_at: row.confirmed_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Transactions fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};

// Обновление статуса транзакции
export const PUT: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      transaction_hash,
      status,
      block_number = null,
      confirmed_at = null
    } = body;

    if (!transaction_hash || !status) {
      return json({ 
        error: 'Missing required fields: transaction_hash, status' 
      }, { status: 400 });
    }

    if (!['PENDING', 'CONFIRMED', 'FAILED'].includes(status)) {
      return json({ 
        error: 'Invalid status. Must be PENDING, CONFIRMED, or FAILED' 
      }, { status: 400 });
    }

    await client.query('BEGIN');

    // Обновляем транзакцию
    const updateQuery = `
      UPDATE ton_transactions 
      SET status = $1, 
          block_number = $2,
          confirmed_at = $3
      WHERE transaction_hash = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      status, 
      block_number,
      confirmed_at || (status === 'CONFIRMED' ? new Date() : null),
      transaction_hash
    ]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = result.rows[0];

    // Если это подтвержденный депозит, обновляем баланс пользователя
    if (status === 'CONFIRMED' && transaction.transaction_type === 'DEPOSIT') {
      await client.query(`
        UPDATE users 
        SET ton_balance = ton_balance + $1,
            updated_at = NOW()
        WHERE id = $2
      `, [parseFloat(transaction.amount), transaction.user_id]);
    }

    await client.query('COMMIT');

    return json({
      success: true,
      transaction: {
        id: transaction.id,
        transaction_hash: transaction.transaction_hash,
        status: transaction.status,
        block_number: transaction.block_number,
        confirmed_at: transaction.confirmed_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction update error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};