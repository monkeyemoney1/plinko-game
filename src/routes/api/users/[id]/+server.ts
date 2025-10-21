import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const userId = params.id;

    if (!userId) {
      return json({ 
        success: false, 
        error: 'Missing user ID' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, telegram_username, ton_balance, stars_balance, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      const user = result.rows[0];
      
      return json({
        success: true,
        user: {
          id: user.id,
          username: user.telegram_username,
          ton_balance: parseFloat(user.ton_balance),
          stars_balance: user.stars_balance !== undefined ? parseFloat(user.stars_balance) : undefined,
          created_at: user.created_at
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get user error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};