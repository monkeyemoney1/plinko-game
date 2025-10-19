import { db } from '$lib/db';

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
    console.log('✅ Таблица user_wallets проверена/создана');
  } catch (error) {
    console.error('⚠️ Ошибка создания таблицы user_wallets:', error);
  }
}

/**
 * Отслеживает подключение кошелька пользователем
 */
export async function trackWalletConnection(userId: number, walletAddress: string): Promise<void> {
  try {
    // Сначала проверяем и создаем таблицу если нужно
    await ensureUserWalletsTableExists();
    
    // Проверяем, есть ли уже запись об этом кошельке для пользователя
    const existingQuery = `
      SELECT id FROM user_wallets 
      WHERE user_id = $1 AND wallet_address = $2
    `;
    const existingResult = await db.query(existingQuery, [userId, walletAddress]);
    
    if (existingResult.rows.length === 0) {
      // Добавляем новую запись
      const insertQuery = `
        INSERT INTO user_wallets (user_id, wallet_address, is_connected)
        VALUES ($1, $2, true)
      `;
      await db.query(insertQuery, [userId, walletAddress]);
      console.log(`Отслежено подключение кошелька ${walletAddress} для пользователя ${userId}`);
    } else {
      // Обновляем статус подключения
      const updateQuery = `
        UPDATE user_wallets 
        SET is_connected = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND wallet_address = $2
      `;
      await db.query(updateQuery, [userId, walletAddress]);
      console.log(`Обновлен статус кошелька ${walletAddress} для пользователя ${userId}`);
    }
  } catch (error) {
    console.error('Ошибка отслеживания подключения кошелька:', error);
  }
}

/**
 * Отмечает кошелек как отключенный
 */
export async function trackWalletDisconnection(userId: number, walletAddress: string): Promise<void> {
  try {
    const updateQuery = `
      UPDATE user_wallets 
      SET is_connected = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND wallet_address = $2
    `;
    await db.query(updateQuery, [userId, walletAddress]);
    console.log(`Отслежено отключение кошелька ${walletAddress} для пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка отслеживания отключения кошелька:', error);
  }
}

/**
 * Получает все кошельки пользователя
 */
export async function getUserWallets(userId: number) {
  try {
    const query = `
      SELECT * FROM user_wallets 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения кошельков пользователя:', error);
    return [];
  }
}