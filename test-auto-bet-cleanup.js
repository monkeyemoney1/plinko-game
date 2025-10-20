// Тест для проверки очистки автоматических ставок
// Этот файл поможет протестировать поведение автобета в различных сценариях

console.log('=== Тест очистки автоматических ставок ===');

// Симуляция состояний автобета
let autoBetInterval = null;
let autoBetsLeft = 5;

function resetAutoBetInterval() {
  if (autoBetInterval !== null) {
    clearInterval(autoBetInterval);
    autoBetInterval = null;
    console.log('✅ Auto bet interval cleared');
  }
}

function startAutoBet() {
  if (autoBetInterval === null) {
    console.log('🚀 Starting auto bet...');
    autoBetInterval = setInterval(() => {
      if (autoBetsLeft > 0) {
        console.log(`💰 Auto bet #${6 - autoBetsLeft}, осталось: ${autoBetsLeft - 1}`);
        autoBetsLeft--;
      } else {
        console.log('🏁 Auto bet completed');
        resetAutoBetInterval();
      }
    }, 1000);
  }
}

// Тест 1: Нормальное завершение автобета
console.log('\n--- Тест 1: Нормальное завершение ---');
autoBetsLeft = 3;
startAutoBet();

setTimeout(() => {
  console.log('\n--- Тест 2: Принудительная остановка (навигация) ---');
  resetAutoBetInterval();
  
  console.log('\n--- Тест 3: Повторная очистка (должна быть безопасной) ---');
  resetAutoBetInterval();
  
  console.log('\n✅ Все тесты завершены');
}, 5000);

// Симуляция событий браузера
console.log('\n--- Симуляция событий браузера ---');

// beforeNavigate
console.log('📝 beforeNavigate -> очистка автобета');

// beforeunload 
console.log('🔄 beforeunload -> очистка автобета');

// onDestroy
console.log('🗑️ onDestroy -> очистка автобета + удаление слушателей');

console.log('\n💡 Проверьте консоль браузера на наличие ошибок при:');
console.log('   - Перезагрузке страницы (F5)');
console.log('   - Переходе в профиль');
console.log('   - Выходе из аккаунта'); 
console.log('   - Потере соединения');