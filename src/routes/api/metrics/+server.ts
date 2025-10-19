import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logger.js';

/**
 * Metrics endpoint for monitoring and analytics
 */
export async function GET() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        environment: env.NODE_ENV || 'development',
        version: '1.1.0'
      },
      game: await getGameMetrics(),
      users: await getUserMetrics(),
      transactions: await getTransactionMetrics()
    };

    return json(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed', { error: error instanceof Error ? error.message : error });
    
    return json({
      error: 'Failed to fetch metrics',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Get game-related metrics
 */
async function getGameMetrics() {
  try {
    const { pool } = await import('$lib/server/db.js');
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_win = true THEN 1 END) as total_wins,
        COALESCE(AVG(bet_amount), 0) as avg_bet_amount,
        COALESCE(SUM(bet_amount), 0) as total_wagered,
        COALESCE(SUM(payout), 0) as total_payout,
        COALESCE(SUM(profit), 0) as total_profit,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as games_last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as games_last_hour
      FROM game_bets
    `);

    const stats = result.rows[0];
    
    return {
      totalGames: parseInt(stats.total_games),
      totalWins: parseInt(stats.total_wins),
      winRate: stats.total_games > 0 ? (stats.total_wins / stats.total_games * 100).toFixed(2) : 0,
      avgBetAmount: parseFloat(stats.avg_bet_amount).toFixed(2),
      totalWagered: parseFloat(stats.total_wagered).toFixed(2),
      totalPayout: parseFloat(stats.total_payout).toFixed(2),
      totalProfit: parseFloat(stats.total_profit).toFixed(2),
      gamesLast24h: parseInt(stats.games_last_24h),
      gamesLastHour: parseInt(stats.games_last_hour)
    };
  } catch (error) {
    logger.error('Failed to fetch game metrics', { error });
    return {
      error: 'Failed to fetch game metrics'
    };
  }
}

/**
 * Get user-related metrics
 */
async function getUserMetrics() {
  try {
    const { pool } = await import('$lib/server/db.js');
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 hour' THEN 1 END) as active_users_1h,
        COALESCE(SUM(stars_balance), 0) as total_stars_balance,
        COALESCE(SUM(ton_balance), 0) as total_ton_balance
      FROM users
    `);

    const stats = result.rows[0];
    
    return {
      totalUsers: parseInt(stats.total_users),
      newUsers24h: parseInt(stats.new_users_24h),
      activeUsers24h: parseInt(stats.active_users_24h),
      activeUsers1h: parseInt(stats.active_users_1h),
      totalStarsBalance: parseFloat(stats.total_stars_balance).toFixed(2),
      totalTonBalance: parseFloat(stats.total_ton_balance).toFixed(9)
    };
  } catch (error) {
    logger.error('Failed to fetch user metrics', { error });
    return {
      error: 'Failed to fetch user metrics'
    };
  }
}

/**
 * Get transaction-related metrics
 */
async function getTransactionMetrics() {
  try {
    const { pool } = await import('$lib/server/db.js');
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_transactions,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_transactions,
        COUNT(CASE WHEN transaction_type = 'DEPOSIT' THEN 1 END) as total_deposits,
        COUNT(CASE WHEN transaction_type = 'WITHDRAWAL' THEN 1 END) as total_withdrawals,
        COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' AND status = 'CONFIRMED' THEN amount END), 0) as total_deposit_amount,
        COALESCE(SUM(CASE WHEN transaction_type = 'WITHDRAWAL' AND status = 'CONFIRMED' THEN amount END), 0) as total_withdrawal_amount
      FROM ton_transactions
    `);

    const stats = result.rows[0];
    
    return {
      totalTransactions: parseInt(stats.total_transactions),
      confirmedTransactions: parseInt(stats.confirmed_transactions),
      pendingTransactions: parseInt(stats.pending_transactions),
      failedTransactions: parseInt(stats.failed_transactions),
      totalDeposits: parseInt(stats.total_deposits),
      totalWithdrawals: parseInt(stats.total_withdrawals),
      totalDepositAmount: parseFloat(stats.total_deposit_amount || 0).toFixed(9),
      totalWithdrawalAmount: parseFloat(stats.total_withdrawal_amount || 0).toFixed(9)
    };
  } catch (error) {
    logger.error('Failed to fetch transaction metrics', { error });
    return {
      error: 'Failed to fetch transaction metrics'
    };
  }
}