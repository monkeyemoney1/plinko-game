/**
 * Конфигурация системы выплат
 */

export const WITHDRAWAL_CONFIG = {
  // Лимиты
  MIN_AMOUNT: 0.1, // Минимальная сумма вывода в TON
  MAX_AMOUNT: 100, // Максимальная сумма вывода в TON
  MAX_DAILY_AMOUNT: 500, // Максимальная сумма вывода в день на пользователя
  MAX_DAILY_COUNT: 10, // Максимальное количество выводов в день на пользователя

  // Комиссии
  FIXED_FEE: 0.05, // Фиксированная комиссия в TON
  PERCENTAGE_FEE: 0, // Процентная комиссия (отключена)
  
  // Временные ограничения
  PROCESSING_TIMEOUT: 300000, // 5 минут на обработку
  DAILY_RESET_HOUR: 0, // Час сброса дневных лимитов (UTC)
  
  // Автоматическая обработка
  AUTO_PROCESS_ENABLED: true,
  AUTO_PROCESS_THRESHOLD: 999999, // Автообработка для всех сумм
  MANUAL_REVIEW_THRESHOLD: 999999, // Ручная проверка отключена
  
  // Безопасность
  REQUIRE_2FA: false, // Требовать двухфакторную аутентификацию
  MIN_ACCOUNT_AGE_HOURS: 0, // Минимальный возраст аккаунта для вывода отключен
  MIN_DEPOSIT_BEFORE_WITHDRAWAL: 0.05, // Минимальный депозит перед выводом
  
  // Статусы
  STATUSES: {
    PENDING: 'pending',
    PROCESSING: 'processing', 
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    MANUAL_REVIEW: 'manual_review'
  } as const
};

export type WithdrawalStatus = typeof WITHDRAWAL_CONFIG.STATUSES[keyof typeof WITHDRAWAL_CONFIG.STATUSES];

/**
 * Вычисляет комиссию за вывод
 */
export function calculateWithdrawalFee(amount: number): {
  fee: number;
  netAmount: number;
  grossAmount: number;
} {
  // Фиксированная комиссия 0.05 TON
  const totalFee = WITHDRAWAL_CONFIG.FIXED_FEE;
  
  return {
    fee: totalFee,
    netAmount: amount - totalFee,
    grossAmount: amount
  };
}

/**
 * Проверяет лимиты вывода
 */
export function validateWithdrawalLimits(
  amount: number,
  dailyWithdrawn: number,
  dailyCount: number
): { valid: boolean; error?: string } {
  if (amount < WITHDRAWAL_CONFIG.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Минимальная сумма вывода: ${WITHDRAWAL_CONFIG.MIN_AMOUNT} TON`
    };
  }
  
  if (amount > WITHDRAWAL_CONFIG.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Максимальная сумма вывода: ${WITHDRAWAL_CONFIG.MAX_AMOUNT} TON`
    };
  }
  
  if (dailyWithdrawn + amount > WITHDRAWAL_CONFIG.MAX_DAILY_AMOUNT) {
    return {
      valid: false,
      error: `Превышен дневной лимит: ${WITHDRAWAL_CONFIG.MAX_DAILY_AMOUNT} TON`
    };
  }
  
  if (dailyCount >= WITHDRAWAL_CONFIG.MAX_DAILY_COUNT) {
    return {
      valid: false,
      error: `Превышено количество выводов в день: ${WITHDRAWAL_CONFIG.MAX_DAILY_COUNT}`
    };
  }
  
  return { valid: true };
}

/**
 * Определяет нужна ли автоматическая обработка
 */
export function shouldAutoProcess(amount: number): boolean {
  return WITHDRAWAL_CONFIG.AUTO_PROCESS_ENABLED && 
         amount <= WITHDRAWAL_CONFIG.AUTO_PROCESS_THRESHOLD;
}

/**
 * Определяет нужна ли ручная проверка
 */
export function requiresManualReview(amount: number): boolean {
  return amount >= WITHDRAWAL_CONFIG.MANUAL_REVIEW_THRESHOLD;
}