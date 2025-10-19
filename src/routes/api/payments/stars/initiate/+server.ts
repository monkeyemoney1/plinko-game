/**
 * API для инициации Telegram Stars платежей
 * Проверяет пользователя, создает уникальный payload, возвращает invoice
 */
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { pool } from '$lib/server/db';
import {
  checkUserStarsBalance,
  createStarsInvoiceViaBotAPI,
  getTelegramUserInfo
} from '$lib/telegram/botAPI';

// Типы для запроса и ответа
interface InitiateStarsPaymentRequest {
  telegram_id: number;
  amount: number;
  initData?: any;
}

interface InitiateStarsPaymentResponse {
  success: boolean;
  payload?: string;
  invoice_url?: string;
  error?: string;
}

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    const body: InitiateStarsPaymentRequest = await request.json();
    const { telegram_id, amount, initData } = body;

    // Валидация входных данных
    if (!telegram_id || !amount) {
      return json({
        success: false,
        error: 'Отсутствуют обязательные поля: telegram_id, amount'
      }, { status: 400 });
    }

    if (amount <= 0 || amount > 10000) {
      return json({
        success: false,
        error: 'Некорректная сумма. Должна быть от 1 до 10000 Stars'
      }, { status: 400 });
    }

    console.log(`Инициация Stars платежа: пользователь ${telegram_id}, сумма ${amount}`);

    await client.query('BEGIN');

    // 1. Проверяем существование пользователя в нашей базе
    let userResult = await client.query(
      'SELECT id, telegram_id, stars_balance FROM users WHERE telegram_id = $1',
      [telegram_id]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Создаем тестового пользователя автоматически
      console.log(`Создание тестового пользователя для telegram_id: ${telegram_id}`);
      
      const insertResult = await client.query(`
        INSERT INTO users (telegram_id, username, ton_balance, stars_balance, balance, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, telegram_id, stars_balance
      `, [telegram_id, `user_${telegram_id}`, 0, 0, 100]);
      
      user = insertResult.rows[0];
      console.log('Тестовый пользователь создан:', user);
    } else {
      user = userResult.rows[0];
    }

    // 2. Проверяем пользователя через Telegram Bot API
    console.log('Проверка пользователя через Bot API...');
    const telegramUserInfo = await getTelegramUserInfo(telegram_id);
    
    if (!telegramUserInfo) {
      await client.query('ROLLBACK');
      return json({
        success: false,
        error: 'Пользователь не найден в Telegram'
      }, { status: 404 });
    }

    // 3. Проверяем баланс Stars пользователя (теоретически)
    console.log('Проверка Stars баланса пользователя...');
    const hasEnoughStars = await checkUserStarsBalance(telegram_id, amount);
    
    if (!hasEnoughStars) {
      await client.query('ROLLBACK');
      return json({
        success: false,
        error: 'Недостаточно Stars для пополнения. Пополните баланс Stars в Telegram.'
      }, { status: 400 });
    }

    // 4. Создаем уникальный payload для транзакции
    const payload = `stars_${Date.now()}_${telegram_id}_${Math.random().toString(36).substring(2)}`;
    
    // 5. Сохраняем запись о pending транзакции в базе
    await client.query(`
      INSERT INTO star_transactions (
        user_id, telegram_id, amount, payload, status, created_at
      ) VALUES ($1, $2, $3, $4, 'pending', NOW())
    `, [user.id, telegram_id, amount, payload]);

    // 6. Создаем invoice через Telegram Bot API
    console.log('Создание Stars invoice...');
    const invoiceUrl = await createStarsInvoiceViaBotAPI(
      telegram_id,
      amount,
      `Пополнение баланса игры на ${amount} Stars`,
      'Пополнение Stars в игре Plinko для покупки игровой валюты',
      payload
    );

    await client.query('COMMIT');

    console.log(`Stars invoice создан успешно: ${payload}`);

    return json({
      success: true,
      payload,
      invoice_url: invoiceUrl
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка инициации Stars платежа:', error);
    
    return json({
      success: false,
      error: 'Внутренняя ошибка сервера при инициации платежа'
    }, { status: 500 });

  } finally {
    client.release();
  }
};
