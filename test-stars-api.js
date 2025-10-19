#!/usr/bin/env node

/**
 * Тестирование Telegram Stars API в production
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';
const TEST_USER_ID = 123456789;

async function testStarsAPI() {
  console.log('🌟 Тестирование Telegram Stars API');
  console.log('URL:', BASE_URL);
  console.log('Test User ID:', TEST_USER_ID);
  console.log('---');

  try {
    // 1. Тест создания Stars invoice
    console.log('1️⃣ Тест создания Stars invoice...');
    
    const initiateResponse = await fetch(`${BASE_URL}/api/payments/stars/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegram_id: TEST_USER_ID,
        amount: 50,
        description: 'Тест пополнения баланса из Node.js'
      })
    });

    const initiateData = await initiateResponse.json();
    console.log('Response status:', initiateResponse.status);
    console.log('Response data:', JSON.stringify(initiateData, null, 2));

    if (initiateResponse.ok && initiateData.success) {
      console.log('✅ Invoice создан успешно!');
      console.log('📋 Payload:', initiateData.payload);
      console.log('🔗 Invoice URL:', initiateData.invoice_url);
      
      // 2. Тест верификации (должен вернуть "не найден" пока не оплачен)
      console.log('\n2️⃣ Тест верификации платежа...');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/payments/stars/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegram_id: TEST_USER_ID,
          payload: initiateData.payload,
          amount: 50
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('Verify response status:', verifyResponse.status);
      console.log('Verify response data:', JSON.stringify(verifyData, null, 2));

      if (verifyResponse.status === 404 && verifyData.error?.includes('не найден')) {
        console.log('✅ Верификация работает правильно (транзакция еще не оплачена)');
      } else {
        console.log('⚠️ Неожиданный ответ верификации');
      }

    } else {
      console.log('❌ Ошибка создания invoice:', initiateData.error);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }

  console.log('\n🎉 Тест завершен!');
  console.log('\n📝 Следующие шаги:');
  console.log('1. Откройте https://plinko-game-9hku.onrender.com/test-stars.html в браузере');
  console.log('2. Или в Telegram через WebApp для полного тестирования');
  console.log('3. Проверьте профиль игры: https://plinko-game-9hku.onrender.com/profile');
}

// Запуск теста
testStarsAPI();