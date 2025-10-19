import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем пользователей с расширенной аналитикой
    const query = `
      SELECT 
        u.*,
        COALESCE(wallet_stats.wallet_count, 0) as wallet_count,
        COALESCE(stars_stats.transaction_count, 0) as star_transactions_count,
        COALESCE(stars_stats.total_spent, 0) as total_stars_spent,
        COALESCE(stars_stats.total_received, 0) as total_stars_received,
        u.updated_at as last_activity
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as wallet_count
        FROM user_wallets 
        GROUP BY user_id
      ) wallet_stats ON u.id = wallet_stats.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_spent,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received
        FROM star_transactions 
        GROUP BY user_id
      ) stars_stats ON u.id = stars_stats.user_id
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query);
    
    return json(result.rows);
  } catch (error) {
    console.error('Ошибка получения аналитики пользователей:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};