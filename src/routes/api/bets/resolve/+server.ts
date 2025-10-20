import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Завершение ставки: устанавливает итоговые multiplier/payout/profit и возвращает итоговый баланс
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { bet_id, user_id, multiplier, payout, profit, is_win, ball_path } = body || {};

    if (!bet_id || !user_id) {
      return json({ error: 'Missing required fields: bet_id, user_id' }, { status: 400 });
    }

    const mult = Number(multiplier);
    const pay = Number(payout);
    let prof = Number(profit);
    const win = is_win != null ? Boolean(is_win) : mult > 1;
    const bpath = Array.isArray(ball_path) ? ball_path : [];

    if (!isFinite(mult) || mult <= 0) {
      return json({ error: 'Invalid multiplier' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Загружаем ставку и блокируем пользователя для согласованности
    const betRes = await client.query('SELECT * FROM game_bets WHERE id = $1 AND user_id = $2 FOR UPDATE', [bet_id, user_id]);
    if (betRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'Bet not found' }, { status: 404 });
    }
    const bet = betRes.rows[0];

    // Идемпотентность: если ставка уже завершена (multiplier не NULL), просто вернём текущие данные
    if (bet.multiplier !== null) {
      const updated = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1', [user_id]);
      await client.query('COMMIT');
      return json({
        success: true,
        bet,
        balance: {
          stars_balance: Number(updated.rows[0].stars_balance),
          ton_balance: Number(updated.rows[0].ton_balance),
        },
        idempotent: true,
      });
    }

    const betAmount = Number(bet.bet_amount);
    // Нормализуем значения
    const expectedProfit = betAmount * mult - betAmount;
    if (!isFinite(prof) || Math.abs(expectedProfit - prof) > 1e-6) {
      prof = expectedProfit;
    }
    const expectedPayout = betAmount * mult;
    const finalPayout = isFinite(pay) ? pay : expectedPayout;

    // Обновляем запись ставки
    const updBet = await client.query(
      `UPDATE game_bets
       SET multiplier = $1, payout = $2, profit = $3, is_win = $4, ball_path = $5
       WHERE id = $6
       RETURNING *`,
      [mult, finalPayout, prof, win, JSON.stringify(bpath), bet_id],
    );

    // Начисляем выплату (ставка уже была списана на этапе initiate)
    const balanceField = (bet.currency === 'TON') ? 'ton_balance' : 'stars_balance';
    await client.query(
      `UPDATE users SET ${balanceField} = ${balanceField} + $1, updated_at = NOW() WHERE id = $2`,
      [finalPayout, user_id],
    );

    const updated = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1', [user_id]);

    await client.query('COMMIT');

    return json({
      success: true,
      bet: updBet.rows[0],
      balance: {
        stars_balance: Number(updated.rows[0].stars_balance),
        ton_balance: Number(updated.rows[0].ton_balance),
      },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Bet resolve error:', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};
