# 🎮 Plinko Casino Game

Игра Plinko с интеграцией TON blockchain и реалистичной физикой.

## 🚀 Технологии

- **Frontend**: SvelteKit 2.5+, Svelte 5.0, TypeScript, Tailwind CSS 4.0
- **Physics Engine**: Matter.js
- **Blockchain**: TON Connect, TON API
- **Database**: PostgreSQL
- **Deployment**: Render (Node.js)

## 📦 Установка

```bash
# Установка зависимостей
pnpm install

# Запуск development сервера
pnpm dev

# Продакшн сборка
pnpm build

# Запуск продакшн сервера
pnpm start
```

## 🌍 Переменные окружения

Создайте `.env` файл:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
TON_API_KEY=your_ton_api_key
TON_NETWORK=testnet
NODE_ENV=production
SESSION_SECRET=your_secret_key
```

## 🎮 Возможности

- ✅ Реалистичная физика шариков (Matter.js)
- ✅ 3 уровня риска (Low/Medium/High)
- ✅ Настраиваемые ряды (8-16)
- ✅ TON Connect интеграция
- ✅ Real-time статистика
- ✅ История игр и транзакций
- ✅ Депозиты и выводы TON

## 📊 База данных

Запустите миграцию после деплоя:

```bash
pnpm migrate
```

## 🚀 Деплой на Render

1. Создайте PostgreSQL базу в Render
2. Создайте Web Service
3. Добавьте переменные окружения
4. Build Command: `pnpm install && pnpm build`
5. Start Command: `pnpm start`

Подробнее в [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)

## 📝 Лицензия

MIT