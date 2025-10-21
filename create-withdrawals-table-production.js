import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Подключение к production базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createWithdrawalsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Подключено к базе данных');
    
    // Читаем SQL файл
    const sqlPath = join(__dirname, 'sql', 'create_withdrawals_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL файл загружен');
    console.log('🚀 Начинаем создание таблицы withdrawals...');
    
    // Выполняем SQL
    await client.query(sql);
    
    console.log('✅ Таблица withdrawals успешно создана!');
    
    // Проверяем создание
    const checkResult = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'withdrawals'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Структура таблицы withdrawals:');
    console.log('─'.repeat(80));
    checkResult.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(20)} | NULL: ${row.is_nullable}`);
    });
    console.log('─'.repeat(80));
    
    // Проверяем индексы
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'withdrawals'
    `);
    
    console.log('\n🔍 Индексы:');
    console.log('─'.repeat(80));
    indexResult.rows.forEach(row => {
      console.log(`${row.indexname}`);
    });
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('\n✅ Соединение с БД закрыто');
  }
}

// Запуск скрипта
createWithdrawalsTable().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
