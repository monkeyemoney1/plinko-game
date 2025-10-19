#!/usr/bin/env node
/**
 * Тест всех админ аналитик после исправления схемы БД
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

const endpoints = [
  '/api/admin/stats',
  '/api/admin/analytics/users',
  '/api/admin/analytics/wallets', 
  '/api/admin/analytics/stars',
  '/api/admin/game-stats'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing ${endpoint}...`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Admin-Analytics-Test/1.0'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (endpoint === '/api/admin/stats') {
      console.log('📊 Main Stats:', {
        users: data.users || 'N/A',
        games: data.games || 'N/A',
        transactions: data.transactions || 'N/A'
      });
    } else if (endpoint === '/api/admin/analytics/users') {
      console.log('👥 Users Analytics:', {
        total: data.summary?.total || 'N/A',
        recent: data.recentUsers?.length || 'N/A'
      });
    } else if (endpoint === '/api/admin/analytics/wallets') {
      console.log('💳 Wallets Analytics:', {
        total: data.summary?.total || 'N/A',
        recent: data.recentWallets?.length || 'N/A'
      });
    } else if (endpoint === '/api/admin/analytics/stars') {
      console.log('⭐ Stars Analytics:', {
        total: data.summary?.total || 'N/A',
        revenue: data.summary?.revenue || 'N/A'
      });
    } else if (endpoint === '/api/admin/game-stats') {
      console.log('🎮 Game Stats:', {
        total: data.summary?.total || 'N/A',
        totalWagered: data.summary?.totalWagered || 'N/A'
      });
    }
    
    console.log('✅ SUCCESS');
    return true;
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Admin Analytics Endpoints');
  console.log('====================================');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint);
    results.push({ endpoint, success });
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📋 SUMMARY');
  console.log('===========');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(({ endpoint, success }) => {
    console.log(`${success ? '✅' : '❌'} ${endpoint}`);
  });
  
  console.log(`\nResult: ${successful}/${total} endpoints working`);
  
  if (successful === total) {
    console.log('🎉 All analytics endpoints are working correctly!');
  } else {
    console.log('⚠️  Some endpoints need attention');
  }
}

// Запуск теста
runTests().catch(console.error);