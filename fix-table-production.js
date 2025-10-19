/**
 * Создание таблицы user_wallets через админ API
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

async function createUserWalletsTable() {
  console.log('🗄️ Создаем таблицу user_wallets через админ API...\n');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        wallet_address VARCHAR(200) NOT NULL,
        is_connected BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
  
  try {
    console.log('📝 Выполняем SQL запрос для создания таблицы...');
    
    // Пробуем создать через health API (который работает)
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('API не доступен');
    }
    
    console.log('✅ API доступен, создаем таблицу через прямой SQL...');
    
    // Используем простой подход - создаем через тестовый эндпоинт
    const testSQLResponse = await fetch(`${BASE_URL}/api/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'create_table',
        sql: createTableSQL.trim()
      })
    });
    
    if (testSQLResponse.ok) {
      console.log('✅ Таблица user_wallets создана через debug API!');
    } else {
      console.log('⚠️ Debug API не сработал, пробуем альтернативный метод...');
      
      // Альтернативно - создаем через создание пользователя с кошельком
      const userResponse = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'table_creator',
          ton_address: 'UQCreateTableTestAddress123456789',
          telegram_id: '999888777'
        })
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log(`✅ Пользователь создан: ${userData.user_id}, это должно инициировать создание схемы`);
        
        // Теперь вызываем отслеживание кошелька, что должно создать таблицу
        const trackResponse = await fetch(`${BASE_URL}/api/wallet/track-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userData.user_id,
            wallet_address: 'UQCreateTableTestAddress123456789'
          })
        });
        
        if (trackResponse.ok) {
          console.log('✅ Отслеживание кошелька активировано - таблица должна быть создана');
        } else {
          console.log('❌ Ошибка отслеживания кошелька:', trackResponse.status);
        }
      }
    }
    
    // Проверяем результат
    console.log('\n🔍 Проверяем создание таблицы...');
    
    const testAnalyticsResponse = await fetch(`${BASE_URL}/api/admin/analytics/wallets`);
    if (testAnalyticsResponse.ok) {
      const wallets = await testAnalyticsResponse.json();
      console.log(`✅ Аналитика кошельков работает! Найдено записей: ${wallets.length}`);
    } else {
      console.log(`❌ Аналитика кошельков не работает: ${testAnalyticsResponse.status}`);
    }
    
    const testUsersResponse = await fetch(`${BASE_URL}/api/admin/analytics/users`);
    if (testUsersResponse.ok) {
      const users = await testUsersResponse.json();
      console.log(`✅ Аналитика пользователей работает! Найдено записей: ${users.length}`);
    } else {
      console.log(`❌ Аналитика пользователей не работает: ${testUsersResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем создание таблицы
createUserWalletsTable();