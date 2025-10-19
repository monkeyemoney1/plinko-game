import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем игровую статистику
    const statsQuery = `
      SELECT 
        COUNT(*) as total_games,
        COALESCE(SUM(bet_amount), 0) as total_bets,
        COALESCE(SUM(payout), 0) as total_payouts,
        COALESCE(AVG(bet_amount), 0) as average_bet,
        COALESCE(MAX(payout), 0) as biggest_win
      FROM game_results
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Вычисляем преимущество казино
    const totalBets = parseFloat(stats.total_bets) || 0;
    const totalPayouts = parseFloat(stats.total_payouts) || 0;
    const houseEdge = totalBets > 0 ? ((totalBets - totalPayouts) / totalBets) * 100 : 0;
    
    // Получаем последние игры
    const recentGamesQuery = `
      SELECT 
        gr.*,
        (payout - bet_amount) as profit
      FROM game_results gr
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const recentGamesResult = await db.query(recentGamesQuery);
    
    return json({
      stats: {
        totalGames: parseInt(stats.total_games) || 0,
        totalBets: parseFloat(stats.total_bets) || 0,
        totalPayouts: parseFloat(stats.total_payouts) || 0,
        houseEdge,
        averageBet: parseFloat(stats.average_bet) || 0,
        biggestWin: parseFloat(stats.biggest_win) || 0
      },
      recentGames: recentGamesResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения игровой статистики:', error);
    return json({ 
      stats: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseEdge: 0,
        averageBet: 0,
        biggestWin: 0
      },
      recentGames: []
    });
  }
};