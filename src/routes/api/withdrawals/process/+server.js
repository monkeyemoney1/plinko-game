import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { env as privateEnv } from '$env/dynamic/private';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ton = require(process.cwd() + '/server/ton-helper.cjs');

// Получаем переменные окружения динамически
const GAME_WALLET_ADDRESS = privateEnv.GAME_WALLET_ADDRESS || 'UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX';
const TONAPI_KEY = privateEnv.TON_API_KEY || '';

export const POST = async ({ request }) => {
  try {
    const { withdrawal_id } = await request.json();
    if (!withdrawal_id) {
      return json({ success: false, error: 'Missing withdrawal_id' }, { status: 400 });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Принимаем как 'pending', так и 'processing' (для повторной обработки)
      const withdrawalResult = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE',
        [withdrawal_id]
      );
      
      if (withdrawalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ success: false, error: 'Withdrawal not found or already processed' }, { status: 404 });
      }
      
      const withdrawal = withdrawalResult.rows[0];
      
      // Проверяем идемпотентность - если уже completed, просто возвращаем успех
      if (withdrawal.status === 'completed') {
        await client.query('ROLLBACK');
        console.log(`[PROCESS] Withdrawal already completed id=${withdrawal.id}`);
        return json({ success: true, withdrawal: { id: withdrawal.id, status: 'completed', transaction_hash: withdrawal.transaction_hash, amount: withdrawal.amount, wallet_address: withdrawal.wallet_address }, message: 'Withdrawal already completed' });
      }
      
      // Обновляем статус на 'processing' перед отправкой
      await client.query('UPDATE withdrawals SET status = $1 WHERE id = $2', ['processing', withdrawal.id]);
      await client.query('COMMIT');
      console.log(`[PROCESS] Start withdrawal id=${withdrawal.id} amount=${withdrawal.amount}`);
      const network = privateEnv.TON_NETWORK || 'mainnet';
      const apiKey = privateEnv.TONCENTER_API_KEY || privateEnv.TONAPI_KEY || TONAPI_KEY;
      const endpoint = privateEnv.TONCENTER_ENDPOINT;
      const mnemonic = privateEnv.GAME_WALLET_MNEMONIC;
      let transactionSuccess = false;
      let txHashOrRef = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        if (!mnemonic) {
          console.warn(`[PROCESS] Missing GAME_WALLET_MNEMONIC. Returning funds id=${withdrawal.id}`);
          await client.query('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2', [withdrawal.amount, withdrawal.user_id]);
          await client.query(
            `UPDATE withdrawals SET status = 'failed', error_message = 'Wallet not configured for real withdrawals' WHERE id = $1`,
            [withdrawal.id]
          );
          await client.query('ROLLBACK');
          return json({ success: false, error: 'Real TON withdrawals are not configured. Contact support.' }, { status: 503 });
        } else {
          const tonClient = ton.createTonClient({ network, apiKey, endpoint });
          const sender = await ton.openGameWallet(tonClient, mnemonic);
          // Логируем адрес, вычисленный из сид-фразы (user-friendly mainnet)
          try {
            const { Address } = await import('@ton/ton');
            const senderAddr = sender.contract.address.toString({ bounceable: false, testOnly: false, urlSafe: true });
            console.log(`[PROCESS] Wallet opened address=${senderAddr}`);
            if (privateEnv.GAME_WALLET_ADDRESS) {
              console.log('[TON MNEMONIC CHECK] GAME_WALLET_ADDRESS from .env:', privateEnv.GAME_WALLET_ADDRESS.trim());
            }
          } catch (e) {
            console.warn('[PROCESS] Cannot log sender address:', e);
          }
          const beforeSeqno = await sender.contract.getSeqno();
          console.log(`[PROCESS] Current seqno=${beforeSeqno}`);
          // Нормализация TON-адреса: если raw (0:...), конвертируем в base64
          let normalizedAddress = withdrawal.wallet_address.trim().replace(/-/g, '');
          try {
            const { Address } = await import('@ton/ton');
            // Всегда приводим к user-friendly mainnet (UQ...)
            normalizedAddress = Address.parse(normalizedAddress).toString({ bounceable: false, testOnly: false, urlSafe: true });
          } catch (e) {
            console.warn('[PROCESS] Address normalization failed:', e);
            return json({ success: false, error: 'Invalid TON address format' }, { status: 400 });
          }
          // Логируем адреса отправителя и получателя (user-friendly mainnet)
          const senderAddr = sender.contract.address.toString({ bounceable: false, testOnly: false, urlSafe: true });
          console.log(`[PROCESS] Sending amount=${withdrawal.amount} from=${senderAddr} to=${normalizedAddress}`);
          await ton.sendTon(tonClient, sender, normalizedAddress, parseFloat(withdrawal.amount), `Withdrawal ${withdrawal.id}`);
          console.log(`[PROCESS] Sent. Waiting confirmation...`);
          const confirmed = await ton.waitSeqno(tonClient, sender.contract, beforeSeqno, 60000);
          console.log(`[PROCESS] Confirmation result=${confirmed}`);
          if (!confirmed) {
            throw new Error('Seqno confirmation timeout');
          }
          let realTxHash = null;
          try {
            const txApiUrl = `https://tonapi.io/v2/blockchain/accounts/${GAME_WALLET_ADDRESS}/transactions?limit=10`;
            const txApiRes = await fetch(txApiUrl, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            });
            if (txApiRes.ok) {
              const txApiData = await txApiRes.json();
              if (txApiData.transactions) {
                for (const tx of txApiData.transactions) {
                  if (tx.out_msgs && tx.out_msgs.length > 0) {
                    for (const out of tx.out_msgs) {
                      if (
                        out.destination === withdrawal.wallet_address &&
                        Math.abs(parseFloat(out.value) / 1e9 - parseFloat(withdrawal.amount)) < 0.01
                      ) {
                        realTxHash = tx.hash;
                        break;
                      }
                    }
                  }
                  if (realTxHash) break;
                }
              }
              console.log(`[PROCESS] Tx hash lookup status=${txApiRes.status} found=${!!realTxHash}`);
            }
          } catch (txApiErr) {
            console.warn('[PROCESS] Could not fetch outgoing tx hash:', txApiErr);
          }
          txHashOrRef = realTxHash || `seqno_${beforeSeqno}_w${withdrawal.id}`;
          transactionSuccess = true;
        }
      } catch (txErr) {
        console.error('[PROCESS] TON send error:', txErr);
        transactionSuccess = false;
      }
      
      // Начинаем новую транзакцию для обновления статуса
      await client.query('BEGIN');
      
      if (transactionSuccess) {
        await client.query(
          `UPDATE withdrawals SET status = 'completed', transaction_hash = $1, completed_at = NOW() WHERE id = $2`,
          [txHashOrRef, withdrawal.id]
        );
        await client.query('COMMIT');
        console.log(`[PROCESS] Success id=${withdrawal.id} hash=${txHashOrRef}`);
        return json({
          success: true,
          withdrawal: {
            id: withdrawal.id,
            status: 'completed',
            transaction_hash: txHashOrRef,
            amount: withdrawal.amount,
            wallet_address: withdrawal.wallet_address
          },
          message: 'Withdrawal completed successfully!'
        });
      } else {
        await client.query('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2', [withdrawal.amount, withdrawal.user_id]);
        await client.query(
          `UPDATE withdrawals SET status = 'failed', error_message = 'Transaction failed' WHERE id = $1`,
          [withdrawal.id]
        );
        await client.query('COMMIT');
        console.warn(`[PROCESS] Failed id=${withdrawal.id} funds returned`);
        return json({
          success: false,
          error: 'Transaction failed. Funds returned to your balance.',
          withdrawal: {
            id: withdrawal.id,
            status: 'failed'
          }
        });
      }
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[PROCESS] Process withdrawal fatal error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};
