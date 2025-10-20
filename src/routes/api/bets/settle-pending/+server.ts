import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

function simulatePlinko(riskLevel: string, rowsCount: number): { multiplier: number; ballPath: number[] } {
  const ballPath: number[] = [];
  let position = 0;
  for (let row = 0; row < rowsCount; row++) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    position = Math.max(0, Math.min(row + 1, position + direction));
    ballPath.push(position);
  }
  const multiplierTables: Record<string, Record<number, number[]>> = {
    LOW: {
      8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
      16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    },
    MEDIUM: {
      8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      12: [24, 5, 1.8, 1.3, 0.9, 0.7, 0.4, 0.7, 0.9, 1.3, 1.8, 5, 24],
      16: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.2, 0.2, 0.2, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    },
    HIGH: {
      8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
      12: [58, 9, 2, 1.2, 0.6, 0.4, 0.2, 0.4, 0.6, 1.2, 2, 9, 58],
      16: [110, 41, 10, 5, 1.9, 0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 1.9, 5, 10, 41, 110],
    },
  };
  const table = multiplierTables[riskLevel]?.[rowsCount];
  if (!table) {
    throw new Error('Unsupported rows_count for server simulation');
  }
  const finalPosition = Math.min(ballPath[ballPath.length - 1], table.length - 1);
  const multiplier = table[finalPosition];
  return { multiplier, ballPath };
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

    let starsProfit = 0;
    let tonProfit = 0;
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

        if (bet.currency === 'TON') tonProfit += profit; else starsProfit += profit;
        settled += 1;
      } catch (e) {
        // Если не поддерживаем rows_count — пропускаем ставку (оставим pending)
      }
    }

    if (starsProfit !== 0) {
      await client.query(
        'UPDATE users SET stars_balance = stars_balance + $1, updated_at = NOW() WHERE id = $2',
        [starsProfit, user_id],
      );
    }
    if (tonProfit !== 0) {
      await client.query(
        'UPDATE users SET ton_balance = ton_balance + $1, updated_at = NOW() WHERE id = $2',
        [tonProfit, user_id],
      );
    }

    const updated = await client.query('SELECT stars_balance, ton_balance FROM users WHERE id = $1', [user_id]);
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
