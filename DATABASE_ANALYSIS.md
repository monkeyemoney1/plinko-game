# Анализ структуры базы данных Plinko Game

## 📊 Основные таблицы (используются активно)

### 1. **users** - Пользователи
**Источник**: `database/schema.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Хранение данных пользователей
**Поля**: id, ton_address, telegram_id, telegram_username, stars_balance, ton_balance, created_at
**Использование**: 
- Все API endpoints для пользователей
- Аутентификация
- Баланс пользователей

### 2. **star_transactions** - Транзакции Telegram Stars
**Источник**: `migrations/005_add_star_transactions.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Хранение платежей через Telegram Stars
**Поля**: id, user_id, telegram_id, amount, payload, status, created_at
**Использование**:
- `/api/payments/stars/initiate`
- `/api/payments/stars/verify`
- `/api/admin/analytics/stars`
- `/api/admin/transactions`

### 3. **user_wallets** - Подключенные кошельки
**Источник**: `migrations/006_create_user_wallets_table.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Отслеживание подключенных TON кошельков
**Поля**: id, user_id, wallet_address, is_connected, created_at
**Использование**:
- `/api/wallet/track-connection`
- `/api/admin/analytics/wallets`
- `/api/admin/stats`

### 4. **game_bets** - Ставки в игре
**Источник**: `database/schema.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Хранение истории игровых ставок
**Поля**: id, user_id, bet_amount, multiplier, payout, profit, is_win, created_at
**Использование**:
- `/api/bets`
- `/api/users/[id]/games`
- `/api/metrics`

### 5. **withdrawals** - Выводы средств
**Источник**: `sql/create_withdrawals_table.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Запросы на вывод TON
**Поля**: id, user_id, amount, wallet_address, status, transaction_hash, created_at
**Использование**:
- `/api/withdrawals/create`
- `/api/withdrawals/process`
- `/api/withdrawals/status`

### 6. **deposits** - Депозиты TON
**Источник**: `database/schema.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Отслеживание депозитов TON
**Поля**: id, user_id, wallet_address, amount, status, transaction_hash, created_at
**Использование**:
- `/api/deposits/create`
- `/api/deposits/verify`
- `/api/admin/transactions`

### 7. **ton_transactions** - Транзакции TON blockchain
**Источник**: `database/schema.sql`
**Статус**: ✅ **АКТИВНА**
**Назначение**: Хранение всех TON транзакций
**Поля**: id, user_id, transaction_hash, transaction_type, amount, status, created_at
**Использование**:
- `/api/transactions`
- `/api/transactions/deposit`
- `/api/transactions/withdraw`
- `/api/metrics`

---

## 🔄 Дополнительные таблицы (частично используются)

### 8. **game_sessions** - Игровые сессии
**Источник**: `database/schema.sql`
**Статус**: ⚠️ **ЧАСТИЧНО ИСПОЛЬЗУЕТСЯ**
**Назначение**: Отслеживание игровых сессий
**Использование**: Редко используется, можно оставить для будущего

### 9. **balance_operations** - Операции с балансом
**Источник**: `database/schema.sql`
**Статус**: ⚠️ **ЧАСТИЧНО ИСПОЛЬЗУЕТСЯ**
**Назначение**: История операций пополнения/вывода
**Использование**: Может дублировать функционал deposits/withdrawals

### 10. **event_logs** - Логи событий
**Источник**: `database/schema.sql`
**Статус**: ⚠️ **ЧАСТИЧНО ИСПОЛЬЗУЕТСЯ**
**Назначение**: Логирование действий пользователей
**Использование**: Для отладки и аналитики

### 11. **user_settings** - Настройки пользователей
**Источник**: `database/schema.sql`
**Статус**: ⚠️ **ЧАСТИЧНО ИСПОЛЬЗУЕТСЯ**
**Назначение**: Пользовательские настройки UI
**Использование**: Может быть полезно в будущем

---

## ❌ ПРОБЛЕМНЫЕ ТАБЛИЦЫ - ДУБЛИКАТЫ

### 🔴 **game_results** vs **game_bets**
**Проблема**: В коде упоминается `game_results`, но в schema.sql определена `game_bets`
**Где используется**:
- `/api/admin/stats` - использует `game_results`
- `/api/admin/game-stats` - использует `game_results`
- Но в реальной БД существует `game_bets`

**Решение**: 
1. Либо переименовать `game_bets` → `game_results`
2. Либо в коде заменить все `game_results` → `game_bets`

### 🔴 **pending_deposits** - Лишняя таблица?
**Источник**: `migrations/003_create_pending_deposits_table.sql`
**Проблема**: Функционал уже есть в `deposits` через поле `status`
**Решение**: Удалить, если не используется

### 🔴 **blockchain_transactions** - Пустая миграция
**Источник**: `migrations/add_blockchain_transactions.sql`
**Проблема**: Файл пустой, таблица не создана
**Решение**: Удалить файл или заполнить, если нужна

---

## 📋 Рекомендации по очистке

### 1. Удалить неиспользуемые миграции:
```bash
rm migrations/001_create_deposits_table.sql  # Дубликат 004
rm migrations/002_create_deposits_tracking.sql  # Не используется
rm migrations/003_create_pending_deposits_table.sql  # Дубликат deposits
rm migrations/add_blockchain_transactions.sql  # Пустой файл
```

### 2. Исправить несоответствие game_bets/game_results:
**Вариант А** - Обновить код (рекомендуется):
- В `/api/admin/stats/+server.ts` заменить `game_results` → `game_bets`
- В `/api/admin/game-stats/+server.ts` заменить `game_results` → `game_bets`

**Вариант Б** - Переименовать таблицу в БД:
```sql
ALTER TABLE game_bets RENAME TO game_results;
```

### 3. Объединить дублирующий функционал:
- `balance_operations` можно удалить, если вся логика есть в `deposits`/`withdrawals`
- `pending_deposits` точно удалить - дублирует `deposits` с status='pending'

---

## ✅ Итоговая структура БД (рекомендуемая)

### Основные таблицы (оставить):
1. ✅ `users` - Пользователи
2. ✅ `game_bets` - Ставки и игры
3. ✅ `star_transactions` - Telegram Stars платежи
4. ✅ `user_wallets` - TON кошельки
5. ✅ `deposits` - TON депозиты
6. ✅ `withdrawals` - TON выводы
7. ✅ `ton_transactions` - Все TON транзакции
8. ✅ `game_sessions` - Игровые сессии
9. ✅ `event_logs` - Логи
10. ✅ `user_settings` - Настройки

### Удалить/исправить:
- ❌ `pending_deposits` - удалить (дубликат)
- ❌ `balance_operations` - можно удалить (дублирует deposits/withdrawals)
- ⚠️ Исправить `game_results` → `game_bets` в коде
