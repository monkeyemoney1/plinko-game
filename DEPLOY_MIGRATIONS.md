# 🚀 Автоматические миграции при деплое на Render

## ✅ Что теперь происходит автоматически

При каждом деплое на Render **автоматически** выполняется:

```json
"start": "node scripts/migrate.js && node build"
```

## 📋 Список миграций (выполняются по порядку)

1. **004_add_deposits_table.sql** - таблица депозитов
2. **005_add_star_transactions.sql** - транзакции Telegram Stars
3. **006_create_withdrawals_table.sql** - ✨ **НОВАЯ** таблица выводов
4. **007_update_withdrawals_table.sql** - обновления полей withdrawals
5. **008_create_user_wallets_table.sql** - кошельки пользователей

## 🔄 Как это работает

### При деплое на Render:

1. **Git Push** → Render получает новый код
2. **Build** → Устанавливаются зависимости
3. **Start** → Запускается `scripts/migrate.js`
   - Подключается к production БД
   - Проверяет существующие таблицы
   - Выполняет все миграции по порядку
   - Пропускает уже существующие объекты
4. **Run** → Запускается приложение

### Логи миграции:

```
🚀 Starting database migration...
✅ Connected to database
📊 Tables already exist: users, games, deposits, star_transactions
📝 Checking for additional migrations...
✅ Migration 006_create_withdrawals_table.sql applied successfully
⚠️  Migration 007_update_withdrawals_table.sql - object already exists, skipping
✅ Database schema is up to date
🎉 Migration completed successfully!
```

## 💡 Преимущества

### ✅ Бесплатно
- Не нужен платный Shell на Render
- Всё работает через обычный deploy

### ✅ Автоматически
- Забыли запустить миграцию? Не проблема!
- При каждом деплое всё обновляется

### ✅ Безопасно
- Идемпотентные миграции (можно запускать много раз)
- Проверка существования объектов
- Автоматический откат при ошибках

### ✅ Удобно
- Просто делаете `git push`
- Всё остальное происходит само

## 🔧 Добавление новых миграций

### Создайте новый файл:

```bash
migrations/009_your_migration_name.sql
```

### Добавьте в скрипт миграции:

```javascript
const migrations = [
  '004_add_deposits_table.sql',
  '005_add_star_transactions.sql',
  '006_create_withdrawals_table.sql',
  '007_update_withdrawals_table.sql',
  '008_create_user_wallets_table.sql',
  '009_your_migration_name.sql'  // ← Добавьте сюда
];
```

### Закоммитьте и запушьте:

```bash
git add .
git commit -m "feat: add new migration"
git push
```

### Готово! 
Render автоматически применит миграцию при следующем деплое.

## 📝 Пример миграции

```sql
-- migrations/009_add_user_stats.sql

-- Создаём таблицу если её нет
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total_games INTEGER DEFAULT 0,
    total_won DECIMAL(15, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Создаём индекс если его нет
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
```

Ключевые слова:
- `CREATE TABLE IF NOT EXISTS` - не упадёт если таблица уже есть
- `CREATE INDEX IF NOT EXISTS` - не упадёт если индекс уже есть
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - для добавления колонок

## ⚠️ Важно

- Всегда используйте `IF NOT EXISTS` для идемпотентности
- Тестируйте миграции локально перед пушем
- Не удаляйте старые миграции из списка
- Добавляйте новые миграции в конец списка

## 🎉 Результат

Теперь **таблица `withdrawals` автоматически создастся** при следующем деплое на Render!

Вам больше не нужно:
- ❌ Платить за Shell на Render
- ❌ Вручную выполнять SQL
- ❌ Беспокоиться о миграциях

Просто делаете `git push` и всё работает! 🚀
