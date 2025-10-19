# 🌟 Telegram Stars Payment Integration

## Обзор

Система полной интеграции платежей Telegram Stars с WebApp API, включающая:

- ✅ Инициация пополнения через Bot API
- ✅ Проверка возможности списания Stars 
- ✅ Списание Stars через Telegram
- ✅ Проверка статуса платежа
- ✅ Обновление баланса пользователя  
- ✅ Логирование всех транзакций
- ✅ Интеграция с пользовательским интерфейсом

## Компоненты системы

### 1. Telegram WebApp Utilities (`src/lib/telegram/webApp.ts`)
```typescript
- initTelegramWebApp() - инициализация WebApp
- getTelegramUser() - получение данных пользователя  
- createStarsInvoice() - создание инвойса Stars
- isTelegramWebApp() - проверка среды Telegram
```

### 2. Bot API Integration (`src/lib/telegram/botAPI.ts`)
```typescript  
- getStarsTransactions() - получение Stars транзакций
- createInvoice() - создание инвойса через Bot API
- checkStarsBalance() - проверка баланса Stars бота
```

### 3. API Endpoints

#### `/api/payments/stars/initiate` - Инициация платежа
**POST** запрос с параметрами:
```json
{
  "user_id": 123456789,
  "amount": 100,
  "description": "Пополнение баланса игры"
}
```

**Ответ:**
```json
{
  "success": true,
  "invoice_link": "https://t.me/invoice/...",
  "payload": "unique_payload_string",
  "amount": 100
}
```

#### `/api/payments/stars/verify` - Верификация платежа
**POST** запрос с параметрами:
```json
{
  "payload": "unique_payload_string"
}
```

**Ответ:**
```json
{
  "success": true,
  "amount": 100,
  "user_id": 123456789,
  "transaction_id": "tx_12345",
  "created_at": "2024-01-15T12:00:00.000Z"
}
```

### 4. Database Schema

#### Таблица `star_transactions`:
```sql
CREATE TABLE star_transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount INTEGER NOT NULL,
    payload VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    invoice_link TEXT,
    telegram_payment_charge_id VARCHAR(255),
    provider_payment_charge_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);
```

## Использование в UI

### Профиль пользователя (`src/routes/profile/+page.svelte`)

1. **Кнопка пополнения Stars** - открывает модальное окно
2. **Создание инвойса** - через `processStarsDeposit()`
3. **Оплата через WebApp** - `window.Telegram.WebApp.openInvoice()`
4. **Автоматическая верификация** - после успешной оплаты

### Инициализация WebApp (`src/routes/+layout.svelte`)

```typescript
onMount(() => {
  if (isTelegramWebApp()) {
    initTelegramWebApp();
    console.log('Telegram WebApp инициализировано');
  }
});
```

## Тестирование

### Тестовая страница: `http://localhost:5173/test-stars.html`

Функции:
- 📱 Отображение информации Telegram WebApp
- 💰 Создание тестовых инвойсов Stars
- ✅ Проверка статуса платежей
- 🔗 Полный цикл тестирования
- 💰 Проверка баланса пользователя

### Основные тесты:

1. **Создание инвойса:**
   ```bash
   curl -X POST http://localhost:5173/api/payments/stars/initiate \
        -H "Content-Type: application/json" \
        -d '{"user_id": 123456789, "amount": 50, "description": "Test"}'
   ```

2. **Верификация платежа:**
   ```bash
   curl -X POST http://localhost:5173/api/payments/stars/verify \
        -H "Content-Type: application/json" \
        -d '{"payload": "your_payload_here"}'
   ```

## Конфигурация

### Environment Variables (`.env`):
```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=8401593144:AAHIzxiGfGlZ2GQ8h8Y6y-W_9ZPxqCupGIU

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/plinko_dev

# App Settings
NODE_ENV=development
MIN_BET_AMOUNT=1
MAX_BET_AMOUNT=1000
```

## Миграция базы данных

```bash
node scripts/migrate.js
```

Создает таблицу `star_transactions` и все необходимые индексы.

## Безопасность

1. **Уникальные payload** - предотвращают повторные платежи
2. **Валидация пользователей** - проверка initDataUnsafe
3. **Логирование транзакций** - полная аудитория
4. **Статусы платежей** - отслеживание состояния
5. **Защита от дублирования** - unique constraints

## Workflow пополнения Stars

```mermaid
graph TD
    A[Пользователь нажимает +] --> B[Открытие модального окна]
    B --> C[Ввод суммы Stars]
    C --> D[Нажатие "Пополнить"]
    D --> E[POST /api/payments/stars/initiate]
    E --> F[Создание записи в БД]
    F --> G[Генерация уникального payload]
    G --> H[Создание инвойса через Bot API]
    H --> I[Возврат invoice_link клиенту]
    I --> J[Открытие платежа в Telegram WebApp]
    J --> K[Пользователь оплачивает]
    K --> L[Callback от Telegram]
    L --> M[POST /api/payments/stars/verify]
    M --> N[Проверка транзакции в Bot API]
    N --> O[Обновление баланса пользователя]
    O --> P[Логирование завершенной транзакции]
```

## Статус интеграции: ✅ ГОТОВО

- [x] Telegram WebApp SDK установлен и настроен
- [x] Bot API интеграция реализована
- [x] API endpoints созданы и протестированы
- [x] Database миграция выполнена
- [x] UI интеграция завершена
- [x] Тестовая среда подготовлена
- [x] Документация создана

## Следующие шаги

1. **Тестирование в реальном Telegram боте** - проверка полного цикла
2. **Production deployment** - развертывание на сервере
3. **Monitoring** - настройка логирования и мониторинга
4. **Rate limiting** - защита от злоупотреблений