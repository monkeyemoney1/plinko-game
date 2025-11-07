import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';
import { 
  WITHDRAWAL_CONFIG, 
  calculateWithdrawalFee, 
  validateWithdrawalLimits,
  shouldAutoProcess,
  requiresManualReview
} from '$lib/config/withdrawals';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, amount, wallet_address } = await request.json();

    // Валидация входных данных
    if (!user_id || !amount || !wallet_address) {
      return json({ 
        success: false, 
        error: 'Missing required fields: user_id, amount, wallet_address' 
      }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) {
      return json({ 
        success: false, 
        error: 'Amount must be greater than 0' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Проверяем пользователя и его баланс
      const userResult = await client.query(
        'SELECT ton_balance, created_at FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      const user = userResult.rows[0];
      const currentBalance = parseFloat(user.ton_balance);

      // Получаем статистику выводов за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyStatsResult = await client.query(
        `SELECT 
          COALESCE(SUM(amount), 0) as daily_amount,
          COUNT(*) as daily_count
         FROM withdrawals 
         WHERE user_id = $1 
         AND created_at >= $2 
         AND status NOT IN ('failed', 'cancelled')`,
        [user_id, today]
      );

      const dailyStats = dailyStatsResult.rows[0];
      const dailyWithdrawn = parseFloat(dailyStats.daily_amount);
      const dailyCount = parseInt(dailyStats.daily_count);

      // Проверяем лимиты
      const limitCheck = validateWithdrawalLimits(withdrawAmount, dailyWithdrawn, dailyCount);
      if (!limitCheck.valid) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: limitCheck.error 
        }, { status: 400 });
      }

      // Нормализуем адрес кошелька пользователя к user-friendly формату (UQ..., non-bounceable)
      let normalizedWalletAddress = wallet_address.trim();
      try {
        const { Address } = await import('@ton/ton');
        normalizedWalletAddress = Address.parse(normalizedWalletAddress).toString({ bounceable: false, testOnly: false, urlSafe: true });
      } catch (e) {
        await client.query('ROLLBACK');
        return json({ success: false, error: 'Invalid TON wallet address' }, { status: 400 });
      }

      // Вычисляем комиссию
      const feeInfo = calculateWithdrawalFee(withdrawAmount);
      
      // Проверяем достаточность баланса с учетом комиссии
      if (currentBalance < feeInfo.grossAmount) {
        await client.query('ROLLBACK');
        return json({ 
          success: false, 
          error: `Недостаточно средств. Требуется: ${feeInfo.grossAmount} TON (включая комиссию ${feeInfo.fee} TON), доступно: ${currentBalance} TON` 
        }, { status: 400 });
      }

      // Определяем статус вывода
      let status: string = WITHDRAWAL_CONFIG.STATUSES.PENDING;
      if (requiresManualReview(withdrawAmount)) {
        status = WITHDRAWAL_CONFIG.STATUSES.MANUAL_REVIEW;
      }

      // Создаем запись о выводе
      const withdrawalResult = await client.query(
        `INSERT INTO withdrawals (
          user_id, amount, wallet_address, status, fee, net_amount, 
          auto_process, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING id, created_at`,
        [
          user_id, 
          feeInfo.grossAmount, 
          normalizedWalletAddress, 
          status,
          feeInfo.fee,
          feeInfo.netAmount,
          shouldAutoProcess(withdrawAmount)
        ]
      );

      const withdrawalId = withdrawalResult.rows[0].id;

      // Резервируем средства (уменьшаем баланс)
      await client.query(
        'UPDATE users SET ton_balance = ton_balance - $1 WHERE id = $2',
        [feeInfo.grossAmount, user_id]
      );

      await client.query('COMMIT');

      console.log(`Withdrawal request created: ID ${withdrawalId}, User ${user_id}, Amount ${feeInfo.grossAmount} TON (net: ${feeInfo.netAmount}, fee: ${feeInfo.fee})`);

      // НЕ отправляем транзакцию в этом запросе синхронно, чтобы избежать таймаутов и 429.
      // Ставим заявку в очередь и триггерим фоновую обработку через auto-process.
      ;(async () => {
        try {
          const origin = new URL(request.url).origin;
          await fetch(`${origin}/api/withdrawals/auto-process`, { method: 'POST' });
        } catch (e) {
          console.warn(`[Withdrawal ${withdrawalId}] Failed to trigger auto-process:`, e);
        }
      })();

      return json({
        success: true,
        withdrawal: {
          id: withdrawalId,
          user_id,
          gross_amount: feeInfo.grossAmount,
          net_amount: feeInfo.netAmount,
          fee: feeInfo.fee,
          wallet_address: normalizedWalletAddress,
          status: status,
          created_at: withdrawalResult.rows[0].created_at
        },
        message: 'Заявка на вывод создана и поставлена в очередь. Обработка начнется автоматически.'
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create withdrawal error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};