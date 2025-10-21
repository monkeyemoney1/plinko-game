# 🚀 Инструкция по созданию таблицы withdrawals в Production

## ❌ Проблема
```
ERROR: relation "withdrawals" does not exist at character 109
```

Таблица `withdrawals` не существует в production базе данных на Render.

## ✅ Решение

### Вариант 1: Через Render Dashboard (Рекомендуется)

1. **Зайдите в Render Dashboard**
   - Откройте https://dashboard.render.com
   - Найдите свою PostgreSQL базу данных

2. **Откройте SQL Shell/Editor**
   - В меню базы данных выберите "Shell" или "Connect"
   - Или используйте External Connection URL

3. **Выполните SQL скрипт**
   
   Скопируйте и выполните содержимое файла `sql/create_withdrawals_table.sql`:

```sql
-- Создание таблицы для выводов средств
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 6) NOT NULL CHECK (amount > 0),
    fee DECIMAL(15, 6) DEFAULT 0,
    net_amount DECIMAL(15, 6) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'manual_review')),
    auto_process BOOLEAN DEFAULT false,
    transaction_hash VARCHAR(255),
    error_message TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_process ON withdrawals(auto_process);

-- Добавляем комментарии
COMMENT ON TABLE withdrawals IS 'Таблица для хранения запросов на вывод средств';
COMMENT ON COLUMN withdrawals.status IS 'Статус вывода: pending, processing, completed, failed, cancelled, manual_review';
COMMENT ON COLUMN withdrawals.transaction_hash IS 'Hash транзакции в блокчейне TON';
COMMENT ON COLUMN withdrawals.fee IS 'Комиссия за вывод';
COMMENT ON COLUMN withdrawals.net_amount IS 'Сумма к выводу после вычета комиссии';
COMMENT ON COLUMN withdrawals.auto_process IS 'Флаг автоматической обработки';
COMMENT ON COLUMN withdrawals.admin_notes IS 'Заметки администратора';
COMMENT ON COLUMN withdrawals.reviewed_by IS 'ID администратора, проверившего заявку';
```

4. **Проверьте создание таблицы**

```sql
-- Проверка структуры
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'withdrawals'
ORDER BY ordinal_position;

-- Проверка индексов
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'withdrawals';
```

### Вариант 2: Через psql CLI

Если у вас установлен PostgreSQL клиент:

```bash
# Скопируйте External Connection URL из Render Dashboard
psql "postgresql://plinko_game_user:YOUR_PASSWORD@dpg-xxxxx-a.oregon-postgres.render.com/plinko_game"

# Выполните SQL файл
\i sql/create_withdrawals_table.sql

# Проверьте
\d withdrawals
```

### Вариант 3: Через скрипт Node.js

Если получите правильный DATABASE_URL от Render:

```bash
# Установите переменную окружения
$env:DATABASE_URL = "postgresql://plinko_game_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/plinko_game"

# Запустите скрипт
node create-withdrawals-table-production.js
```

## 📋 После создания таблицы

1. **Перезапустите приложение на Render**
   - Manual Deploy → Clear build cache & deploy
   
2. **Проверьте работу вывода средств**
   - Попробуйте создать запрос на вывод
   - Проверьте, что ошибка исчезла

3. **Проверьте админ-панель**
   - Откройте `/admin/withdrawals`
   - Убедитесь, что панель управления работает

## 🔍 Где взять DATABASE_URL для Production

1. Зайдите на https://dashboard.render.com
2. Выберите вашу PostgreSQL базу данных
3. Перейдите в раздел "Info"
4. Скопируйте **External Database URL**

Формат:
```
postgresql://USER:PASSWORD@HOST/DATABASE
```

## ⚠️ Важно

- **НЕ коммитьте** production DATABASE_URL в git
- Используйте переменные окружения Render для production
- Локальная `.env` - только для разработки

## ✅ Проверка успеха

После выполнения SQL вы должны увидеть в логах Render:

```
✅ Таблица withdrawals создана
✅ Индексы созданы
✅ Вывод средств работает
```

Вместо ошибки:
```
❌ ERROR: relation "withdrawals" does not exist
```
