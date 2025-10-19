import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { TONAPI_KEY, GAME_WALLET_ADDRESS } from '$env/static/private';
import type { RequestHandler } from './$types';

// Функция для нормализации адресов TON
function normalizeAddress(address: string): string[] {
  // Возвращаем массив возможных форматов адреса
  const normalized = [];
  
  if (address.startsWith('UQ') || address.startsWith('EQ')) {
    // Это base64url формат, добавляем его как есть
    normalized.push(address);
    
    // Также попробуем конвертировать в raw формат (0:...)
    try {
      // Простое преобразование для тестирования
      const withoutPrefix = address.substring(2);
      // Это упрощенная версия, в реальности нужна библиотека @ton/core
      normalized.push(address); // пока оставляем как есть
    } catch (e) {
      // Игнорируем ошибки конвертации
    }
  } else if (address.startsWith('0:')) {
    // Это raw формат
    normalized.push(address);
  } else {
    // Неизвестный формат, добавляем как есть
    normalized.push(address);
  }
  
  return normalized;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, amount, wallet_address } = await request.json();
    console.log('Deposit verification request:', { user_id, amount, wallet_address });

    if (!user_id || !amount || !wallet_address) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isFinite(amount) || amount <= 0) {
      return json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Проверяем существование пользователя
    const client = await pool.connect();
    try {
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [user_id]);
      if (userCheck.rows.length === 0) {
        return json({ error: 'User not found' }, { status: 404 });
      }

      // Получаем последние 50 транзакций игрового кошелька через TonAPI
      const tonApiUrl = `https://tonapi.io/v2/blockchain/accounts/${GAME_WALLET_ADDRESS}/transactions?limit=50`;
      const tonApiHeaders = {
        'Authorization': `Bearer ${TONAPI_KEY}`,
        'Content-Type': 'application/json'
      };
      let transactionsData = null;
      try {
        const txRes = await fetch(tonApiUrl, { headers: tonApiHeaders });
        if (txRes.ok) {
          const txJson = await txRes.json();
          transactionsData = txJson.transactions || [];
        } else {
          console.error('TonAPI error:', await txRes.text());
        }
      } catch (e) {
        console.error('TonAPI fetch error:', e);
      }

      // Если TonAPI не дал результат — пробуем TonCenter
      if (!transactionsData || transactionsData.length === 0) {
        try {
          const tonCenterUrl = `https://toncenter.com/api/v2/getTransactions?address=${GAME_WALLET_ADDRESS}&limit=50`;
          const txRes = await fetch(tonCenterUrl);
          if (txRes.ok) {
            const txJson = await txRes.json();
            transactionsData = txJson.result || [];
          } else {
            console.error('TonCenter error:', await txRes.text());
          }
        } catch (e) {
          console.error('TonCenter fetch error:', e);
        }
      }

      if (!transactionsData || transactionsData.length === 0) {
        return json({
          success: false,
          confirmed: false,
          message: 'No transactions found for game wallet',
          error: 'NO_TRANSACTIONS'
        });
      }

      // Ищем подходящую транзакцию
      const depositAmountNano = Math.floor(Number(amount) * 1e9);
      const tolerance = 1e7; // 0.01 TON
      let foundTx = null;
      for (const tx of transactionsData) {
        // Для TonAPI формат
        const inMsg = tx.in_msg || tx.inMessage;
        if (!inMsg) continue;
        const txValue = parseInt(inMsg.value || '0');
        // Универсально приводим txSource к строке
        let txSourceRaw = inMsg.source || inMsg.src || '';
        let txSource = '';
        if (typeof txSourceRaw === 'string') {
          txSource = txSourceRaw;
        } else if (txSourceRaw && typeof txSourceRaw === 'object') {
          txSource = txSourceRaw.address || txSourceRaw.raw || '';
        }
        // Проверяем сумму и адрес отправителя
        if (
          Math.abs(txValue - depositAmountNano) <= tolerance &&
          txSource.replace(/^0:/, '') === wallet_address.replace(/^0:/, '')
        ) {
          foundTx = tx;
          break;
        }
      }

      if (foundTx) {
        // Создаём запись о депозите только если транзакция найдена
        const depositResult = await client.query(
          'INSERT INTO deposits (user_id, wallet_address, amount, status, confirmed_at, transaction_hash) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *',
          [user_id, wallet_address, amount, 'confirmed', foundTx.hash]
        );
        // Обновляем баланс пользователя
        await client.query(
          'UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2',
          [amount, user_id]
        );
        return json({
          success: true,
          confirmed: true,
          deposit: depositResult.rows[0],
          message: 'Deposit confirmed and balance updated.'
        });
      } else {
        return json({
          success: false,
          confirmed: false,
          message: 'No matching TON transaction found. Deposit not created.'
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Deposit verification error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};