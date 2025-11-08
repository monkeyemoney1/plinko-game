import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

// Простой пароль для доступа (измените на свой)
const ADMIN_PASSWORD = 'admin123';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { password, table, limit = 10, action, query } = await request.json();

    // Проверка пароля
    if (password !== ADMIN_PASSWORD) {
      return json({ error: 'Неверный пароль' }, { status: 401 });
    }

    const db = pool;

    // Обработка статистики
    if (action === 'stats') {
      const stats = await db.query(`
        SELECT 
          pg_database.datname as database_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as database_size
        FROM pg_database
        WHERE datistemplate = false;
      `);

      const tableStats = await db.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
      `);

      return json({
        success: true,
        databases: stats.rows,
        topTables: tableStats.rows
      });
    }

    // Обработка SQL запросов
    if (action === 'query') {
      if (!query) {
        return json({ error: 'SQL запрос не указан' }, { status: 400 });
      }

      // Базовая защита от опасных операций
      const normalizedQuery = query.toLowerCase().trim();
      const allowedOperations = ['select', 'show', 'describe', 'explain'];
      const isAllowed = allowedOperations.some((op: string) => normalizedQuery.startsWith(op));

      if (!isAllowed) {
        return json({ 
          error: 'Разрешены только SELECT, SHOW, DESCRIBE и EXPLAIN запросы' 
        }, { status: 403 });
      }

      const result = await db.query(query);

      return json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(field => field.name) || []
      });
    }

    // Если таблица не указана, показываем список всех таблиц
    if (!table) {
      const tables = await db.query(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      // Для каждой таблицы получаем количество записей
      const tablesWithCounts = await Promise.all(
        tables.rows.map(async (t) => {
          const countResult = await db.query(`SELECT COUNT(*) as count FROM ${t.table_name}`);
          return {
            name: t.table_name,
            columns: t.columns_count,
            rows: parseInt(countResult.rows[0].count)
          };
        })
      );

      return json({
        success: true,
        tables: tablesWithCounts
      });
    }

    // Если таблица указана, показываем её данные
    const validTables = [
      'users', 'game_sessions', 'game_bets', 'ton_transactions',
      'balance_operations', 'deposits', 'event_logs', 'user_settings',
      'star_transactions', 'withdrawals', 'user_wallets', 'game_results', 'bets'
    ];

    if (!validTables.includes(table)) {
      return json({ error: 'Недопустимое имя таблицы' }, { status: 400 });
    }

    // Получаем данные из таблицы
    const result = await db.query(
      `SELECT * FROM ${table} ORDER BY id DESC LIMIT $1`,
      [limit]
    );

    // Получаем информацию о колонках
    const columns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    return json({
      success: true,
      table,
      columns: columns.rows,
      data: result.rows,
      count: result.rowCount
    });

  } catch (error) {
    console.error('Database view error:', error);
    return json(
      { error: 'Ошибка при получении данных', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};
