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
    const { user_id, bet_amount, currency, risk_level, rows_count, ball_id, status } = await request.json();

    if (!user_id || !bet_amount || !currency) {
      return json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    // Обеспечиваем существование таблицы
    await ensureBetsTableExists();
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Проверяем баланс пользователя
      const userResult = await client.query(
        'SELECT id, stars_balance, ton_balance FROM users WHERE id = $1 FOR UPDATE',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ error: 'Пользователь не найден' }, { status: 404 });
      }

      const user = userResult.rows[0];
      const currentBalance = currency === 'STARS' ? Number(user.stars_balance) : Number(user.ton_balance);

      if (currentBalance < bet_amount) {
        await client.query('ROLLBACK');
        return json({ error: 'Недостаточно средств' }, { status: 400 });
      }

      // Списываем ставку
      const newBalance = currentBalance - bet_amount;
      const balanceField = currency === 'STARS' ? 'stars_balance' : 'ton_balance';

      const updateQuery = `
        UPDATE users 
        SET ${balanceField} = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, stars_balance, ton_balance
      `;
      
      const updateResult = await client.query(updateQuery, [newBalance, user_id]);

      // Создаем запись о ставке (пока без результата)
      await client.query(`
        INSERT INTO bets (
          user_id, bet_amount, currency, risk_level, rows_count, 
          ball_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [user_id, bet_amount, currency, risk_level, rows_count, ball_id, status || 'in_progress']);

      await client.query('COMMIT');

      const updatedUser = updateResult.rows[0];

      return json({
        success: true,
        balance: {
          stars_balance: Number(updatedUser.stars_balance),
          ton_balance: Number(updatedUser.ton_balance)
        },
        message: 'Ставка размещена успешно'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Ошибка размещения ставки:', error);
    return json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
};