import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем общие статистики
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE telegram_id IS NOT NULL) as telegram_users,
        (SELECT COUNT(*) FROM user_wallets WHERE is_connected = true) as connected_wallets,
        (SELECT COALESCE(SUM(amount), 0) FROM star_transactions WHERE status = 'completed') as total_stars_volume,
        (SELECT COUNT(*) FROM game_results) as total_games,
        (SELECT COALESCE(SUM(bet_amount), 0) FROM game_results) as total_bets
    `;
    
    const result = await db.query(statsQuery);
    const stats = result.rows[0];
    
    return json({
      totalUsers: parseInt(stats.total_users) || 0,
      telegramUsers: parseInt(stats.telegram_users) || 0,
      connectedWallets: parseInt(stats.connected_wallets) || 0,
      totalStarsVolume: parseInt(stats.total_stars_volume) || 0,
      totalGames: parseInt(stats.total_games) || 0,
      totalBets: parseFloat(stats.total_bets) || 0
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return json({ 
      totalUsers: 0,
      telegramUsers: 0,
      connectedWallets: 0,
      totalStarsVolume: 0,
      totalGames: 0,
      totalBets: 0
    });
  }
};