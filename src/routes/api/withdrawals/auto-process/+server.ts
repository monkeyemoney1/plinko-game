import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { WITHDRAWAL_CONFIG } from '$lib/config/withdrawals';

// POST - автоматическая обработка очереди выплат
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const origin = new URL(request.url).origin;
    console.log('[AUTO-PROCESS] Starting auto-process, origin:', origin);
    
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
      console.log(`[AUTO-PROCESS] Found ${pendingWithdrawals.length} pending withdrawals:`, pendingWithdrawals.map(w => ({ id: w.id, amount: w.amount, wallet: w.wallet_address })));
      
      if (pendingWithdrawals.length === 0) {
        console.log('[AUTO-PROCESS] No pending withdrawals to process');
        return json({ success: true, message: 'No pending withdrawals to process' });
      }
      
      const processedResults = [];

      for (const withdrawal of pendingWithdrawals) {
        console.log(`[AUTO-PROCESS] Processing withdrawal ID ${withdrawal.id}, amount ${withdrawal.amount} TON to ${withdrawal.wallet_address}`);
        try {
          // Обновляем статус на "processing"
          await client.query(
            'UPDATE withdrawals SET status = $1 WHERE id = $2',
            [WITHDRAWAL_CONFIG.STATUSES.PROCESSING, withdrawal.id]
          );
          console.log(`[AUTO-PROCESS] Updated withdrawal ${withdrawal.id} status to processing`);

          // Вызываем процессинг через абсолютный origin, чтобы гарантированно попасть на серверный маршрут
          try {
            const processUrl = `${origin}/api/withdrawals/process`;
            console.log(`[AUTO-PROCESS] Calling ${processUrl} for withdrawal ${withdrawal.id}`);
            const processRes = await fetch(processUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ withdrawal_id: withdrawal.id })
            });
            const text = await processRes.text();
            console.log(`[AUTO-PROCESS] Process response for ${withdrawal.id}: status=${processRes.status}, body=${text.substring(0, 500)}`);
            let jsonBody = null;
            try { jsonBody = JSON.parse(text); } catch {}
            if (processRes.ok) {
              console.log(`[AUTO-PROCESS] Successfully processed withdrawal ${withdrawal.id}`, jsonBody);
              processedResults.push({
                id: withdrawal.id,
                success: jsonBody?.success ?? true,
                message: jsonBody?.message || 'Processed successfully',
                detail: jsonBody
              });
            } else {
              console.error(`[AUTO-PROCESS] Process API failed for ${withdrawal.id}:`, processRes.status, text);
              processedResults.push({
                id: withdrawal.id,
                success: false,
                message: jsonBody?.error || `Process API call failed with status ${processRes.status}`,
                detail: jsonBody
              });
            }
          } catch (fetchErr) {
            console.error(`[AUTO-PROCESS] Fetch to /api/withdrawals/process failed for ${withdrawal.id}:`, fetchErr);
            // Возвращаем статус обратно к pending в случае ошибки
            await client.query(
              'UPDATE withdrawals SET status = $1, error_message = $2 WHERE id = $3',
              [WITHDRAWAL_CONFIG.STATUSES.PENDING, 'Auto-process fetch failed', withdrawal.id]
            );
            processedResults.push({
              id: withdrawal.id,
              success: false,
              message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
            });
          }

        } catch (error) {
          console.error(`[AUTO-PROCESS] Failed to process withdrawal ${withdrawal.id}:`, error);
          
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

      console.log(`[AUTO-PROCESS] Completed processing ${pendingWithdrawals.length} withdrawals, results:`, processedResults);
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