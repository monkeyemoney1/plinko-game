import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Инициализация ставки: списывает ставку с баланса и создаёт запись в game_bets с pending-результатом
export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { user_id, bet_amount, currency = 'STARS', risk_level, rows_count } = body || {};

    // Валидация
    if (!user_id || !bet_amount || !risk_level || !rows_count) {
      return json({ error: 'Missing required fields: user_id, bet_amount, risk_level, rows_count' }, { status: 400 });
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
    const betAmount = Number(bet_amount);
    if (!isFinite(betAmount) || betAmount <= 0) {
      return json({ error: 'Invalid bet_amount' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Блокируем пользователя и проверяем баланс
    const ures = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1 FOR UPDATE', [user_id]);
    if (ures.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }
    const user = ures.rows[0];
    const currentBalance = currency === 'STARS' ? Number(user.stars_balance) : Number(user.ton_balance);
    if (currentBalance < betAmount) {
      await client.query('ROLLBACK');
      return json({ error: 'Insufficient balance', current_balance: currentBalance, required: betAmount }, { status: 400 });
    }

    // Списываем ставку
    const balanceField = currency === 'STARS' ? 'stars_balance' : 'ton_balance';
    await client.query(`UPDATE users SET ${balanceField} = ${balanceField} - $1, updated_at = NOW() WHERE id = $2`, [betAmount, user_id]);

    // Создаём запись ставки с "ожидающим" результатом (multiplier = NULL)
    const betRes = await client.query(
      `INSERT INTO game_bets (user_id, bet_amount, currency, risk_level, rows_count, multiplier, payout, profit, is_win, ball_path)
       VALUES ($1, $2, $3, $4, $5, NULL, 0, 0, false, $6)
       RETURNING id, user_id, bet_amount, currency, risk_level, rows_count, created_at`,
      [user_id, betAmount, currency, risk_level, rows_count, JSON.stringify([])],
    );

    // Возвращаем обновлённый баланс
    const updated = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1', [user_id]);
    await client.query('COMMIT');

    return json({
      success: true,
      bet: betRes.rows[0],
      balance: {
        stars_balance: Number(updated.rows[0].stars_balance),
        ton_balance: Number(updated.rows[0].ton_balance),
      },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Bet initiate error:', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};
