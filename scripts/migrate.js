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
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false  // Отключаем SSL для локальной базы данных
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
      
      // Миграция deposits table
      try {
        const migrationPath = join(__dirname, '..', 'migrations', '004_add_deposits_table.sql');
        const migration = await readFile(migrationPath, 'utf8');
        await client.query(migration);
        console.log('✅ Deposits migration applied successfully');
      } catch (migrationError) {
        if (migrationError.code === '42P07') {
          console.log('⚠️  Deposits table already exists, skipping');
        } else if (migrationError.code === 'ENOENT') {
          console.log('ℹ️  Deposits migration not found');
        } else {
          console.warn('⚠️  Deposits migration warning:', migrationError.message);
        }
      }
      
      // Миграция star_transactions table
      try {
        const starMigrationPath = join(__dirname, '..', 'migrations', '005_add_star_transactions.sql');
        const starMigration = await readFile(starMigrationPath, 'utf8');
        await client.query(starMigration);
        console.log('✅ Stars transactions migration applied successfully');
      } catch (migrationError) {
        if (migrationError.code === '42P07') {
          console.log('⚠️  Stars transactions table already exists, skipping');
        } else if (migrationError.code === 'ENOENT') {
          console.log('ℹ️  Stars migration not found');
        } else {
          console.warn('⚠️  Stars migration warning:', migrationError.message);
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
      process.exit(1);
    }
  } finally {
    await client.end();
  }
  
  console.log('🎉 Migration completed successfully!');
}

// Run migration
migrate().catch(console.error);