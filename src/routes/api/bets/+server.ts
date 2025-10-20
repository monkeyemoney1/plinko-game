import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Симуляция игры Plinko
function simulatePlinko(riskLevel: string, rowsCount: number): { multiplier: number; ballPath: number[] } {
  const ballPath: number[] = [];
  let position = 0;
  
  // Симулируем движение шарика
  for (let row = 0; row < rowsCount; row++) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    position = Math.max(0, Math.min(row + 1, position + direction));
    ballPath.push(position);
  }
  
  // Таблица множителей в зависимости от риска и количества рядов
  const multiplierTables: Record<string, Record<number, number[]>> = {
    LOW: {
      8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
      16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
    },
    MEDIUM: {
      8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      12: [24, 5, 1.8, 1.3, 0.9, 0.7, 0.4, 0.7, 0.9, 1.3, 1.8, 5, 24],
      16: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.2, 0.2, 0.2, 0.3, 0.6, 1.1, 2, 4, 11, 33]
    },
    HIGH: {
      8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
      12: [58, 9, 2, 1.2, 0.6, 0.4, 0.2, 0.4, 0.6, 1.2, 2, 9, 58],
      16: [110, 41, 10, 5, 1.9, 0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 1.9, 5, 10, 41, 110]
    }
  };
  
  const table = multiplierTables[riskLevel]?.[rowsCount];
  if (!table) {
    throw new Error('Invalid risk level or rows count');
  }
  
  const finalPosition = Math.min(ballPath[ballPath.length - 1], table.length - 1);
  const multiplier = table[finalPosition];
  
  return { multiplier, ballPath };
}

export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      user_id, 
      bet_amount, 
      currency = 'STARS', 
      risk_level, 
      rows_count,
      client_result
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
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
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

    // Если клиент прислал результат — используем его, иначе симулируем только для 8/12/16
    let multiplier: number;
    let payout: number;
    let profit: number;
    let isWin: boolean;
    let ballPath: number[] | null = null;

    if (client_result && typeof client_result === 'object') {
      multiplier = Number(client_result.multiplier);
      payout = Number(client_result.payout);
      profit = Number(client_result.profit);
      if (!isFinite(multiplier) || !isFinite(payout) || !isFinite(profit)) {
        await client.query('ROLLBACK');
        return json({ error: 'Invalid client_result numbers' }, { status: 400 });
      }
      // Допускаем небольшую погрешность вычислений
      const expectedProfit = betAmount * multiplier - betAmount;
      if (Math.abs(expectedProfit - profit) > 1e-6) {
        // Нормализуем на сервере
        profit = expectedProfit;
        payout = betAmount * multiplier;
      }
      isWin = client_result.is_win != null ? Boolean(client_result.is_win) : multiplier > 1;
      if (Array.isArray(client_result.ball_path)) ballPath = client_result.ball_path;
    } else {
      // Фоллбек-симуляция только для таблиц, что у нас есть
      if (![8, 12, 16].includes(rows_count)) {
        await client.query('ROLLBACK');
        return json({ error: 'Server cannot simulate this rows_count. Provide client_result.' }, { status: 400 });
      }
      const sim = simulatePlinko(risk_level, rows_count);
      multiplier = sim.multiplier;
      ballPath = sim.ballPath;
      payout = betAmount * multiplier;
      profit = payout - betAmount;
      isWin = multiplier > 1;
    }

    // Создаем запись ставки
    const betResult = await client.query(`
      INSERT INTO game_bets (
        user_id, bet_amount, currency, risk_level, rows_count, 
        multiplier, payout, profit, is_win, ball_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      user_id, betAmount, currency, risk_level, rows_count,
      multiplier, payout, profit, isWin, JSON.stringify(ballPath ?? [])
    ]);

    // Обновляем баланс пользователя
    const balanceChange = profit; // profit уже учитывает потерю ставки
    const balanceField = currency === 'STARS' ? 'stars_balance' : 'ton_balance';
    
    await client.query(`
      UPDATE users 
      SET ${balanceField} = ${balanceField} + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [balanceChange, user_id]);

    // Получаем обновленный баланс
    const updatedUserResult = await client.query(
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
      [user_id]
    );
    const updatedBalance = updatedUserResult.rows[0];

    await client.query('COMMIT');

    return json({
      success: true,
      bet: betResult.rows[0],
      result: {
        multiplier,
        payout,
        profit,
        isWin,
        ballPath
      },
      balance: {
        stars_balance: parseFloat(updatedBalance.stars_balance),
        ton_balance: parseFloat(updatedBalance.ton_balance)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bet creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};