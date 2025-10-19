#!/usr/bin/env node

/**
 * Тест исправленного Stars API с правильными полями
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';
const TEST_TELEGRAM_ID = 123456789;

async function testFixedStarsAPI() {
  console.log('🔧 Тестирование исправленного Telegram Stars API');
  console.log('URL:', BASE_URL);
  console.log('Test Telegram ID:', TEST_TELEGRAM_ID);
  console.log('---');

  try {
    // 1. Тест создания Stars invoice с правильными полями
    console.log('1️⃣ Тест создания Stars invoice (исправленный)...');
    
    const initiateResponse = await fetch(`${BASE_URL}/api/payments/stars/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegram_id: TEST_TELEGRAM_ID,  // Теперь используем telegram_id вместо user_id
        amount: 25,
        description: 'Тест исправленного API из Node.js'
      })
    });

    const initiateData = await initiateResponse.json();
    console.log('Response status:', initiateResponse.status);
    console.log('Response data:', JSON.stringify(initiateData, null, 2));

    if (initiateResponse.ok && initiateData.success) {
      console.log('✅ Invoice создан успешно! Исправление сработало!');
      console.log('📋 Payload:', initiateData.payload);
      console.log('🔗 Invoice URL:', initiateData.invoice_url);
      
      // 2. Тест верификации с правильными полями
      console.log('\n2️⃣ Тест верификации платежа (исправленный)...');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/payments/stars/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegram_id: TEST_TELEGRAM_ID,  // Добавлен telegram_id
          payload: initiateData.payload,
          amount: 25  // Добавлен amount
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('Verify response status:', verifyResponse.status);
      console.log('Verify response data:', JSON.stringify(verifyData, null, 2));

      if (verifyResponse.status === 409 || verifyData.error?.includes('pending')) {
        console.log('✅ Верификация работает правильно (транзакция в статусе pending)');
      } else if (verifyResponse.status === 404) {
        console.log('✅ Верификация работает (транзакция не оплачена)');
      } else {
        console.log('⚠️ Неожиданный ответ верификации');
      }

      // 3. Проверим, что пользователь создался
      console.log('\n3️⃣ Проверка созданного пользователя...');
      
      const userResponse = await fetch(`${BASE_URL}/api/users/${TEST_TELEGRAM_ID}`);
      const userData = await userResponse.json();
      
      console.log('User check status:', userResponse.status);
      if (userResponse.ok) {
        console.log('✅ Пользователь найден в базе:', {
          id: userData.user?.id,
          telegram_id: userData.user?.telegram_id,
          stars_balance: userData.user?.stars_balance
        });
      } else {
        console.log('ℹ️ Пользователь не найден через /api/users, но это нормально');
      }

    } else {
      console.log('❌ Ошибка создания invoice:', initiateData.error);
      
      if (initiateData.error?.includes('обязательные поля')) {
        console.log('🚨 Исправление не сработало! API все еще требует отсутствующие поля');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }

  console.log('\n🎉 Тест завершен!');
  console.log('\n📱 Для тестирования в Telegram WebApp:');
  console.log('1. Откройте https://plinko-game-9hku.onrender.com/profile');
  console.log('2. Нажмите "+" рядом с Stars балансом');
  console.log('3. Введите сумму и нажмите "Пополнить"');
}

// Запуск теста
testFixedStarsAPI();