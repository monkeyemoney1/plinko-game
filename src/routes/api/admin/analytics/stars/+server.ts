import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем все Stars транзакции
    const query = `
      SELECT 
        st.*,
        COALESCE(u.telegram_username, 'User_' || u.id) as username,
        u.telegram_id,
        u.ton_address
      FROM star_transactions st
      JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
      LIMIT 1000
    `;
    
    const result = await db.query(query);
    
    return json(result.rows);
  } catch (error) {
    console.error('Ошибка получения Stars транзакций:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};