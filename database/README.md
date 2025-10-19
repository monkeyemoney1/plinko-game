# База данных Plinko Game

## Структура базы данных

### Основные таблицы:

1. **users** - Пользователи с TON и Telegram данными
2. **game_sessions** - Игровые сессии 
3. **game_bets** - История ставок и игр
4. **ton_transactions** - TON транзакции
5. **balance_operations** - Операции с балансом
6. **event_logs** - Логи событий
7. **user_settings** - Настройки пользователей

## Установка и настройка

### 1. Создание базы данных
```bash
# Войти в PostgreSQL как суперпользователь
psql -U postgres

# Выполнить создание БД
\i database/create_database.sql

# Подключиться к созданной БД
\c plinko_game
```

### 2. Создание схемы
```bash
# Выполнить создание таблиц
\i database/schema.sql
```

### 3. Проверка
```sql
-- Список таблиц
\dt

-- Структура таблицы пользователей
\d users
```

## Примеры использования

### Добавление пользователя
```sql
INSERT INTO users (ton_address, telegram_username, telegram_id) 
VALUES ('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG', 'username', 123456789);
```

### Добавление ставки
```sql
INSERT INTO game_bets (user_id, bet_amount, risk_level, rows_count, multiplier, payout, profit, is_win)
VALUES (1, 10.00, 'MEDIUM', 16, 2.5, 25.00, 15.00, true);
```

### Статистика пользователя
```sql
SELECT 
    u.ton_address,
    u.telegram_username,
    u.stars_balance,
    COUNT(gb.id) as total_bets,
    SUM(gb.profit) as total_profit
FROM users u
LEFT JOIN game_bets gb ON u.id = gb.user_id
WHERE u.id = 1
GROUP BY u.id;
```

## Конфигурация подключения

Добавьте в `.env` файл:
```
DATABASE_URL=postgresql://plinko_user:your_secure_password_here@localhost:5432/plinko_game
```