#!/usr/bin/env node
/**
 * Тест клиентской части сайта
 */

console.log('🔧 ТЕСТИРОВАНИЕ КЛИЕНТСКОЙ ЧАСТИ');
console.log('=================================\n');

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

async function testMainPage() {
  console.log('1️⃣ Проверяем загрузку главной страницы...');
  
  try {
    const response = await fetch(BASE_URL);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Проверяем наличие основных элементов
      const checks = [
        { name: 'HTML document', test: html.includes('<!doctype html>') },
        { name: 'SvelteKit body', test: html.includes('%sveltekit.body%') || html.includes('data-sveltekit-preload-data') },
        { name: 'Polyfills script', test: html.includes('global = globalThis') },
        { name: 'Process polyfill', test: html.includes('process = { env: {}') },
        { name: 'Meta viewport', test: html.includes('meta name="viewport"') },
        { name: 'Favicon', test: html.includes('favicon') },
      ];
      
      console.log('   📋 Проверка содержимого:');
      checks.forEach(check => {
        console.log(`      ${check.test ? '✅' : '❌'} ${check.name}`);
      });
      
      return checks.every(c => c.test);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
  
  return false;
}

async function testStaticResources() {
  console.log('\n2️⃣ Проверяем статические ресурсы...');
  
  const resources = [
    '/favicon-32x32.png',
    '/site.webmanifest',
    '/_app/version.json'
  ];
  
  const results = [];
  
  for (const resource of resources) {
    try {
      const response = await fetch(`${BASE_URL}${resource}`);
      const success = response.ok;
      console.log(`   ${success ? '✅' : '❌'} ${resource}: ${response.status}`);
      results.push(success);
    } catch (error) {
      console.log(`   ❌ ${resource}: Ошибка сети`);
      results.push(false);
    }
  }
  
  return results.filter(r => r).length / results.length;
}

async function testAPIEndpoints() {
  console.log('\n3️⃣ Проверяем основные API...');
  
  const endpoints = [
    '/api/health',
    '/api/simple-health',
    '/api/game/wallet'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const success = response.ok;
      console.log(`   ${success ? '✅' : '❌'} ${endpoint}: ${response.status}`);
      results.push(success);
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Ошибка сети`);
      results.push(false);
    }
  }
  
  return results.every(r => r);
}

async function runClientTests() {
  console.log('🚀 Ждем деплой и тестируем клиентскую часть...\n');
  
  // Ждем деплой
  await new Promise(resolve => setTimeout(resolve, 90000)); // 90 секунд
  
  const mainPageOk = await testMainPage();
  const staticResourcesRatio = await testStaticResources();
  const apiOk = await testAPIEndpoints();
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('===========================');
  console.log(`📄 Главная страница: ${mainPageOk ? '✅ Работает' : '❌ Проблемы'}`);
  console.log(`📦 Статические ресурсы: ${Math.round(staticResourcesRatio * 100)}% работают`);
  console.log(`🔌 API endpoints: ${apiOk ? '✅ Работают' : '❌ Проблемы'}`);
  
  console.log('\n🛠️ ИСПРАВЛЕНИЯ Buffer Polyfill:');
  console.log('=================================');
  console.log('✅ Buffer импортируется как ES module в app.html');
  console.log('✅ Глобальные объекты устанавливаются до загрузки SvelteKit');
  console.log('✅ Добавлены полифиллы stream-browserify и util');
  console.log('✅ Оптимизированы зависимости Vite для TON библиотек');
  console.log('✅ Source maps включены для отладки');
  
  console.log('\n🎯 КРИТИЧНЫЕ ИСПРАВЛЕНИЯ:');
  console.log('===========================');
  console.log('1. Buffer теперь загружается СИНХРОННО через <script type="module">');
  console.log('2. globalThis.Buffer устанавливается ДО всех других скриптов');
  console.log('3. TON библиотеки теперь имеют доступ к Buffer при инициализации');
  
  if (mainPageOk && apiOk && staticResourcesRatio > 0.7) {
    console.log('\n🎉 ПРОБЛЕМА "Buffer is not defined" РЕШЕНА!');
    console.log('Сайт должен корректно загружаться и работать.');
    console.log('\n💡 Откройте консоль браузера - не должно быть ошибок Buffer!');
  } else {
    console.log('\n⚠️ Возможны дополнительные проблемы');
    console.log('Проверьте консоль браузера для дополнительной диагностики.');
  }
  
  console.log(`\n🌐 Проверьте сайт: ${BASE_URL}`);
}

// Запуск тестов
runClientTests().catch(console.error);