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
      const withdrawalResult = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 AND status = $2',
        [withdrawal_id, 'pending']
      );
      if (withdrawalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return json({ success: false, error: 'Withdrawal not found or already processed' }, { status: 404 });
      }
      const withdrawal = withdrawalResult.rows[0];
      const network = privateEnv.TON_NETWORK || 'mainnet';
      const apiKey = privateEnv.TONCENTER_API_KEY || privateEnv.TONAPI_KEY || TONAPI_KEY;
      const endpoint = privateEnv.TONCENTER_ENDPOINT;
      const mnemonic = privateEnv.GAME_WALLET_MNEMONIC;
      let transactionSuccess = false;
      let txHashOrRef = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        if (!mnemonic) {
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
            console.log('[TON MNEMONIC CHECK] Derived address from GAME_WALLET_MNEMONIC (user-friendly):', senderAddr);
            if (privateEnv.GAME_WALLET_ADDRESS) {
              console.log('[TON MNEMONIC CHECK] GAME_WALLET_ADDRESS from .env:', privateEnv.GAME_WALLET_ADDRESS.trim());
            }
          } catch (e) {
            console.warn('Cannot log sender address:', e);
          }
          const beforeSeqno = await sender.contract.getSeqno();
          // Нормализация TON-адреса: если raw (0:...), конвертируем в base64
          let normalizedAddress = withdrawal.wallet_address.trim().replace(/-/g, '');
          try {
            const { Address } = await import('@ton/ton');
            // Всегда приводим к user-friendly mainnet (UQ...)
            normalizedAddress = Address.parse(normalizedAddress).toString({ bounceable: false, testOnly: false, urlSafe: true });
          } catch (e) {
            console.warn('Address normalization failed:', e);
            return json({ success: false, error: 'Invalid TON address format' }, { status: 400 });
          }
          // Логируем адреса отправителя и получателя (user-friendly mainnet)
          const senderAddr = sender.contract.address.toString({ bounceable: false, testOnly: false, urlSafe: true });
          console.log('[TON WITHDRAW]', {
            from: senderAddr,
            to: normalizedAddress,
            amount: withdrawal.amount
          });
          await ton.sendTon(tonClient, sender, normalizedAddress, parseFloat(withdrawal.amount), `Withdrawal ${withdrawal.id}`);
          const confirmed = await ton.waitSeqno(tonClient, sender.contract, beforeSeqno, 60000);
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
            }
          } catch (txApiErr) {
            console.warn('Could not fetch outgoing tx hash:', txApiErr);
          }
          txHashOrRef = realTxHash || `seqno_${beforeSeqno}_w${withdrawal.id}`;
          transactionSuccess = true;
        }
      } catch (txErr) {
        console.error('TON send error:', txErr);
        transactionSuccess = false;
      }
      if (transactionSuccess) {
        await client.query(
          `UPDATE withdrawals SET status = 'completed', transaction_hash = $1, completed_at = NOW() WHERE id = $2`,
          [txHashOrRef, withdrawal.id]
        );
        await client.query('COMMIT');
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
    console.error('Process withdrawal error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};
