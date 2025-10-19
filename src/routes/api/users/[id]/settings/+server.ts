import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// Получение настроек пользователя
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;
  
  if (!id) {
    return json({ error: 'User ID is required' }, { status: 400 });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    return json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    // Проверяем существование пользователя
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем настройки или создаем дефолтные
    let settingsResult = await client.query(`
      SELECT 
        animations_enabled,
        sound_enabled,
        notifications_enabled,
        theme,
        language,
        created_at,
        updated_at
      FROM user_settings 
      WHERE user_id = $1
    `, [userId]);

    let settings;
    if (settingsResult.rows.length === 0) {
      // Создаем дефолтные настройки
      const createResult = await client.query(`
        INSERT INTO user_settings (
          user_id, animations_enabled, sound_enabled, 
          notifications_enabled, theme, language
        ) VALUES ($1, true, true, true, 'dark', 'ru')
        RETURNING *
      `, [userId]);
      
      settings = createResult.rows[0];
    } else {
      settings = settingsResult.rows[0];
    }

    return json({
      success: true,
      settings: {
        animations_enabled: settings.animations_enabled,
        sound_enabled: settings.sound_enabled,
        notifications_enabled: settings.notifications_enabled,
        theme: settings.theme,
        language: settings.language,
        created_at: settings.created_at,
        updated_at: settings.updated_at
      }
    });

  } catch (error) {
    console.error('Settings fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};

// Обновление настроек пользователя
export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  
  if (!id) {
    return json({ error: 'User ID is required' }, { status: 400 });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    return json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const {
      animations_enabled,
      sound_enabled,
      notifications_enabled,
      theme,
      language
    } = body;

    // Валидация параметров
    if (theme && !['dark', 'light'].includes(theme)) {
      return json({ error: 'Invalid theme. Must be dark or light' }, { status: 400 });
    }

    if (language && !['ru', 'en'].includes(language)) {
      return json({ error: 'Invalid language. Must be ru or en' }, { status: 400 });
    }

    if (animations_enabled !== undefined && typeof animations_enabled !== 'boolean') {
      return json({ error: 'animations_enabled must be boolean' }, { status: 400 });
    }

    if (sound_enabled !== undefined && typeof sound_enabled !== 'boolean') {
      return json({ error: 'sound_enabled must be boolean' }, { status: 400 });
    }

    if (notifications_enabled !== undefined && typeof notifications_enabled !== 'boolean') {
      return json({ error: 'notifications_enabled must be boolean' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Проверяем существование пользователя
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Обновляем настройки или создаем новые
    const upsertQuery = `
      INSERT INTO user_settings (
        user_id, animations_enabled, sound_enabled, 
        notifications_enabled, theme, language
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        animations_enabled = COALESCE($2, user_settings.animations_enabled),
        sound_enabled = COALESCE($3, user_settings.sound_enabled),
        notifications_enabled = COALESCE($4, user_settings.notifications_enabled),
        theme = COALESCE($5, user_settings.theme),
        language = COALESCE($6, user_settings.language),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await client.query(upsertQuery, [
      userId,
      animations_enabled,
      sound_enabled,
      notifications_enabled,
      theme,
      language
    ]);

    await client.query('COMMIT');

    const settings = result.rows[0];

    return json({
      success: true,
      settings: {
        animations_enabled: settings.animations_enabled,
        sound_enabled: settings.sound_enabled,
        notifications_enabled: settings.notifications_enabled,
        theme: settings.theme,
        language: settings.language,
        created_at: settings.created_at,
        updated_at: settings.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Settings update error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};