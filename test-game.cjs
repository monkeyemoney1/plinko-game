const { Pool } = require('pg');

// Подключение к БД
const dbPool = new Pool({
  connectionString: 'postgresql://postgres:PapaDianki2231@localhost:5432/plinko_game'
});

const BASE_URL = 'http://localhost:5173';

async function testDatabase() {
  console.log('🗄️ Тестирование базы данных...');
  
  try {
    // Проверяем подключение
    const result = await dbPool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    console.log('✅ БД подключена:', result.rows[0]);
    
    // Создаем тестового пользователя
    const testUser = await dbPool.query(`
      INSERT INTO users (ton_address, stars_balance, ton_balance) 
      VALUES ('test_address_' || extract(epoch from now()), 1000, 0.5)
      ON CONFLICT DO NOTHING
      RETURNING *
    `);
    
    if (testUser.rows.length > 0) {
      console.log('✅ Тестовый пользователь создан:', testUser.rows[0].id);
      return testUser.rows[0];
    } else {
      // Получаем существующего пользователя
      const existingUser = await dbPool.query('SELECT * FROM users LIMIT 1');
      return existingUser.rows[0];
    }
  } catch (error) {
    console.error('❌ Ошибка БД:', error.message);
    throw error;
  }
}

async function testGameBet(userId) {
  console.log('\n🎮 Тестирование игровой ставки...');
  
  try {
    const betData = {
      user_id: userId,
      bet_amount: 10.0,
      currency: 'STARS',
      risk_level: 'MEDIUM',
      rows_count: 12,
      client_result: {
        multiplier: 2.5,
        payout: 25.0,
        profit: 15.0,
        is_win: true,
        ball_path: [0, 1, 1, 2, 3, 3, 4, 5, 6]
      }
    };

    const betResult = await dbPool.query(`
      INSERT INTO game_bets 
      (user_id, bet_amount, currency, risk_level, rows_count, multiplier, payout, profit, is_win, ball_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      betData.user_id,
      betData.bet_amount,
      betData.currency,
      betData.risk_level,
      betData.rows_count,
      betData.client_result.multiplier,
      betData.client_result.payout,
      betData.client_result.profit,
      betData.client_result.is_win,
      JSON.stringify(betData.client_result.ball_path)
    ]);
    
    console.log('✅ Ставка создана:', betResult.rows[0].id);
    
    // Обновляем баланс пользователя
    await dbPool.query(`
      UPDATE users 
      SET stars_balance = stars_balance + $1 
      WHERE id = $2
    `, [betData.client_result.profit, userId]);
    
    console.log('✅ Баланс обновлен');
    return betResult.rows[0];
  } catch (error) {
    console.error('❌ Ошибка ставки:', error.message);
    throw error;
  }
}

async function testUserBalance(userId) {
  console.log('\n💰 Тестирование баланса пользователя...');
  
  try {
    const balance = await dbPool.query(`
      SELECT id, ton_address, stars_balance, ton_balance, created_at 
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    console.log('✅ Баланс пользователя:', balance.rows[0]);
    return balance.rows[0];
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error.message);
    throw error;
  }
}

async function testGameHistory(userId) {
  console.log('\n📊 Тестирование истории игр...');
  
  try {
    const history = await dbPool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_win = true THEN 1 END) as total_wins,
        COALESCE(AVG(bet_amount), 0) as avg_bet,
        COALESCE(SUM(payout), 0) as total_payout,
        COALESCE(SUM(profit), 0) as total_profit
      FROM game_bets 
      WHERE user_id = $1
    `, [userId]);
    
    console.log('✅ Статистика игр:', history.rows[0]);
    
    // Последние 5 игр
    const recentGames = await dbPool.query(`
      SELECT bet_amount, multiplier, payout, profit, is_win, created_at
      FROM game_bets 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);
    
    console.log('✅ Последние игры:', recentGames.rows);
    return history.rows[0];
  } catch (error) {
    console.error('❌ Ошибка истории игр:', error.message);
    throw error;
  }
}

async function testTonTransaction(userId) {
  console.log('\n🔗 Тестирование TON транзакции...');
  
  try {
    const txData = {
      user_id: userId,
      transaction_hash: 'test_hash_' + Date.now(),
      transaction_type: 'DEPOSIT',
      amount: 1.0,
      from_address: 'test_sender_address',
      to_address: 'test_game_address',
      status: 'CONFIRMED'
    };

    const txResult = await dbPool.query(`
      INSERT INTO ton_transactions 
      (user_id, transaction_hash, transaction_type, amount, from_address, to_address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      txData.user_id,
      txData.transaction_hash,
      txData.transaction_type,
      txData.amount,
      txData.from_address,
      txData.to_address,
      txData.status
    ]);
    
    console.log('✅ TON транзакция создана:', txResult.rows[0].id);
    return txResult.rows[0];
  } catch (error) {
    console.error('❌ Ошибка TON транзакции:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Запуск полного тестирования игры...\n');
  
  try {
    // 1. Тестируем БД
    const user = await testDatabase();
    const userId = user.id;
    
    // 2. Тестируем игровую ставку
    await testGameBet(userId);
    
    // 3. Тестируем баланс
    await testUserBalance(userId);
    
    // 4. Тестируем историю игр
    await testGameHistory(userId);
    
    // 5. Тестируем TON транзакцию
    await testTonTransaction(userId);
    
    console.log('\n🎉 Все тесты пройдены успешно!');
    console.log('📊 Результаты:');
    console.log(`   - Пользователь ID: ${userId}`);
    console.log(`   - Адрес: ${user.ton_address}`);
    console.log(`   - Баланс STARS: ${user.stars_balance}`);
    console.log(`   - Баланс TON: ${user.ton_balance}`);
    
  } catch (error) {
    console.error('\n💥 Тест провален:', error.message);
  } finally {
    await dbPool.end();
  }
}

// Запуск тестов
runAllTests();