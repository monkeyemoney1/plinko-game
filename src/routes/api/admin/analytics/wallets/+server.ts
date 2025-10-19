import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * Обеспечивает существование таблицы user_wallets
 */
async function ensureUserWalletsTableExists(): Promise<void> {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          wallet_address VARCHAR(200) NOT NULL,
          is_connected BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wallets_unique ON user_wallets(user_id, wallet_address);
    `;
    
    await db.query(createTableSQL);
  } catch (error) {
    console.error('Ошибка создания таблицы user_wallets:', error);
  }
}

export const GET: RequestHandler = async () => {
  try {
    // Сначала обеспечиваем существование таблицы
    await ensureUserWalletsTableExists();
    
    // Получаем информацию о регистрациях кошельков с данными пользователей
    const query = `
      SELECT 
        uw.id,
        uw.user_id,
        COALESCE(u.wallet_address, 'N/A') as username,
        u.telegram_id,
        uw.wallet_address,
        uw.is_connected,
        uw.created_at as registration_date
      FROM user_wallets uw
      JOIN users u ON uw.user_id = u.id
      ORDER BY uw.created_at DESC
    `;
    
    const result = await db.query(query);
    
    return json(result.rows);
  } catch (error) {
    console.error('Ошибка получения аналитики кошельков:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};