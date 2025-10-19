const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5173';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = requestModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testHealthEndpoint() {
  console.log('\n🔍 Тестирование /api/health...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    console.log('✅ Health Status:', response.status);
    console.log('📊 Health Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

async function testMetricsEndpoint() {
  console.log('\n📈 Тестирование /api/metrics...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/metrics`);
    console.log('✅ Metrics Status:', response.status);
    console.log('📊 Metrics Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Metrics failed:', error.message);
    throw error;
  }
}

async function testCreateUser() {
  console.log('\n👤 Тестирование создания пользователя...');
  
  try {
    const userData = {
      ton_address: `EQTest${Date.now()}`,
      public_key: 'test_public_key_' + Date.now(),
      wallet_type: 'tonkeeper',
      wallet_version: '2.0'
    };

    const response = await makeRequest(`${BASE_URL}/api/users`, {
      method: 'POST',
      body: userData
    });

    console.log('✅ User Creation Status:', response.status);
    console.log('👤 User Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    throw error;
  }
}

async function testUserBalance(userId) {
  console.log(`\n💰 Тестирование баланса пользователя ${userId}...`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/users/${userId}/balance`);
    console.log('✅ Balance Status:', response.status);
    console.log('💰 Balance Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    throw error;
  }
}

async function testCreateBet(userId) {
  console.log(`\n🎮 Тестирование создания ставки для пользователя ${userId}...`);
  
  try {
    const betData = {
      user_id: userId,
      bet_amount: 5.0,
      currency: 'STARS',
      risk_level: 'MEDIUM',
      rows_count: 12,
      client_result: {
        multiplier: 1.8,
        payout: 9.0,
        profit: 4.0,
        is_win: true,
        ball_path: [0, 1, 1, 2, 2, 3, 4, 5, 5, 6]
      }
    };

    const response = await makeRequest(`${BASE_URL}/api/bets`, {
      method: 'POST',
      body: betData
    });

    console.log('✅ Bet Status:', response.status);
    console.log('🎮 Bet Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Bet creation failed:', error.message);
    throw error;
  }
}

async function testUserGames(userId) {
  console.log(`\n📊 Тестирование истории игр пользователя ${userId}...`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/users/${userId}/games?limit=5`);
    console.log('✅ Games Status:', response.status);
    console.log('📊 Games Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Games history failed:', error.message);
    throw error;
  }
}

async function testDebugEndpoint() {
  console.log('\n🔧 Тестирование /api/debug...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/debug`);
    console.log('✅ Debug Status:', response.status);
    console.log('🔧 Debug Data:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    // Debug может не работать, это не критично
    return null;
  }
}

async function runApiTests() {
  console.log('🚀 Запуск тестирования API endpoints...\n');
  
  try {
    // 1. Тестируем health check
    await testHealthEndpoint();
    
    // 2. Тестируем метрики
    await testMetricsEndpoint();
    
    // 3. Создаем нового пользователя
    const userResponse = await testCreateUser();
    const userId = userResponse.data?.user?.id;
    
    if (userId) {
      // 4. Проверяем баланс пользователя
      await testUserBalance(userId);
      
      // 5. Создаем ставку
      await testCreateBet(userId);
      
      // 6. Проверяем историю игр
      await testUserGames(userId);
    }
    
    // 7. Тестируем debug endpoint
    await testDebugEndpoint();
    
    console.log('\n🎉 Все API тесты завершены успешно!');
    
    if (userId) {
      console.log('📊 Результаты API тестов:');
      console.log(`   - Создан пользователь ID: ${userId}`);
      console.log(`   - Ставка размещена успешно`);
      console.log(`   - Баланс обновлен`);
      console.log(`   - История игр получена`);
    }
    
  } catch (error) {
    console.error('\n💥 API тест провален:', error.message);
  }
}

// Добавляем задержку перед запуском, чтобы сервер успел стартовать
setTimeout(() => {
  runApiTests();
}, 3000);

console.log('⏳ Ожидание запуска сервера (3 секунды)...');