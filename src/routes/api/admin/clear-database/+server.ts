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
    const cleared: Record<string, boolean> = {};
    const errors: string[] = [];

    // Список таблиц для очистки в правильном порядке (учитывая зависимости)
    const tablesToClear = [
      'game_bets',
      'transactions', 
      'deposits',
      'pending_deposits',
      'star_transactions',
      'user_wallets',
      'withdrawals',
      'blockchain_transactions',
      'sessions',
      'users' // Пользователи в конце, чтобы избежать проблем с внешними ключами
    ];

    console.log('Начинаем очистку базы данных...');

    for (const table of tablesToClear) {
      try {
        await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        cleared[table] = true;
        console.log(`✓ Таблица ${table} очищена`);
      } catch (error) {
        // Если таблица не существует или есть другая ошибка - пропускаем
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠ Не удалось очистить таблицу ${table}: ${errorMessage}`);
        cleared[table] = false;
        errors.push(`${table}: ${errorMessage}`);
        
        // Проверяем, не является ли это критической ошибкой
        if (!errorMessage.includes('does not exist') && !errorMessage.includes('не существует')) {
          // Критическая ошибка - прерываем
          throw error;
        }
      }
    }

    const successCount = Object.values(cleared).filter(v => v === true).length;
    const totalCount = tablesToClear.length;

    console.log(`Очистка завершена: ${successCount}/${totalCount} таблиц`);

    return json({ 
      success: true, 
      message: `База данных очищена! Очищено ${successCount} из ${totalCount} таблиц.`,
      cleared,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Критическая ошибка очистки базы данных:', error);
    return json({ 
      success: false, 
      error: 'Критическая ошибка при очистке базы данных',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
