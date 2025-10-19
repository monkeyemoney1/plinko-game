import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  
  if (!id) {
    return json({ error: 'User ID is required' }, { status: 400 });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    return json({ error: 'Invalid user ID' }, { status: 400 });
  }

  // Параметры пагинации
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Максимум 100 записей
  const offset = (page - 1) * limit;

  // Фильтры
  const currency = url.searchParams.get('currency'); // STARS или TON
  const riskLevel = url.searchParams.get('risk_level'); // LOW, MEDIUM, HIGH
  const onlyWins = url.searchParams.get('only_wins') === 'true';

  const client = await pool.connect();
  
  try {
    // Строим WHERE условие
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userId];
    let paramCounter = 2;

    if (currency && ['STARS', 'TON'].includes(currency.toUpperCase())) {
      whereConditions.push(`currency = $${paramCounter}`);
      queryParams.push(currency.toUpperCase());
      paramCounter++;
    }

    if (riskLevel && ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel.toUpperCase())) {
      whereConditions.push(`risk_level = $${paramCounter}`);
      queryParams.push(riskLevel.toUpperCase());
      paramCounter++;
    }

    if (onlyWins) {
      whereConditions.push('is_win = true');
    }

    const whereClause = whereConditions.join(' AND ');

    // Запрос данных
    const dataQuery = `
      SELECT 
        id,
        bet_amount,
        currency,
        risk_level,
        rows_count,
        multiplier,
        payout,
        profit,
        is_win,
        ball_path,
        created_at
      FROM game_bets 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);

    // Запрос общего количества
    const countQuery = `
      SELECT COUNT(*) as total
      FROM game_bets 
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      client.query(dataQuery, queryParams),
      client.query(countQuery, queryParams.slice(0, -2)) // Убираем limit и offset для подсчета
    ]);

    const games = dataResult.rows.map(row => ({
      id: row.id,
      bet_amount: parseFloat(row.bet_amount),
      currency: row.currency,
      risk_level: row.risk_level,
      rows_count: row.rows_count,
      multiplier: parseFloat(row.multiplier),
      payout: parseFloat(row.payout),
      profit: parseFloat(row.profit),
      is_win: row.is_win,
      ball_path: JSON.parse(row.ball_path || '[]'),
      created_at: row.created_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Статистика пользователя
    const statsQuery = `
      SELECT 
        COUNT(*) as total_games,
        COUNT(*) FILTER (WHERE is_win = true) as total_wins,
        COALESCE(SUM(bet_amount), 0) as total_wagered,
        COALESCE(SUM(payout), 0) as total_payout,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(MAX(multiplier), 0) as max_multiplier
      FROM game_bets 
      WHERE user_id = $1
    `;

    const statsResult = await client.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];

    const winRate = stats.total_games > 0 ? 
      (parseFloat(stats.total_wins) / parseFloat(stats.total_games) * 100).toFixed(2) : '0.00';

    return json({
      success: true,
      games,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      stats: {
        total_games: parseInt(stats.total_games),
        total_wins: parseInt(stats.total_wins),
        win_rate: parseFloat(winRate),
        total_wagered: parseFloat(stats.total_wagered),
        total_payout: parseFloat(stats.total_payout),
        total_profit: parseFloat(stats.total_profit),
        max_multiplier: parseFloat(stats.max_multiplier)
      }
    });

  } catch (error) {
    console.error('Games history fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    client.release();
  }
};