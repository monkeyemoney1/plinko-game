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
import { env as privateEnv } from '$env/dynamic/private';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Используем проверенный helper из предыдущей версии
// server/ton-helper.cjs: createTonClient, openGameWallet, sendTon, waitSeqno
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ton = require(process.cwd() + '/server/ton-helper.cjs');

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
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const accountAgeHours = accountAge / (1000 * 60 * 60);

      // Проверка возраста аккаунта отключена (MIN_ACCOUNT_AGE_HOURS = 0)

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
          wallet_address, 
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

      // Немедленно отправляем средства через блокчейн
      console.log(`[Withdrawal ${withdrawalId}] Starting automatic TON transfer...`);

      await client.query('BEGIN');
      
      try {
        // Обновляем статус на "в обработке"
        await client.query(
          'UPDATE withdrawals SET status = $1 WHERE id = $2',
          [WITHDRAWAL_CONFIG.STATUSES.PROCESSING, withdrawalId]
        );
        
        await client.query('COMMIT');
        
        // Отправляем транзакцию в блокчейн TON через стабильный helper
        const network = privateEnv.TON_NETWORK || 'mainnet';
        const apiKey = privateEnv.TON_API_KEY || privateEnv.TONCENTER_API_KEY;
        
        // Для mainnet можем попробовать без API ключа или с альтернативным endpoint
        let endpoint: string;
        let finalApiKey: string | undefined = apiKey;
        
        if (network === 'mainnet') {
          // Попробуем сначала основной endpoint
          endpoint = 'https://toncenter.com/api/v2/jsonRPC';
          // Если API ключ есть но не работает, попробуем публичный endpoint без ключа
          if (!apiKey) {
            console.log(`[Withdrawal ${withdrawalId}] No API key for mainnet, using public endpoint`);
            endpoint = 'https://tonapi.io/v2/jsonRPC';
            finalApiKey = undefined;
          }
        } else {
          endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC';
        }
        
        const mnemonic = privateEnv.GAME_WALLET_MNEMONIC;

        if (!mnemonic) {
          throw new Error('Wallet mnemonic is not configured');
        }

        console.log(`[Withdrawal ${withdrawalId}] Using network: ${network}, endpoint: ${endpoint}`);
        console.log(`[Withdrawal ${withdrawalId}] API key configured: ${finalApiKey ? 'YES' : 'NO'}`);
        console.log(`[Withdrawal ${withdrawalId}] Mnemonic configured: ${mnemonic ? 'YES' : 'NO'}`);

        let tonClient, sender;
        
        try {
          tonClient = ton.createTonClient({ network, apiKey: finalApiKey, endpoint });
          console.log(`[Withdrawal ${withdrawalId}] TON client created successfully`);
          
          sender = await ton.openGameWallet(tonClient, mnemonic);
          console.log(`[Withdrawal ${withdrawalId}] Game wallet opened successfully`);
        } catch (clientError) {
          // Если не удалось с API ключом, попробуем без него
          if (finalApiKey && network === 'mainnet') {
            console.warn(`[Withdrawal ${withdrawalId}] Failed with API key, trying without:`, clientError instanceof Error ? clientError.message : String(clientError));
            finalApiKey = undefined;
            endpoint = 'https://toncenter.com/api/v2/jsonRPC';
            
            tonClient = ton.createTonClient({ network, apiKey: finalApiKey, endpoint });
            sender = await ton.openGameWallet(tonClient, mnemonic);
            console.log(`[Withdrawal ${withdrawalId}] Successfully connected without API key`);
          } else {
            throw clientError;
          }
        }

        // Проверим баланс кошелька (не блокируем, только информируем)
        try {
          const mod = await import('@ton/ton');
          const balance = await sender.contract.getBalance();
          const balTon = parseFloat(mod.fromNano(balance));
          console.log(`[Withdrawal ${withdrawalId}] Game wallet balance: ${balTon} TON`);
          
          if (balTon < feeInfo.netAmount + 0.1) {
            console.warn(`[Withdrawal ${withdrawalId}] Warning: Low wallet balance. Required: ${feeInfo.netAmount}, Available: ${balTon}`);
          }
        } catch (balanceError) {
          console.warn(`[Withdrawal ${withdrawalId}] Could not check wallet balance:`, balanceError instanceof Error ? balanceError.message : String(balanceError));
        }

        const beforeSeqno = await sender.contract.getSeqno();
        console.log(`[Withdrawal ${withdrawalId}] Current wallet seqno: ${beforeSeqno}, sending ${feeInfo.netAmount} TON to ${wallet_address}`);
        
        await ton.sendTon(tonClient, sender, wallet_address, feeInfo.netAmount, `Withdrawal ${withdrawalId}`);
        console.log(`[Withdrawal ${withdrawalId}] Transaction sent, waiting for confirmation...`);
        
        const confirmed = await ton.waitSeqno(tonClient, sender.contract, beforeSeqno, 60000);
        console.log(`[Withdrawal ${withdrawalId}] Transaction confirmed: ${confirmed}`);

        await client.query('BEGIN');
        
        if (confirmed) {
          // Успешная отправка - обновляем статус на "завершено"
          await client.query(
            `UPDATE withdrawals 
             SET status = $1, 
                 transaction_hash = $2, 
                 completed_at = NOW() 
             WHERE id = $3`,
            [WITHDRAWAL_CONFIG.STATUSES.COMPLETED, `seqno_${beforeSeqno}_w${withdrawalId}`, withdrawalId]
          );
          
          await client.query('COMMIT');
          
          console.log(`[Withdrawal ${withdrawalId}] Successfully completed!`);
          
          return json({
            success: true,
            withdrawal: {
              id: withdrawalId,
              user_id,
              gross_amount: feeInfo.grossAmount,
              net_amount: feeInfo.netAmount,
              fee: feeInfo.fee,
              wallet_address,
              status: WITHDRAWAL_CONFIG.STATUSES.COMPLETED,
              transaction_hash: `seqno_${beforeSeqno}_w${withdrawalId}`,
              created_at: withdrawalResult.rows[0].created_at
            },
            message: `Средства успешно отправлены! Сумма: ${feeInfo.netAmount} TON`
          });
          
        } else {
          // Ошибка отправки - обновляем статус на "ошибка" и возвращаем средства
          await client.query(
            `UPDATE withdrawals 
             SET status = $1, 
                 error_message = $2 
             WHERE id = $3`,
            [WITHDRAWAL_CONFIG.STATUSES.FAILED, 'Transaction not confirmed in time', withdrawalId]
          );
          
          // Возвращаем средства на баланс пользователя
          await client.query(
            'UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2',
            [feeInfo.grossAmount, user_id]
          );
          
          await client.query('COMMIT');
          
          console.error(`[Withdrawal ${withdrawalId}] Failed: not confirmed`);
          
          return json({
            success: false,
            error: 'Ошибка отправки средств: не подтверждена транзакция. Средства возвращены на баланс.'
          }, { status: 500 });
        }
        
      } catch (processError) {
        await client.query('ROLLBACK');
        
        // При ошибке обработки возвращаем средства
        await client.query('BEGIN');
        await client.query(
          `UPDATE withdrawals 
           SET status = $1, 
               error_message = $2 
           WHERE id = $3`,
          [WITHDRAWAL_CONFIG.STATUSES.FAILED, String(processError), withdrawalId]
        );
        await client.query(
          'UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2',
          [feeInfo.grossAmount, user_id]
        );
        await client.query('COMMIT');
        
        console.error(`[Withdrawal ${withdrawalId}] Processing error:`, processError);
        
        return json({
          success: false,
          error: `Ошибка обработки вывода: ${processError instanceof Error ? processError.message : String(processError)}. Средства возвращены на баланс.`
        }, { status: 500 });
      }

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