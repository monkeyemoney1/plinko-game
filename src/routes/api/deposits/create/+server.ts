import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, amount, wallet_address } = await request.json();

    if (!user_id || !amount || !wallet_address) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isFinite(amount) || amount <= 0) {
      return json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Проверяем формат адреса кошелька (должен быть валидным TON адресом)
    if (typeof wallet_address !== 'string' || wallet_address.length < 44) {
      console.log('Invalid wallet address:', wallet_address, 'Length:', wallet_address?.length);
      return json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Проверяем существование пользователя
    const client = await pool.connect();
    try {
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [user_id]);
      if (userCheck.rows.length === 0) {
        return json({ error: 'User not found' }, { status: 404 });
      }
    } finally {
      client.release();
    }

    // Возвращаем параметры для TON Connect, запись не создаём!
    return json({
      success: true,
      deposit_params: {
        user_id,
        wallet_address,
        amount: Number(amount)
      }
    });

  } catch (error) {
    console.error('Deposit creation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};