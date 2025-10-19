import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      user_id, 
      ip_address, 
      user_agent, 
      network = 'mainnet' 
    } = body;

    // Валидация параметров
    if (!user_id) {
      return json({ error: 'Missing required field: user_id' }, { status: 400 });
    }

    const userId = parseInt(user_id);
    if (isNaN(userId)) {
      return json({ error: 'Invalid user_id' }, { status: 400 });
    }

    if (network && !['mainnet', 'testnet'].includes(network)) {
      return json({ error: 'Invalid network. Must be mainnet or testnet' }, { status: 400 });
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

    // Закрываем все активные сессии пользователя
    await client.query(`
      UPDATE game_sessions 
      SET is_active = false, session_end = NOW()
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    // Создаем новую сессию
    const sessionResult = await client.query(`
      INSERT INTO game_sessions (
        user_id, ip_address, user_agent, network, is_active
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [userId, ip_address, user_agent, network]);

    await client.query('COMMIT');

    const session = sessionResult.rows[0];

    return json({
      success: true,
      session: {
        id: session.id,
        user_id: session.user_id,
        session_start: session.session_start,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        network: session.network,
        is_active: session.is_active
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Session creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};

// Получение активной сессии пользователя
export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('user_id');
  
  if (!userId) {
    return json({ error: 'user_id parameter is required' }, { status: 400 });
  }

  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    return json({ error: 'Invalid user_id' }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        id,
        user_id,
        session_start,
        ip_address,
        user_agent,
        network,
        is_active
      FROM game_sessions 
      WHERE user_id = $1 AND is_active = true
      ORDER BY session_start DESC
      LIMIT 1
    `, [userIdNum]);

    if (result.rows.length === 0) {
      return json({ 
        success: true, 
        session: null,
        message: 'No active session found'
      });
    }

    const session = result.rows[0];

    return json({
      success: true,
      session: {
        id: session.id,
        user_id: session.user_id,
        session_start: session.session_start,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        network: session.network,
        is_active: session.is_active
      }
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};

// Закрытие сессии
export const DELETE: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('user_id');
  
  if (!userId) {
    return json({ error: 'user_id parameter is required' }, { status: 400 });
  }

  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    return json({ error: 'Invalid user_id' }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE game_sessions 
      SET is_active = false, session_end = NOW()
      WHERE user_id = $1 AND is_active = true
      RETURNING *
    `, [userIdNum]);

    return json({
      success: true,
      closed_sessions: result.rowCount,
      message: `Closed ${result.rowCount} active session(s)`
    });

  } catch (error) {
    console.error('Session close error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};