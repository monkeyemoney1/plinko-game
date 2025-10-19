#!/usr/bin/env node
/**
 * Проверяем структуру таблицы users в продакшн БД
 */

async function checkTableStructure() {
  try {
    console.log('🔍 Checking users table structure...');
    
    const response = await fetch('https://plinko-game-9hku.onrender.com/api/admin/db/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
      })
    });
    
    if (!response.ok) {
      console.log('❌ Failed to query table structure');
      return;
    }
    
    const data = await response.json();
    console.log('📋 Users table columns:');
    console.log('========================');
    console.log('Raw data:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) {
      data.forEach(col => {
        console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach(col => {
        console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('Unexpected data format:', data);
    }
    
    // Проверим также user_wallets
    console.log('\n🔍 Checking user_wallets table structure...');
    
    const walletsResponse = await fetch('https://plinko-game-9hku.onrender.com/api/admin/db/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'user_wallets' ORDER BY ordinal_position;"
      })
    });
    
    if (walletsResponse.ok) {
      const walletsData = await walletsResponse.json();
      console.log('📋 User_wallets table columns:');
      console.log('===============================');
      
      if (Array.isArray(walletsData)) {
        walletsData.forEach(col => {
          console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      } else if (walletsData.rows && Array.isArray(walletsData.rows)) {
        walletsData.rows.forEach(col => {
          console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      } else {
        console.log('Unexpected wallets data format:', walletsData);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTableStructure();