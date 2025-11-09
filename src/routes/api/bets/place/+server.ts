import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

/**
 * POST /api/bets/place
 * Создает новую ставку и СРАЗУ списывает баланс.
 * Возвращает bet_id для последующего завершения.
 */
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      user_id, 
      bet_amount, 
      currency = 'STARS', 
      risk_level, 
      rows_count
    } = body;

    // Валидация параметров
    if (!user_id || !bet_amount || !risk_level || !rows_count) {
      return json({ 
        error: 'Missing required fields: user_id, bet_amount, risk_level, rows_count' 
      }, { status: 400 });
    }

    if (!['LOW', 'MEDIUM', 'HIGH'].includes(risk_level)) {
      return json({ error: 'Invalid risk_level. Must be LOW, MEDIUM, or HIGH' }, { status: 400 });
    }

    if (!Number.isInteger(rows_count) || rows_count < 8 || rows_count > 16) {
      return json({ error: 'Invalid rows_count. Must be integer between 8 and 16' }, { status: 400 });
    }

    if (!['STARS', 'TON'].includes(currency)) {
      return json({ error: 'Invalid currency. Must be STARS or TON' }, { status: 400 });
    }

    const betAmount = parseFloat(bet_amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      return json({ error: 'Invalid bet_amount' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Проверяем баланс пользователя
    const userResult = await client.query(
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1 FOR UPDATE',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const currentBalance = currency === 'STARS' ? 
      parseFloat(user.stars_balance) : parseFloat(user.ton_balance);

    if (currentBalance < betAmount) {
      await client.query('ROLLBACK');
      return json({ 
        error: 'Insufficient balance', 
        current_balance: currentBalance,
        required: betAmount 
      }, { status: 400 });
    }

    // Создаем запись ставки со статусом 'pending'
    const betResult = await client.query(`
      INSERT INTO game_bets (
        user_id, bet_amount, currency, risk_level, rows_count, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [user_id, betAmount, currency, risk_level, rows_count]);

    const betId = betResult.rows[0].id;

    // СПИСЫВАЕМ ставку с баланса
    const balanceField = currency === 'STARS' ? 'stars_balance' : 'ton_balance';
    
    await client.query(`
      UPDATE users 
      SET ${balanceField} = ${balanceField} - $1,
          updated_at = NOW()
      WHERE id = $2
    `, [betAmount, user_id]);

    // Получаем обновленный баланс
    const updatedUserResult = await client.query(
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
      [user_id]
    );
    const updatedBalance = updatedUserResult.rows[0];

    await client.query('COMMIT');

    return json({
      success: true,
      bet_id: betId,
      balance: {
        stars_balance: parseFloat(updatedBalance.stars_balance),
        ton_balance: parseFloat(updatedBalance.ton_balance)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bet placement error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};
