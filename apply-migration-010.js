import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Применение миграции 010_add_game_bets_status.sql...');
    
    const migrationPath = path.join(__dirname, 'migrations', '010_add_game_bets_status.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена!');
    
    // Проверяем результат
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'game_bets' AND column_name IN ('status', 'updated_at')
    `);
    
    console.log('📊 Новые поля в таблице game_bets:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);
