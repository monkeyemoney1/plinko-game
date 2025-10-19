/**
 * Создание недостающих таблиц и данных в production
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

async function initializeDatabase() {
  console.log('🔧 Инициализируем базу данных в production...\n');
  
  // Создаем тестового пользователя для демонстрации
  try {
    console.log('1️⃣ Создаем тестового пользователя...');
    const userResponse = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_user_admin',
        wallet_address: 'UQTest123AdminWallet456Demo789',
        telegram_id: '987654321'
      })
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log(`   ✅ Тестовый пользователь создан: ID ${user.user_id}`);
      
      // Создаем тестовую Stars транзакцию
      console.log('\n2️⃣ Создаем тестовую Stars транзакцию...');
      const starsResponse = await fetch(`${BASE_URL}/api/payments/stars/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: 987654321,
          amount: 5,
          description: 'Тестовая транзакция для демо'
        })
      });
      
      if (starsResponse.ok) {
        const starsData = await starsResponse.json();
        console.log(`   ✅ Тестовая Stars транзакция создана: ${starsData.payload}`);
      }
      
    } else {
      const error = await userResponse.json();
      console.log(`   ⚠️  Пользователь уже существует или ошибка: ${error.error}`);
    }
    
  } catch (error) {
    console.log('   ⚠️  Ошибка создания тестовых данных:', error.message);
  }
  
  // Тестируем все эндпоинты после инициализации
  console.log('\n3️⃣ Проверяем все эндпоинты...');
  
  const endpoints = [
    { name: 'Админ статистика', url: '/api/admin/stats' },
    { name: 'Пользователи', url: '/api/admin/analytics/users' },
    { name: 'Кошельки', url: '/api/admin/analytics/wallets' },
    { name: 'Stars транзакции', url: '/api/admin/analytics/stars' },
    { name: 'Игровая статистика', url: '/api/admin/game-stats' },
    { name: 'Все транзакции', url: '/api/admin/transactions' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`);
      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data.stats ? 'OK' : 'OK');
        console.log(`   ✅ ${endpoint.name}: ${count}`);
      } else {
        console.log(`   ❌ ${endpoint.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА!');
  console.log('\n📊 Админ панель доступна по адресу:');
  console.log('🔗 https://plinko-game-9hku.onrender.com/admin');
  console.log('\n📈 Разделы аналитики:');
  console.log('👥 https://plinko-game-9hku.onrender.com/admin/analytics');
  console.log('🗄️ https://plinko-game-9hku.onrender.com/admin/db');
  console.log('💳 https://plinko-game-9hku.onrender.com/admin/transactions');
  console.log('🎲 https://plinko-game-9hku.onrender.com/admin/games');
}

// Запускаем инициализацию
initializeDatabase();