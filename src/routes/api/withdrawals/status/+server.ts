import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/db';

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
      let withdrawals;

      if (withdrawal_id) {
        // Получаем конкретный вывод
        const result = await client.query(
          'SELECT * FROM withdrawals WHERE id = $1',
          [withdrawal_id]
        );
        withdrawals = result.rows;
      } else {
        // Получаем все выводы пользователя
        const result = await client.query(
          'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
          [user_id]
        );
        withdrawals = result.rows;
      }

      return json({
        success: true,
        withdrawals: withdrawals.map(w => {
          const fee = 0.1; // фиксированная комиссия
          const amount = parseFloat(w.amount);
          return {
            id: w.id,
            user_id: w.user_id,
            amount,
            fee,
            net_amount: Math.max(amount - fee, 0),
            wallet_address: w.wallet_address,
            status: w.status,
            transaction_hash: w.transaction_hash,
            error_message: w.error_message,
            created_at: w.created_at,
            completed_at: w.completed_at
          };
        })
      });

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