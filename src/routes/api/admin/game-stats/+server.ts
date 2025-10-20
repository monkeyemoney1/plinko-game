import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * Обеспечивает существование таблицы game_results
 */
async function ensureGameResultsTableExists(): Promise<void> {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS game_results (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          bet_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          payout DECIMAL(10,2) NOT NULL DEFAULT 0,
          multiplier DECIMAL(10,4) NOT NULL DEFAULT 0,
          outcome VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_created_at ON game_results(created_at);
    `;
    
    await db.query(createTableSQL);
  } catch (error) {
    console.error('Ошибка создания таблицы game_results:', error);
  }
}

export const GET: RequestHandler = async () => {
  try {
    // Создаем таблицу game_results если её нет
    await ensureGameResultsTableExists();
    
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