// Простой тест для проверки работы сервера
console.log('🌐 Проверка доступности сервера...');

// Функция для тестирования URL
async function testUrl(url, description) {
  console.log(`\n📡 Тестирование: ${description}`);
  console.log(`🔗 URL: ${url}`);
  
  try {
    // Используем fetch для тестирования
    const response = await fetch(url);
    const status = response.status;
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    console.log(`✅ Статус: ${status}`);
    console.log(`📊 Ответ:`, data);
    return { success: true, status, data };
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Список endpoints для тестирования
const endpoints = [
  { url: 'http://localhost:5173/', description: 'Главная страница' },
  { url: 'http://localhost:5173/api/simple-health', description: 'Простой health check' },
  { url: 'http://localhost:5173/api/debug', description: 'Debug endpoint' },
  { url: 'http://localhost:5173/api/health', description: 'Health endpoint' },
];

async function runTests() {
  console.log('🚀 Запуск веб-тестов...\n');
  
  let successCount = 0;
  let totalCount = endpoints.length;
  
  for (const endpoint of endpoints) {
    const result = await testUrl(endpoint.url, endpoint.description);
    if (result.success) {
      successCount++;
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Результаты тестирования:`);
  console.log(`✅ Успешно: ${successCount}/${totalCount}`);
  console.log(`❌ Ошибок: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 Все endpoints работают!');
  } else {
    console.log('⚠️ Некоторые endpoints недоступны');
  }
}

// Запуск тестов
runTests().catch(console.error);