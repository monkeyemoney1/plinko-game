import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

/**
 * Обеспечивает существование таблицы bets
 */
async function ensureBetsTableExists(): Promise<void> {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS bets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          bet_amount NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'STARS',
          risk_level VARCHAR(10) NOT NULL,
          rows_count INTEGER NOT NULL,
          ball_id BIGINT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
          
          -- Результаты игры (заполняются после завершения)
          bin_index INTEGER,
          multiplier NUMERIC(10, 4),
          payout NUMERIC(10, 2),
          profit NUMERIC(10, 2),
          is_win BOOLEAN,
          
          -- Временные метки
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
      );

      -- Создаем индексы для оптимизации запросов
      CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
      CREATE INDEX IF NOT EXISTS idx_bets_ball_id ON bets(ball_id);
      CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
      CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_unique_ball ON bets(ball_id, user_id);
    `;
    
    await db.query(createTableSQL);
  } catch (error) {
    console.error('Ошибка создания таблицы bets:', error);
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, ball_id, result } = await request.json();

    if (!user_id || !ball_id || !result) {
      return json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    const { bin_index, multiplier, payout, profit, is_win } = result;

    // Обеспечиваем существование таблицы
    await ensureBetsTableExists();
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Находим ставку по ball_id
      const betResult = await client.query(
        'SELECT id, bet_amount, currency FROM bets WHERE ball_id = $1 AND user_id = $2 AND status = $3',
        [ball_id, user_id, 'in_progress']
      );

      if (betResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ error: 'Ставка не найдена или уже завершена' }, { status: 404 });
      }

      const bet = betResult.rows[0];

      // Обновляем ставку с результатом
      await client.query(`
        UPDATE bets 
        SET 
          status = 'completed',
          bin_index = $1,
          multiplier = $2,
          payout = $3,
          profit = $4,
          is_win = $5,
          completed_at = NOW()
        WHERE id = $6
      `, [bin_index, multiplier, payout, profit, is_win, bet.id]);

      // Начисляем выигрыш, если есть
      if (payout > 0) {
        const balanceField = bet.currency === 'STARS' ? 'stars_balance' : 'ton_balance';
        
        const updateQuery = `
          UPDATE users 
          SET ${balanceField} = ${balanceField} + $1, updated_at = NOW() 
          WHERE id = $2 
          RETURNING id, stars_balance, ton_balance
        `;
        
        const updateResult = await client.query(updateQuery, [payout, user_id]);
        
        await client.query('COMMIT');

        const updatedUser = updateResult.rows[0];

        return json({
          success: true,
          balance: {
            stars_balance: Number(updatedUser.stars_balance),
            ton_balance: Number(updatedUser.ton_balance)
          },
          result: {
            bet_id: bet.id,
            payout,
            profit,
            is_win
          },
          message: 'Ставка завершена успешно'
        });
      } else {
        await client.query('COMMIT');

        // Получаем текущий баланс
        const userResult = await client.query(
          'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
          [user_id]
        );

        const user = userResult.rows[0];

        return json({
          success: true,
          balance: {
            stars_balance: Number(user.stars_balance),
            ton_balance: Number(user.ton_balance)
          },
          result: {
            bet_id: bet.id,
            payout: 0,
            profit,
            is_win: false
          },
          message: 'Ставка завершена (проигрыш)'
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Ошибка завершения ставки:', error);
    return json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
};