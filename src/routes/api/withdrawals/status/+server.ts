import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
  const user_id = url.searchParams.get('user_id');
  const withdrawal_id = url.searchParams.get('withdrawal_id');

    if (!user_id && !withdrawal_id) {
      return json({ 
        success: false, 
        error: 'Missing user_id or withdrawal_id parameter' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      if (withdrawal_id) {
        const res = await client.query(
          `SELECT w.*, t.transaction_hash AS tx_hash, t.status AS tx_status, t.seqno, t.lt, t.block_number, t.fee, t.confirmed_at
           FROM withdrawals w
           LEFT JOIN ton_transactions t ON t.id = w.blockchain_transaction_id
           WHERE w.id = $1`,
          [withdrawal_id]
        );
        return json({ success: true, withdrawals: res.rows });
      } else {
        const res = await client.query(
          `SELECT w.*, t.transaction_hash AS tx_hash, t.status AS tx_status, t.seqno, t.lt, t.block_number, t.fee, t.confirmed_at
           FROM withdrawals w
           LEFT JOIN ton_transactions t ON t.id = w.blockchain_transaction_id
           WHERE w.user_id = $1
           ORDER BY w.created_at DESC
           LIMIT 10`,
          [user_id]
        );
        return json({ success: true, withdrawals: res.rows });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get withdrawals error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};