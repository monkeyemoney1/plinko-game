/**
 * Утилиты для работы с Telegram WebApp
 * Получение данных пользователя, инициализация платежей Stars
 */
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}

/**
 * Получает данные пользователя из Telegram WebApp
 * Использует initDataUnsafe для получения всех доступных данных
 */
export function getTelegramUser(): TelegramUser | null {
  try {
    if (!WebApp.initDataUnsafe?.user) {
      console.log('Telegram WebApp: пользователь не найден в initDataUnsafe');
      return null;
    }

    const user = WebApp.initDataUnsafe.user;
    console.log('Telegram WebApp: получены данные пользователя', {
      id: user.id,
      first_name: user.first_name,
      username: user.username || 'нет username'
    });

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium
    };
  } catch (error) {
    console.error('Ошибка получения данных пользователя Telegram:', error);
    return null;
  }
}

/**
 * Получает полные initData из Telegram WebApp
 */
export function getTelegramInitData(): TelegramInitData | null {
  try {
    if (!WebApp.initDataUnsafe) {
      console.log('Telegram WebApp: initDataUnsafe недоступен');
      return null;
    }

    return {
      user: WebApp.initDataUnsafe.user,
      auth_date: WebApp.initDataUnsafe.auth_date,
      hash: WebApp.initDataUnsafe.hash,
      query_id: WebApp.initDataUnsafe.query_id,
      start_param: WebApp.initDataUnsafe.start_param
    };
  } catch (error) {
    console.error('Ошибка получения initData:', error);
    return null;
  }
}

/**
 * Проверяет, запущено ли приложение в Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  try {
    return WebApp.isVersionAtLeast('6.0');
  } catch {
    return false;
  }
}

/**
 * Инициализирует Telegram WebApp
 * Настраивает UI и получает готовность к работе
 */
export function initTelegramWebApp(): void {
  try {
    if (!isTelegramWebApp()) {
      console.log('Приложение не запущено в Telegram WebApp');
      return;
    }

    // Готовим WebApp к работе
    WebApp.ready();
    
    // Разворачиваем приложение на весь экран
    WebApp.expand();
    
    // Включаем основную кнопку если нужно
    WebApp.MainButton.hide();
    
    console.log('Telegram WebApp инициализирован успешно');
    console.log('Версия Telegram WebApp:', WebApp.version);
    console.log('Платформа:', WebApp.platform);
    
  } catch (error) {
    console.error('Ошибка инициализации Telegram WebApp:', error);
  }
}

/**
 * Создает invoice для оплаты Telegram Stars
 * @param amount - количество Stars для списания
 * @param title - заголовок платежа
 * @param description - описание платежа
 * @param payload - уникальный идентификатор транзакции
 */
export async function createStarsInvoice(
  amount: number,
  title: string = 'Пополнение баланса игры',
  description: string = 'Пополнение Stars в игре Plinko',
  payload?: string
): Promise<void> {
  try {
    if (!isTelegramWebApp()) {
      throw new Error('Telegram WebApp недоступен');
    }

    // Создаем уникальный payload если не передан
    const invoicePayload = payload || `stars_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    console.log('Создание Stars invoice:', {
      amount,
      title,
      description,
      payload: invoicePayload
    });

    // Открываем окно оплаты Stars через Telegram WebApp
    WebApp.openInvoice(`https://t.me/$invoice?startapp=${invoicePayload}`, (status: string) => {
      console.log('Статус оплаты Stars:', status);
      
      if (status === 'paid') {
        console.log('Оплата Stars успешна, payload:', invoicePayload);
        // Здесь будет обработка успешной оплаты
        handleStarsPaymentSuccess(invoicePayload, amount);
      } else if (status === 'cancelled') {
        console.log('Оплата Stars отменена пользователем');
      } else if (status === 'failed') {
        console.log('Ошибка оплаты Stars');
      }
    });

  } catch (error) {
    console.error('Ошибка создания Stars invoice:', error);
    throw error;
  }
}

/**
 * Обработка успешной оплаты Stars
 * Отправляет запрос на сервер для подтверждения и зачисления средств
 */
async function handleStarsPaymentSuccess(payload: string, amount: number): Promise<void> {
  try {
    const telegramUser = getTelegramUser();
    if (!telegramUser) {
      throw new Error('Не удалось получить данные пользователя Telegram');
    }

    console.log('Отправка запроса на подтверждение Stars платежа...');

    // Отправляем запрос на сервер для проверки и зачисления
    const response = await fetch('/api/payments/stars/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegram_id: telegramUser.id,
        payload,
        amount,
        initData: getTelegramInitData()
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('Stars платеж успешно подтвержден:', result);
      
      // Показываем уведомление об успешном пополнении
      WebApp.showAlert(`Баланс успешно пополнен на ${amount} Stars!`);
      
      // Здесь можно обновить баланс в UI
      // Например, через событие или store
      window.dispatchEvent(new CustomEvent('starsPaymentSuccess', { 
        detail: { amount, newBalance: result.balance } 
      }));
      
    } else {
      console.error('Ошибка подтверждения Stars платежа:', result.error);
      WebApp.showAlert('Ошибка при подтверждении платежа. Свяжитесь с поддержкой.');
    }

  } catch (error) {
    console.error('Ошибка обработки Stars платежа:', error);
    WebApp.showAlert('Ошибка при обработке платежа. Попробуйте позже.');
  }
}

/**
 * Получает информацию о пользователе для отладки
 */
export function getTelegramDebugInfo(): any {
  try {
    return {
      isWebApp: isTelegramWebApp(),
      version: WebApp.version,
      platform: WebApp.platform,
      colorScheme: WebApp.colorScheme,
      user: getTelegramUser(),
      initData: getTelegramInitData(),
      viewportHeight: WebApp.viewportHeight,
      viewportStableHeight: WebApp.viewportStableHeight
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}