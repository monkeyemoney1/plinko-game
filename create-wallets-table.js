/**
 * Создание таблицы user_wallets в production через API
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

async function createUserWalletsTable() {
  console.log('🗄️ Создаем таблицу user_wallets в production...\n');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        wallet_address VARCHAR(200) NOT NULL,
        is_connected BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_user_wallets_created_at ON user_wallets(created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wallets_unique 
    ON user_wallets(user_id, wallet_address);
  `;
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: createTableQuery })
    });
    
    if (response.ok) {
      console.log('✅ Таблица user_wallets успешно создана!');
      
      // Проверяем, что таблица создалась
      const checkResponse = await fetch(`${BASE_URL}/api/admin/db/query`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_wallets'" 
        })
      });
      
      if (checkResponse.ok) {
        const result = await checkResponse.json();
        const tableExists = result.rows[0].count > 0;
        console.log(`📋 Таблица существует: ${tableExists ? '✅' : '❌'}`);
      }
      
    } else {
      const error = await response.json();
      console.log('❌ Ошибка создания таблицы:', error.error);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем создание таблицы
createUserWalletsTable();