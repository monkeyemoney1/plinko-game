import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

/**
 * POST /api/bets/complete
 * Завершает ставку: обновляет результаты и начисляет выигрыш.
 */
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      bet_id,
      multiplier,
      payout,
      profit,
      is_win,
      ball_path
    } = body;

    // Валидация
    if (!bet_id || multiplier == null || payout == null || profit == null) {
      return json({ 
        error: 'Missing required fields: bet_id, multiplier, payout, profit' 
      }, { status: 400 });
    }

    await client.query('BEGIN');

    // Получаем информацию о ставке
    const betResult = await client.query(
      'SELECT user_id, bet_amount, currency, status FROM game_bets WHERE id = $1 FOR UPDATE',
      [bet_id]
    );

    if (betResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'Bet not found' }, { status: 404 });
    }

    const bet = betResult.rows[0];

    if (bet.status !== 'pending') {
      await client.query('ROLLBACK');
      return json({ error: 'Bet already completed' }, { status: 400 });
    }

    // Обновляем ставку с результатами
    await client.query(`
      UPDATE game_bets 
      SET multiplier = $1,
          payout = $2,
          profit = $3,
          is_win = $4,
          ball_path = $5,
          status = 'completed',
          updated_at = NOW()
      WHERE id = $6
    `, [multiplier, payout, profit, is_win ?? (multiplier > 1), JSON.stringify(ball_path ?? []), bet_id]);

    // Начисляем ВЫИГРЫШ (не profit, а payout, т.к. ставка уже списана)
    const balanceField = bet.currency === 'STARS' ? 'stars_balance' : 'ton_balance';
    
    await client.query(`
      UPDATE users 
      SET ${balanceField} = ${balanceField} + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [payout, bet.user_id]);

    // Получаем обновленный баланс
    const updatedUserResult = await client.query(
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
      [bet.user_id]
    );
    const updatedBalance = updatedUserResult.rows[0];

    await client.query('COMMIT');

    return json({
      success: true,
      balance: {
        stars_balance: parseFloat(updatedBalance.stars_balance),
        ton_balance: parseFloat(updatedBalance.ton_balance)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bet completion error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};
