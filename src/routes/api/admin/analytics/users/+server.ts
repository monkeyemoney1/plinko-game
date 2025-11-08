import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
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
    // Сначала обеспечиваем существование таблицы user_wallets
    await ensureUserWalletsTableExists();
    
    // Получаем пользователей с расширенной аналитикой
    const query = `
      SELECT 
        u.*,
        u.ton_address as wallet_address,
        COALESCE(wallet_stats.wallet_count, 0) as wallet_count,
        COALESCE(stars_stats.transaction_count, 0) as star_transactions_count,
        COALESCE(stars_stats.total_spent, 0) as total_stars_spent,
        COALESCE(stars_stats.total_received, 0) as total_stars_received,
        u.updated_at as last_activity,
        COALESCE(u.ton_balance, 0) as ton_balance
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as wallet_count
        FROM user_wallets 
        GROUP BY user_id
      ) wallet_stats ON u.id = wallet_stats.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_spent,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received
        FROM star_transactions 
        GROUP BY user_id
      ) stars_stats ON u.id = stars_stats.user_id
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query);
    
    return json(result.rows);
  } catch (error) {
    console.error('Ошибка получения аналитики пользователей:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};