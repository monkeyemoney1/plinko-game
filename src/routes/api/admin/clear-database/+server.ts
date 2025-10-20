import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { confirmationCode } = await request.json();
    
    // Проверяем код подтверждения для безопасности
    if (confirmationCode !== 'CLEAR_ALL_DATA_2282211') {
      return json({ 
        success: false, 
        error: 'Неверный код подтверждения' 
      }, { status: 403 });
    }

    // ПОЛНАЯ ОЧИСТКА ВСЕХ ТАБЛИЦ - удаляем абсолютно все данные
    await db.query('BEGIN');

    try {
      // Очищаем игровые данные
      await db.query('TRUNCATE TABLE game_bets RESTART IDENTITY CASCADE');
      
      // Очищаем транзакции
      await db.query('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
      
      // Очищаем депозиты
      await db.query('TRUNCATE TABLE deposits RESTART IDENTITY CASCADE');
      await db.query('TRUNCATE TABLE pending_deposits RESTART IDENTITY CASCADE');
      
      // Очищаем транзакции звёзд
      await db.query('TRUNCATE TABLE star_transactions RESTART IDENTITY CASCADE');
      
      // Очищаем кошельки
      await db.query('TRUNCATE TABLE user_wallets RESTART IDENTITY CASCADE');
      
      // Очищаем withdrawals (выводы средств)
      await db.query('TRUNCATE TABLE withdrawals RESTART IDENTITY CASCADE');
      
      // Очищаем blockchain транзакции
      await db.query('TRUNCATE TABLE blockchain_transactions RESTART IDENTITY CASCADE');
      
      // Очищаем сессии
      await db.query('TRUNCATE TABLE sessions RESTART IDENTITY CASCADE');
      
      // УДАЛЯЕМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ - полный вайп
      await db.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

      await db.query('COMMIT');

      return json({ 
        success: true, 
        message: 'База данных полностью очищена! Все пользователи и данные удалены.',
        cleared: {
          users: true,
          game_bets: true,
          transactions: true,
          deposits: true,
          pending_deposits: true,
          star_transactions: true,
          user_wallets: true,
          withdrawals: true,
          blockchain_transactions: true,
          sessions: true
        }
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Ошибка очистки базы данных:', error);
    return json({ 
      success: false, 
      error: 'Ошибка при очистке базы данных',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
