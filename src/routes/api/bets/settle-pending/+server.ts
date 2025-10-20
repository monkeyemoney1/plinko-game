import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { binPayouts } from '$lib/constants/game';

function simulatePlinko(riskLevel: string, rowsCount: number): { multiplier: number; ballPath: number[] } {
  const payouts = (binPayouts as any)[rowsCount]?.[riskLevel];
  if (!payouts) throw new Error('Unsupported rows_count for server simulation');
  const ballPath: number[] = [];
  let position = 0;
  for (let row = 0; row < rowsCount; row++) {
    const stepRight = Math.random() < 0.5 ? 1 : 0;
    position = Math.max(0, Math.min(row + 1, position + (stepRight ? 1 : -1)));
    ballPath.push(position);
  }
  const finalIndex = Math.min(ballPath[ballPath.length - 1], payouts.length - 1);
  return { multiplier: payouts[finalIndex], ballPath };
}

export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const { user_id } = body as { user_id?: number };
    if (!user_id) return json({ error: 'user_id is required' }, { status: 400 });

    await client.query('BEGIN');

    // Блокируем пользователя на время массового досчёта
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user_id]);

    // Выбираем все незавершённые ставки
    const betsRes = await client.query(
      `SELECT id, bet_amount, currency, risk_level, rows_count
       FROM game_bets
       WHERE user_id = $1 AND multiplier IS NULL
       ORDER BY id ASC
      `,
      [user_id],
    );

    let starsProfitSum = 0;
    let tonProfitSum = 0;
    let settled = 0;

    for (const bet of betsRes.rows) {
      const betAmount = Number(bet.bet_amount);
      const rowsCount = Number(bet.rows_count);
      try {
        const sim = simulatePlinko(bet.risk_level, rowsCount);
        const multiplier = sim.multiplier;
        const payout = betAmount * multiplier;
        const profit = payout - betAmount;
        const isWin = multiplier > 1;

        await client.query(
          `UPDATE game_bets
             SET multiplier = $1, payout = $2, profit = $3, is_win = $4, ball_path = $5
           WHERE id = $6`,
          [multiplier, payout, profit, isWin, JSON.stringify(sim.ballPath), bet.id],
        );

        if (bet.currency === 'TON') tonProfitSum += profit; else starsProfitSum += profit;
        settled += 1;
      } catch (e) {
        // Если не поддерживаем rows_count — пропускаем ставку (оставим pending)
      }
    }

    if (starsProfitSum !== 0) {
      await client.query(
        'UPDATE users SET stars_balance = stars_balance + $1, updated_at = NOW() WHERE id = $2',
        [starsProfitSum, user_id],
      );
    }
    if (tonProfitSum !== 0) {
      await client.query(
        'UPDATE users SET ton_balance = ton_balance + $1, updated_at = NOW() WHERE id = $2',
        [tonProfitSum, user_id],
      );
    }    const updated = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1', [user_id]);
    await client.query('COMMIT');

    return json({
      success: true,
      settled,
      balance: {
        stars_balance: Number(updated.rows[0].stars_balance),
        ton_balance: Number(updated.rows[0].ton_balance),
      },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Settle pending bets error:', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};
