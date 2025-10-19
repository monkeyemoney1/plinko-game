import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем информацию о регистрациях кошельков с данными пользователей
    const query = `
      SELECT 
        uw.id,
        uw.user_id,
        u.username,
        u.telegram_id,
        uw.wallet_address,
        uw.is_connected,
        uw.created_at as registration_date
      FROM user_wallets uw
      JOIN users u ON uw.user_id = u.id
      ORDER BY uw.created_at DESC
    `;
    
    const result = await db.query(query);
    
    return json(result.rows);
  } catch (error) {
    console.error('Ошибка получения аналитики кошельков:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};