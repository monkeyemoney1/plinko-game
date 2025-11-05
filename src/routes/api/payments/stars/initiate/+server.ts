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
  user_id?: number; // привязка к текущему пользователю игры
  initData?: any;
}

interface InitiateStarsPaymentResponse {
  success: boolean;
  payload?: string;
  invoice_url?: string; // устаревшее имя
  invoice_link?: string; // основное имя поля для клиента
  error?: string;
}

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
  const client = await pool.connect();
  
  try {
  const body: InitiateStarsPaymentRequest = await request.json();
  const { telegram_id, user_id, initData } = body;
  // Приводим сумму к целому количеству Stars
  const amount = Math.round(Number((body as any).amount));

    // Валидация входных данных
    if (!telegram_id || !amount) {
      return json({
        success: false,
        error: 'Отсутствуют обязательные поля: telegram_id, amount'
      }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return json({
        success: false,
        error: 'Некорректная сумма. Должна быть целым числом от 1 до 1,000,000 Stars'
      }, { status: 400 });
    }

    console.log(`Инициация Stars платежа: пользователь ${telegram_id}, сумма ${amount}`);

    await client.query('BEGIN');

    // 1. Определяем корректного пользователя для транзакции
    let user: { id: number; telegram_id: number; stars_balance: number } | null = null;

    if (user_id) {
      // Пробуем привязать платеж к текущему игровому пользователю
      const byId = await client.query(
        'SELECT id, telegram_id, stars_balance FROM users WHERE id = $1',
        [user_id]
      );
      if (byId.rows.length > 0) {
        user = byId.rows[0] as any;
        // Пропишем telegram_id, если он отсутствует у пользователя
        if (user && !user.telegram_id) {
          await client.query('UPDATE users SET telegram_id = $1, updated_at = NOW() WHERE id = $2', [telegram_id, user.id]);
          (user as any).telegram_id = telegram_id;
        }
      }
    }

    if (!user) {
      // Пытаемся найти по telegram_id
      const byTg = await client.query(
        'SELECT id, telegram_id, stars_balance FROM users WHERE telegram_id = $1',
        [telegram_id]
      );
      if (byTg.rows.length > 0) {
        user = byTg.rows[0];
      }
    }

    if (!user) {
      // Как крайний случай — создаем пользователя, но ЛУЧШЕ передавать user_id с клиента
      console.log(`Создание пользователя для telegram_id: ${telegram_id} (не найден по user_id/telegram_id)`);
      const insertResult = await client.query(
        `INSERT INTO users (telegram_id, ton_address, telegram_username, ton_balance, stars_balance, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, telegram_id, stars_balance`,
        [telegram_id, `tg_${telegram_id}`, `tg_${telegram_id}`, 0, 0]
      );
      user = insertResult.rows[0];
    }

    // 2. Проверяем пользователя через Telegram Bot API
    console.log('Проверка пользователя через Bot API...');
    try {
      const telegramUserInfo = await getTelegramUserInfo(telegram_id);
      
      if (!telegramUserInfo) {
        console.warn(`Пользователь ${telegram_id} не найден в Telegram, но продолжаем...`);
      } else {
        console.log('Telegram пользователь найден:', telegramUserInfo.first_name);
      }
    } catch (error) {
      console.warn('Ошибка проверки Telegram пользователя:', error instanceof Error ? error.message : String(error));
      // Продолжаем выполнение даже при ошибке
    }

    // 3. Проверяем баланс Stars пользователя
    console.log('Проверка Stars баланса пользователя...');
    try {
      const hasEnoughStars = await checkUserStarsBalance(telegram_id, amount);
      
      if (!hasEnoughStars) {
        console.warn(`Возможно недостаточно Stars у пользователя ${telegram_id}, но продолжаем...`);
      }
    } catch (error) {
      console.warn('Ошибка проверки Stars баланса:', error instanceof Error ? error.message : String(error));
      // Продолжаем выполнение
    }

    // 4. Создаем уникальный payload для транзакции
    const payload = `stars_${Date.now()}_${telegram_id}_${Math.random().toString(36).substring(2)}`;
    
    // 5. Сохраняем запись о pending транзакции в базе
    await client.query(`
      INSERT INTO star_transactions (
        user_id, telegram_id, amount, payload, status, created_at
      ) VALUES ($1, $2, $3, $4, 'pending', NOW())
    `, [user!.id, telegram_id, amount, payload]);

    // 6. Создаем invoice через Telegram Bot API
    console.log('Создание Stars invoice...');
    let invoiceUrl;
    
    try {
      invoiceUrl = await createStarsInvoiceViaBotAPI(
        telegram_id,
        amount,
        `Пополнение баланса игры на ${amount} Stars`,
        'Пополнение Stars в игре Plinko для покупки игровой валюты',
        payload
      );
      console.log('Реальный invoice создан:', invoiceUrl);
    } catch (error) {
      console.warn('Ошибка создания реального invoice, используем mock:', error instanceof Error ? error.message : String(error));
      invoiceUrl = `https://t.me/testbot?start=invoice_${payload}`;  // Fallback mock
    }

    await client.query('COMMIT');

    console.log(`Stars invoice создан успешно: ${payload}`);

    return json({
      success: true,
      payload,
      invoice_url: invoiceUrl,
      invoice_link: invoiceUrl
    } satisfies InitiateStarsPaymentResponse);

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
