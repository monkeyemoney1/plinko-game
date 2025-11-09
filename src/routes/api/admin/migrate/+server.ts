import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

const ADMIN_PASSWORD = process.env.ADMIN_MIGRATION_PASSWORD || 'your-secure-password-here';

/**
 * POST /api/admin/migrate
 * Применяет миграцию 010 к базе данных
 * Требует пароль для безопасности
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      console.log('Применение миграции 010...');

      // Добавляем поля status и updated_at
      await client.query(`
        ALTER TABLE game_bets 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed',
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);

      // Обновляем существующие записи
      await client.query(`
        UPDATE game_bets SET status = 'completed' WHERE status IS NULL;
      `);

      // Создаем индекс
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_game_bets_status ON game_bets(status);
      `);

      // Добавляем комментарий
      await client.query(`
        COMMENT ON COLUMN game_bets.status IS 'Статус ставки: pending (ожидает завершения), completed (завершена)';
      `);

      await client.query('COMMIT');

      // Проверяем результат
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'game_bets' 
        AND column_name IN ('status', 'updated_at')
        ORDER BY column_name;
      `);

      console.log('Миграция успешно применена!');

      return json({
        success: true,
        message: 'Migration 010 applied successfully',
        columns_added: result.rows
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Migration failed', 
      details: errorMessage 
    }, { status: 500 });
  }
};

/**
 * GET /api/admin/migrate
 * Проверяет статус миграции
 */
export const GET: RequestHandler = async () => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'game_bets' 
        AND column_name IN ('status', 'updated_at')
        ORDER BY column_name;
      `);

      const hasStatus = result.rows.some(row => row.column_name === 'status');
      const hasUpdatedAt = result.rows.some(row => row.column_name === 'updated_at');

      return json({
        migration_applied: hasStatus && hasUpdatedAt,
        columns: result.rows,
        message: hasStatus && hasUpdatedAt 
          ? 'Migration 010 already applied' 
          : 'Migration 010 not yet applied'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Migration check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Failed to check migration status', 
      details: errorMessage 
    }, { status: 500 });
  }
};
