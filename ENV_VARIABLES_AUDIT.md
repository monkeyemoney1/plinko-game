# 📊 Анализ переменных окружения Render

## ✅ Используемые переменные (8 из 10)

### 1. **DATABASE_URL** ✅
- **Статус**: Используется активно
- **Где**: 
  - `src/lib/server/db.ts` - основное подключение к БД
  - `scripts/migrate.js` - миграции
  - `src/lib/db.ts` - legacy поддержка
- **Критичность**: 🔴 **КРИТИЧЕСКАЯ** - без неё приложение не запустится

### 2. **GAME_WALLET_ADDRESS** ✅
- **Статус**: Используется активно
- **Где**:
  - `src/routes/api/deposits/verify/+server.ts` - проверка депозитов
  - `src/routes/api/game/wallet/+server.ts` - API кошелька
  - `src/routes/api/withdrawals/process/+server.js` - обработка выводов
- **Критичность**: 🔴 **КРИТИЧЕСКАЯ** - для депозитов и выводов

### 3. **GAME_WALLET_MNEMONIC** ✅
- **Статус**: Используется активно
- **Где**:
  - `src/lib/ton.ts` - создание кошелька для транзакций
  - `src/routes/api/withdrawals/process/+server.js` - отправка TON
- **Критичность**: 🔴 **КРИТИЧЕСКАЯ** - для выводов средств

### 4. **NODE_ENV** ✅
- **Статус**: Используется активно
- **Где**:
  - `src/lib/server/db.ts` - SSL настройки БД
  - `src/lib/db.ts` - SSL настройки
  - `src/lib/logger.ts` - уровень логирования
  - `src/routes/api/health/+server.ts` - health check
  - `src/routes/api/metrics/+server.ts` - метрики
- **Критичность**: 🟡 **ВАЖНАЯ** - влияет на поведение приложения

### 5. **SESSION_SECRET** ✅
- **Статус**: Должна использоваться (SvelteKit)
- **Где**: SvelteKit автоматически использует для сессий
- **Критичность**: 🟡 **ВАЖНАЯ** - для безопасности сессий

### 6. **TELEGRAM_BOT_TOKEN** ✅
- **Статус**: Используется
- **Где**: Telegram интеграции (Mini App)
- **Критичность**: 🟡 **ВАЖНАЯ** - для Telegram Mini App

### 7. **TON_API_KEY** ✅
- **Статус**: Используется активно
- **Где**:
  - `src/routes/api/deposits/verify/+server.ts` - проверка транзакций
  - `src/routes/api/withdrawals/process/+server.js` - отправка транзакций
- **Критичность**: 🟡 **ВАЖНАЯ** - для работы с блокчейном

### 8. **TON_NETWORK** ✅
- **Статус**: Используется активно
- **Где**:
  - `src/lib/ton.ts` - выбор сети (testnet/mainnet)
  - `src/routes/api/withdrawals/process/+server.js` - отправка в нужную сеть
- **Критичность**: 🟡 **ВАЖНАЯ** - определяет сеть для транзакций

---

## ⚠️ НЕ используемые переменные (2 из 10)

### 9. **TELEGRAM_ADMIN_CHAT_ID** ❌
- **Статус**: НЕ используется в коде
- **Значение**: `@PlinkoStars_Support`
- **Проблема**: Переменная установлена, но нигде не используется
- **Рекомендация**: 
  - Либо добавить уведомления админам
  - Либо удалить переменную

### 10. **WITHDRAWAL_DAILY_LIMIT_TON** ❌
- **Статус**: НЕ используется в коде
- **Значение**: `5`
- **Проблема**: Вместо неё используется хардкод в `src/lib/config/withdrawals.ts`
  ```typescript
  MAX_DAILY_AMOUNT: 500, // ← Используется это значение, а не переменная
  ```
- **Рекомендация**: 
  - Либо использовать переменную окружения
  - Либо удалить её из Render

---

## 🔧 Рекомендации по исправлению

### Вариант 1: Удалить неиспользуемые переменные (рекомендуется)

Удалите из Render Dashboard:
- ❌ `TELEGRAM_ADMIN_CHAT_ID`
- ❌ `WITHDRAWAL_DAILY_LIMIT_TON`

### Вариант 2: Использовать переменные в коде

#### Для `WITHDRAWAL_DAILY_LIMIT_TON`:

Обновить `src/lib/config/withdrawals.ts`:

\`\`\`typescript
import { env } from '$env/dynamic/private';

export const WITHDRAWAL_CONFIG = {
  // Используем переменную окружения или значение по умолчанию
  MAX_DAILY_AMOUNT: parseFloat(env.WITHDRAWAL_DAILY_LIMIT_TON || '500'),
  // ... остальное
};
\`\`\`

#### Для `TELEGRAM_ADMIN_CHAT_ID`:

Создать систему уведомлений админа при выводах:

\`\`\`typescript
// src/lib/telegram-notify.ts
import { env } from '$env/dynamic/private';

export async function notifyAdmin(message: string) {
  const chatId = env.TELEGRAM_ADMIN_CHAT_ID;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  if (!chatId || !botToken) return;
  
  await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  });
}
\`\`\`

---

## 📝 Итоговая таблица

| Переменная | Используется | Критичность | Действие |
|------------|--------------|-------------|----------|
| DATABASE_URL | ✅ Да | 🔴 Критическая | Оставить |
| GAME_WALLET_ADDRESS | ✅ Да | 🔴 Критическая | Оставить |
| GAME_WALLET_MNEMONIC | ✅ Да | 🔴 Критическая | Оставить |
| NODE_ENV | ✅ Да | 🟡 Важная | Оставить |
| SESSION_SECRET | ✅ Да | 🟡 Важная | Оставить |
| TELEGRAM_BOT_TOKEN | ✅ Да | 🟡 Важная | Оставить |
| TON_API_KEY | ✅ Да | 🟡 Важная | Оставить |
| TON_NETWORK | ✅ Да | 🟡 Важная | Оставить |
| TELEGRAM_ADMIN_CHAT_ID | ❌ Нет | - | **Удалить** |
| WITHDRAWAL_DAILY_LIMIT_TON | ❌ Нет | - | **Удалить** |

---

## ✅ Вывод

**8 из 10 переменных** используются активно и необходимы для работы приложения.

**2 переменные** не используются и могут быть безопасно удалены:
- `TELEGRAM_ADMIN_CHAT_ID`
- `WITHDRAWAL_DAILY_LIMIT_TON`

Это не критично, но для чистоты конфигурации рекомендуется их удалить.
