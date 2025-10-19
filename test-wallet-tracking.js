/**
 * Тестирование создания записи кошелька
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

async function testWalletTracking() {
  console.log('💳 Тестируем отслеживание кошелька...\n');
  
  try {
    // Получаем пользователей
    console.log('1️⃣ Получаем список пользователей...');
    const usersResponse = await fetch(`${BASE_URL}/api/admin/analytics/users`);
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`   ✅ Найдено пользователей: ${users.length}`);
      
      if (users.length > 0) {
        const testUser = users[0];
        console.log(`   👤 Тестовый пользователь: ID ${testUser.id}`);
        
        // Пробуем отследить кошелек
        console.log('\n2️⃣ Отслеживаем подключение кошелька...');
        const walletResponse = await fetch(`${BASE_URL}/api/wallet/track-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: testUser.id,
            wallet_address: 'UQTestWallet123AdminDemo456Analytics789'
          })
        });
        
        if (walletResponse.ok) {
          console.log('   ✅ Кошелек успешно отслежен!');
          
          // Проверяем аналитику кошельков
          console.log('\n3️⃣ Проверяем аналитику кошельков...');
          const analyticsResponse = await fetch(`${BASE_URL}/api/admin/analytics/wallets`);
          if (analyticsResponse.ok) {
            const wallets = await analyticsResponse.json();
            console.log(`   ✅ Аналитика кошельков работает! Найдено: ${wallets.length}`);
            
            if (wallets.length > 0) {
              const wallet = wallets[0];
              console.log(`   💳 Пример кошелька:`);
              console.log(`      - Пользователь: ${wallet.user_id}`);
              console.log(`      - Адрес: ${wallet.wallet_address}`);
              console.log(`      - Статус: ${wallet.is_connected ? 'Подключен' : 'Отключен'}`);
            }
          } else {
            console.log(`   ❌ Аналитика кошельков: ${analyticsResponse.status}`);
          }
          
        } else {
          const error = await walletResponse.json();
          console.log(`   ❌ Ошибка отслеживания: ${error.error}`);
        }
        
        // Пробуем создать Stars транзакцию
        console.log('\n4️⃣ Создаем тестовую Stars транзакцию...');
        if (testUser.telegram_id) {
          const starsResponse = await fetch(`${BASE_URL}/api/payments/stars/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: parseInt(testUser.telegram_id),
              amount: 10,
              description: 'Тест админ аналитики'
            })
          });
          
          if (starsResponse.ok) {
            const starsData = await starsResponse.json();
            console.log(`   ✅ Stars транзакция создана: ${starsData.payload}`);
            
            // Проверяем аналитику Stars
            console.log('\n5️⃣ Проверяем аналитику Stars...');
            const starsAnalyticsResponse = await fetch(`${BASE_URL}/api/admin/analytics/stars`);
            if (starsAnalyticsResponse.ok) {
              const transactions = await starsAnalyticsResponse.json();
              console.log(`   ✅ Stars аналитика работает! Найдено: ${transactions.length}`);
            } else {
              console.log(`   ❌ Stars аналитика: ${starsAnalyticsResponse.status}`);
            }
          } else {
            console.log('   ❌ Ошибка создания Stars транзакции');
          }
        }
      }
    } else {
      console.log('   ❌ Не удалось получить пользователей');
    }
    
    console.log('\n🎯 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем тест
testWalletTracking();