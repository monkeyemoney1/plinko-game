import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

// Простой пароль для доступа (измените на свой)
const ADMIN_PASSWORD = 'admin123';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { password, table, limit = 10 } = await request.json();

    // Проверка пароля
    if (password !== ADMIN_PASSWORD) {
      return json({ error: 'Неверный пароль' }, { status: 401 });
    }

    const db = pool;

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
      'balance_operations', 'deposits', 'event_logs', 'user_settings'
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
