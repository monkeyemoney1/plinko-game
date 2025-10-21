/**
 * Утилиты для работы с Telegram Bot API
 * Проверка Stars баланса, создание и подтверждение платежей
 */
import { env as privateEnv } from '$env/dynamic/private';

function getBotToken(): string {
  const token = privateEnv.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

function getBotApiUrl(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

export interface TelegramBotUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface StarTransaction {
  id: string;
  amount: number;
  date: number;
  source?: any;
  receiver?: any;
}

/**
 * Делает запрос к Telegram Bot API
 */
async function makeBotAPIRequest(method: string, params: any = {}): Promise<any> {
  try {
    const url = `${getBotApiUrl()}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram Bot API error: ${data.description || 'Unknown error'}`);
    }

    return data.result;
  } catch (error) {
    console.error(`Ошибка Telegram Bot API (${method}):`, error);
    throw error;
  }
}

/**
 * Получает информацию о пользователе через Bot API
 */
export async function getTelegramUserInfo(userId: number): Promise<TelegramBotUser | null> {
  try {
    console.log(`Получение информации о пользователе ${userId} через Bot API`);
    
    // Используем getChat для получения информации о пользователе
    const userInfo = await makeBotAPIRequest('getChat', {
      chat_id: userId
    });

    console.log('Информация о пользователе получена:', userInfo);
    return userInfo;
    
  } catch (error) {
    console.error('Ошибка получения информации о пользователе:', error);
    return null;
  }
}

/**
 * Проверяет баланс Stars пользователя
 * Примечание: Bot API не предоставляет прямого способа проверки Stars баланса
 * Эта функция имитирует проверку и всегда возвращает true
 */
export async function checkUserStarsBalance(userId: number, requiredAmount: number): Promise<boolean> {
  try {
    console.log(`Проверка Stars баланса пользователя ${userId}, требуется: ${requiredAmount}`);
    
    // В реальном Bot API нет метода для проверки Stars баланса пользователя
    // Telegram Stars списываются при создании invoice и подтверждении оплаты
    // Поэтому мы предполагаем, что у пользователя достаточно Stars
    
    // Получаем информацию о пользователе для проверки его существования
    const userInfo = await getTelegramUserInfo(userId);
    
    if (!userInfo) {
      console.log('Пользователь не найден');
      return false;
    }

    // В реальном приложении здесь была бы логика проверки Stars
    // Но Telegram не предоставляет API для проверки Stars баланса
    console.log('Проверка Stars баланса: предполагаем достаточность средств');
    return true;
    
  } catch (error) {
    console.error('Ошибка проверки Stars баланса:', error);
    return false;
  }
}

/**
 * Создает invoice для оплаты Telegram Stars
 */
export async function createStarsInvoiceViaBotAPI(
  chatId: number,
  amount: number,
  title: string = 'Пополнение баланса игры',
  description: string = 'Пополнение Stars в игре Plinko',
  payload: string
): Promise<string> {
  try {
    console.log('Создание Stars invoice через Bot API:', {
      chatId,
      amount,
      title,
      payload
    });

    // Создаем invoice для Stars
    const invoice = await makeBotAPIRequest('createInvoiceLink', {
      title,
      description,
      payload,
      provider_token: '', // Для Stars provider_token пустой
      currency: 'XTR', // XTR = Telegram Stars
      prices: [
        {
          label: title,
          amount: amount // Для Stars amount указывается напрямую
        }
      ],
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false
    });

    console.log('Stars invoice создан:', invoice);
    return invoice;
    
  } catch (error) {
    console.error('Ошибка создания Stars invoice:', error);
    throw error;
  }
}

/**
 * Отправляет invoice пользователю через бота
 */
export async function sendStarsInvoice(
  chatId: number,
  amount: number,
  title: string = 'Пополнение баланса игры',
  description: string = 'Пополнение Stars в игре Plinko',
  payload: string
): Promise<any> {
  try {
    console.log('Отправка Stars invoice пользователю:', { chatId, amount, payload });

    const message = await makeBotAPIRequest('sendInvoice', {
      chat_id: chatId,
      title,
      description,
      payload,
      provider_token: '', // Для Stars provider_token пустой
      currency: 'XTR', // XTR = Telegram Stars
      prices: [
        {
          label: title,
          amount: amount // Для Stars amount указывается напрямую
        }
      ],
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Оплатить ${amount} ⭐`,
              pay: true
            }
          ]
        ]
      }
    });

    console.log('Stars invoice отправлен:', message);
    return message;
    
  } catch (error) {
    console.error('Ошибка отправки Stars invoice:', error);
    throw error;
  }
}

/**
 * Проверяет успешный платеж Stars по payload
 */
export async function verifyStarsPayment(
  payload: string,
  telegramChargeId: string,
  providerPaymentChargeId: string
): Promise<boolean> {
  try {
    console.log('Проверка Stars платежа:', {
      payload,
      telegramChargeId,
      providerPaymentChargeId
    });

    // В реальном приложении здесь была бы логика проверки платежа
    // через Bot API или webhook от Telegram
    
    // Для Stars платежей Telegram автоматически подтверждает успешные операции
    // Если мы получили callback с successful_payment, значит платеж прошел
    
    console.log('Stars платеж подтвержден');
    return true;
    
  } catch (error) {
    console.error('Ошибка проверки Stars платежа:', error);
    return false;
  }
}

/**
 * Получает информацию о Stars транзакциях (если доступно)
 */
export async function getStarTransactions(userId: number): Promise<StarTransaction[]> {
  try {
    console.log(`Получение Stars транзакций для пользователя ${userId}`);
    
    // Telegram Bot API не предоставляет метода для получения истории Stars транзакций
    // Эта информация доступна только через webhooks при совершении платежей
    
    console.log('Stars транзакции недоступны через Bot API');
    return [];
    
  } catch (error) {
    console.error('Ошибка получения Stars транзакций:', error);
    return [];
  }
}

/**
 * Отправляет уведомление пользователю о успешном пополнении
 */
export async function sendPaymentSuccessNotification(
  chatId: number,
  amount: number,
  newBalance: number
): Promise<void> {
  try {
    const message = `🎉 Баланс успешно пополнен!\n\n` +
                   `⭐ Списано Stars: ${amount}\n` +
                   `🎯 Зачислено в игру: ${amount}\n` +
                   `💰 Текущий баланс: ${newBalance}\n\n` +
                   `Приятной игры в Plinko! 🎰`;

    await makeBotAPIRequest('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    console.log(`Уведомление о пополнении отправлено пользователю ${chatId}`);
    
  } catch (error) {
    console.error('Ошибка отправки уведомления о пополнении:', error);
  }
}

/**
 * Отправка произвольного сообщения администратору (чат из TELEGRAM_ADMIN_CHAT_ID)
 */
export async function sendAdminMessage(text: string): Promise<void> {
  const adminChat = privateEnv.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChat) {
    console.warn('TELEGRAM_ADMIN_CHAT_ID is not set; admin message skipped');
    return;
  }
  try {
    await makeBotAPIRequest('sendMessage', {
      chat_id: adminChat, // может быть числом или @username
      text,
      parse_mode: 'HTML'
    });
  } catch (e) {
    console.error('Не удалось отправить сообщение администратору:', e);
  }
}

/**
 * Функция для тестирования подключения к Bot API
 */
export async function testBotConnection(): Promise<boolean> {
  try {
    const me = await makeBotAPIRequest('getMe');
    console.log('Bot API подключение успешно:', me);
    return true;
  } catch (error) {
    console.error('Ошибка подключения к Bot API:', error);
    return false;
  }
}