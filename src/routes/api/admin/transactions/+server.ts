import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // Получаем Stars транзакции
    const starsQuery = `
      SELECT 
        id,
        user_id,
        telegram_id,
        amount,
        payload as hash,
        status,
        created_at,
        'stars' as type,
        'deposit' as operation
      FROM star_transactions
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const starsResult = await db.query(starsQuery);
    
    // Получаем TON транзакции (если есть таблица)
    let tonTransactions = [];
    try {
      const tonQuery = `
        SELECT 
          id,
          user_id,
          '' as telegram_id,
          amount,
          transaction_hash as hash,
          status,
          created_at,
          'ton' as type,
          'deposit' as operation
        FROM deposits
        ORDER BY created_at DESC
        LIMIT 100
      `;
      const tonResult = await db.query(tonQuery);
      tonTransactions = tonResult.rows;
    } catch (e) {
      console.log('Таблица deposits не найдена, пропускаем TON транзакции');
    }
    
    // Получаем выводы (withdrawals)
    let withdrawalTransactions = [];
    try {
      const withdrawalsQuery = `
        SELECT 
          id,
          user_id,
          '' as telegram_id,
          amount,
          transaction_hash as hash,
          status,
          created_at,
          'ton' as type,
          'withdrawal' as operation,
          wallet_address
        FROM withdrawals
        ORDER BY created_at DESC
        LIMIT 100
      `;
      const withdrawalsResult = await db.query(withdrawalsQuery);
      withdrawalTransactions = withdrawalsResult.rows;
    } catch (e) {
      console.log('Таблица withdrawals не найдена, пропускаем выводы');
    }
    
    // Объединяем все транзакции
    const allTransactions = [...starsResult.rows, ...tonTransactions, ...withdrawalTransactions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return json(allTransactions);
  } catch (error) {
    console.error('Ошибка получения транзакций:', error);
    return json([]);
  }
};