/**
 * Простое создание таблицы через обычный SQL запрос
 */

import { db } from './src/lib/db.js';

async function createTable() {
  console.log('🗄️ Создаем таблицу user_wallets...');
  
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          wallet_address VARCHAR(200) NOT NULL,
          is_connected BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.query(createTableSQL);
    console.log('✅ Таблица user_wallets создана!');
    
    // Создаем индексы
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);',
      'CREATE INDEX IF NOT EXISTS idx_user_wallets_created_at ON user_wallets(created_at);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wallets_unique ON user_wallets(user_id, wallet_address);'
    ];
    
    for (const indexSQL of indexQueries) {
      await db.query(indexSQL);
    }
    
    console.log('✅ Индексы созданы!');
    
    // Проверяем таблицу
    const result = await db.query("SELECT COUNT(*) as count FROM user_wallets");
    console.log(`📋 Таблица готова, записей: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

createTable();