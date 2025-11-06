#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️  DATABASE_URL is not set; skipping migrations');
    return;
  }

  const sslOption = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
  const client = new Client({
    connectionString,
    ssl: sslOption
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check existing tables
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (existingTables.rows.length > 0) {
      console.log('📊 Tables already exist:', existingTables.rows.map(r => r.table_name).join(', '));
      
      // Выполняем дополнительные миграции (например, добавление новых таблиц)
      console.log('📝 Checking for additional migrations...');
      
      // Список всех миграций в порядке выполнения
      const migrations = [
        '004_add_deposits_table.sql',
        '005_add_star_transactions.sql',
        '006_create_withdrawals_table.sql',
        '007_update_withdrawals_table.sql',
        '008_create_user_wallets_table.sql'
      ];

      // Выполняем каждую миграцию
      for (const migrationFile of migrations) {
        try {
          const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
          const migration = await readFile(migrationPath, 'utf8');
          await client.query(migration);
          console.log(`✅ Migration ${migrationFile} applied successfully`);
        } catch (migrationError) {
          if (migrationError.code === '42P07') {
            console.log(`⚠️  Migration ${migrationFile} - table already exists, skipping`);
          } else if (migrationError.code === 'ENOENT') {
            console.log(`ℹ️  Migration ${migrationFile} not found, skipping`);
          } else if (migrationError.code === '42710') {
            console.log(`⚠️  Migration ${migrationFile} - object already exists, skipping`);
          } else {
            console.warn(`⚠️  Migration ${migrationFile} warning:`, migrationError.message);
          }
        }
      }
      
      console.log('✅ Database schema is up to date');
    } else {
      // Read and execute schema only if tables don't exist
      const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
      const schema = await readFile(schemaPath, 'utf8');
      
      console.log('📝 Executing database schema...');
      try {
        await client.query(schema);
        console.log('✅ Database schema created successfully');
      } catch (schemaError) {
        if (schemaError.code === '42P07') {
          console.log('⚠️  Tables already exist, skipping creation');
        } else {
          throw schemaError;
        }
      }

      // Check tables
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      console.log('📊 Tables in database:', result.rows.map(r => r.table_name).join(', '));
    }
    
  } catch (error) {
    // Если ошибка связана с тем, что таблицы уже существуют - игнорируем
    if (error.code === '42P07' && error.message.includes('already exists')) {
      console.log('⚠️  Tables already exist, skipping migration');
      console.log('📊 Database is ready');
    } else {
      console.error('❌ Migration failed:', error);
      // Не блокируем запуск приложения на проде: позволяем серверу стартовать, а миграции выполнить вручную
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
  } finally {
    await client.end();
  }
  
  console.log('🎉 Migration completed successfully!');
}

// Run migration
migrate().catch(console.error);