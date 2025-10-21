import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/db';
import { WITHDRAWAL_CONFIG } from '$lib/config/withdrawals';

// POST - автоматическая обработка очереди выплат
export const POST: RequestHandler = async () => {
  try {
    const client = await pool.connect();
    
    try {
      // Получаем выплаты для автообработки
      const result = await client.query(`
        SELECT * FROM withdrawals 
        WHERE status = $1 
        AND auto_process = true
        ORDER BY created_at ASC
        LIMIT 10
      `, [WITHDRAWAL_CONFIG.STATUSES.PENDING]);

      const pendingWithdrawals = result.rows;
      const processedResults = [];

      for (const withdrawal of pendingWithdrawals) {
        try {
          // Обновляем статус на "processing"
          await client.query(
            'UPDATE withdrawals SET status = $1 WHERE id = $2',
            [WITHDRAWAL_CONFIG.STATUSES.PROCESSING, withdrawal.id]
          );

          // Вызываем процессинг
          const processRes = await fetch('/api/withdrawals/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ withdrawal_id: withdrawal.id })
          });

          if (processRes.ok) {
            const processData = await processRes.json();
            processedResults.push({
              id: withdrawal.id,
              success: processData.success,
              message: processData.message || 'Processed successfully'
            });
          } else {
            processedResults.push({
              id: withdrawal.id,
              success: false,
              message: 'Process API call failed'
            });
          }

        } catch (error) {
          console.error(`Failed to process withdrawal ${withdrawal.id}:`, error);
          
          // Возвращаем статус обратно к pending в случае ошибки
          await client.query(
            'UPDATE withdrawals SET status = $1, error_message = $2 WHERE id = $3',
            [WITHDRAWAL_CONFIG.STATUSES.PENDING, 'Auto-process failed', withdrawal.id]
          );
          
          processedResults.push({
            id: withdrawal.id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return json({
        success: true,
        processed_count: pendingWithdrawals.length,
        results: processedResults
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Auto-process queue error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};

// GET - статистика очереди автообработки
export const GET: RequestHandler = async () => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM withdrawals 
        WHERE auto_process = true
        AND status IN ($1, $2, $3)
        GROUP BY status
      `, [
        WITHDRAWAL_CONFIG.STATUSES.PENDING,
        WITHDRAWAL_CONFIG.STATUSES.PROCESSING,
        WITHDRAWAL_CONFIG.STATUSES.MANUAL_REVIEW
      ]);

      const stats = result.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          total_amount: parseFloat(row.total_amount)
        };
        return acc;
      }, {});

      return json({
        success: true,
        queue_stats: stats,
        auto_process_enabled: WITHDRAWAL_CONFIG.AUTO_PROCESS_ENABLED,
        auto_process_threshold: WITHDRAWAL_CONFIG.AUTO_PROCESS_THRESHOLD
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Queue stats error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};