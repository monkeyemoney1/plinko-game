#!/usr/bin/env node

/**
 * Проверка доступности всех API endpoints
 */

const BASE_URL = 'https://plinko-game-9hku.onrender.com';

const endpoints = [
  '/api/simple-health',
  '/api/health', 
  '/api/users/123456789',
  '/api/payments/stars/initiate',
  '/api/payments/stars/verify'
];

async function checkEndpoints() {
  console.log('🔍 Проверка API endpoints на', BASE_URL);
  console.log('---');

  for (const endpoint of endpoints) {
    try {
      console.log(`Проверяем: ${endpoint}`);
      
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: endpoint.includes('/initiate') || endpoint.includes('/verify') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: endpoint.includes('/initiate') ? JSON.stringify({
          telegram_id: 123456789,
          amount: 10,
          description: 'Test'
        }) : endpoint.includes('/verify') ? JSON.stringify({
          telegram_id: 123456789,
          payload: 'test_payload',
          amount: 10
        }) : undefined
      });

      console.log(`  Status: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`  Content-Type: ${contentType}`);

      if (contentType?.includes('application/json')) {
        try {
          const data = await response.json();
          console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? '...' : ''}`);
        } catch (e) {
          console.log(`  JSON Parse Error: ${e.message}`);
        }
      } else {
        const text = await response.text();
        console.log(`  Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('---');
  }
}

checkEndpoints();