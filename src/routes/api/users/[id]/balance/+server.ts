import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

// PUT: конвертация между TON и Stars
export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  if (!id) return json({ error: 'User ID is required' }, { status: 400 });
  const userId = parseInt(id);
  if (isNaN(userId)) return json({ error: 'Invalid user ID' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

  const { direction, amount } = body as { direction: 'tonToStars' | 'starsToTon'; amount: number };
  const amt = Number(amount);
  if (!direction || !['tonToStars', 'starsToTon'].includes(direction) || !isFinite(amt) || amt <= 0) {
    return json({ error: 'Invalid payload' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ures = await client.query('SELECT id, stars_balance, ton_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (ures.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'User not found' }, { status: 404 });
    }
    const user = ures.rows[0];
    let stars = Number(user.stars_balance);
    let ton = Number(user.ton_balance);

    if (direction === 'tonToStars') {
      if (ton < amt) {
        await client.query('ROLLBACK');
        return json({ error: 'Insufficient TON balance' }, { status: 400 });
      }
      ton -= amt;
      // 1 TON -> 100 Stars
      stars += amt * 100;
    } else {
      if (stars < amt) {
        await client.query('ROLLBACK');
        return json({ error: 'Insufficient Stars balance' }, { status: 400 });
      }
      stars -= amt;
      // 95 Stars -> 1 TON
      ton += amt / 95;
    }

    const upres = await client.query(
      'UPDATE users SET stars_balance = $1, ton_balance = $2, updated_at = NOW() WHERE id = $3 RETURNING id, stars_balance, ton_balance, updated_at',
      [stars, ton, userId],
    );
    await client.query('COMMIT');
    const updated = upres.rows[0];
    return json({
      success: true,
      user: {
        id: updated.id,
        balance: { stars: Number(updated.stars_balance), ton: Number(updated.ton_balance) },
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Balance convert error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
};

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
    const result = await client.query(`
      SELECT 
        id,
        ton_address,
        stars_balance,
        ton_balance,
        last_login,
        created_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];
    
    return json({
      success: true,
      user: {
        id: user.id,
        ton_address: user.ton_address,
        balance: {
          stars: parseFloat(user.stars_balance),
          ton: parseFloat(user.ton_balance)
        },
        last_login: user.last_login,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Balance fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};