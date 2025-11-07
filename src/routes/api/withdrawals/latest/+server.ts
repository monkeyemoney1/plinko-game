import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return json({ success: false, error: 'user_id is required' }, { status: 400 });
    }
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, status, amount, net_amount, wallet_address, created_at
         FROM withdrawals
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );
      if (res.rows.length === 0) {
        return json({ success: true, withdrawal: null });
      }
      return json({ success: true, withdrawal: res.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Latest withdrawal endpoint error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};
