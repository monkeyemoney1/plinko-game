# 🚀 Деплой Plinko Game на Render

## 📋 Пошаговая инструкция

### 1. Подготовка репозитория
- Убедитесь, что весь код закоммичен в Git
- Загрузите код на GitHub (если еще не сделано)

### 2. Создание PostgreSQL базы данных в Render
1. Зайдите на render.com и войдите в аккаунт
2. Нажмите "New +" → "PostgreSQL"
3. Заполните:
   - **Name**: `plinko-game-db`
   - **Database**: `plinko_game`
   - **User**: `plinko_user`
   - **Region**: выберите ближайший
   - **PostgreSQL Version**: 14 или новее
   - **Plan**: Free (для тестирования)
4. Нажмите "Create Database"
5. **ВАЖНО**: Скопируйте "External Database URL" - это ваш DATABASE_URL

### 3. Создание Web Service в Render
1. Нажмите "New +" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Заполните настройки:
   - **Name**: `plinko-game`
   - **Region**: тот же, что и у базы данных
   - **Branch**: `main` (или ваша основная ветка)
   - **Root Directory**: оставить пустым
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free (для тестирования)

### 4. Настройка переменных окружения
В разделе "Environment Variables" добавьте:

#### 🔧 Обязательные переменные:
```
NODE_ENV=production
DATABASE_URL=ваш_database_url_из_шага_2
TON_API_KEY=AEBE4GOFFSWC2MAAAAAFVZ24DO3WJWH7IKYUQDS2EF6UAIS2ULVW5XDB4YU3VQYHPGHIC6A
TON_NETWORK=testnet
SESSION_SECRET=super_secure_random_string_32_chars_min
```

#### 🎮 Игровые настройки:
```
GAME_MIN_BET=1
GAME_MAX_BET=1000
GAME_HOUSE_EDGE=0.02
```

#### 🌐 CORS настройки:
```
CORS_ORIGIN=https://ваше-app-название.onrender.com
```

#### 📊 Опциональные (мониторинг):
```
PROMETHEUS_ENABLED=false
LOG_LEVEL=info
```

### 5. Инициализация базы данных
После успешного деплоя:
1. Откройте "Shell" в вашем Web Service
2. Запустите миграцию:
   ```bash
   pnpm migrate
   ```

### 6. Проверка деплоя
1. Откройте ваш URL: `https://ваше-app-название.onrender.com`
2. Проверьте endpoints:
   - `/` - главная страница игры
   - `/api/health` - проверка здоровья сервера
   - `/api/metrics` - метрики (если включены)

## 🔧 Команды для локального тестирования продакшн сборки

```bash
# Собрать продакшн версию
pnpm build

# Запустить продакшн сервер локально
pnpm start

# Тестировать с продакшн переменными
NODE_ENV=production DATABASE_URL=your_local_db pnpm start
```

## 🛠️ Troubleshooting

### Ошибка сборки:
- Проверьте, что все зависимости установлены
- Убедитесь, что Node.js версия >= 20

### Ошибка подключения к БД:
- Проверьте DATABASE_URL
- Убедитесь, что база данных доступна
- Запустите миграцию

### Ошибки TON Connect:
- Проверьте TON_API_KEY
- Убедитесь, что манифест доступен по HTTPS

## 📱 Финальная проверка

После деплоя протестируйте:
- ✅ Загрузка главной страницы
- ✅ Подключение TON кошелька
- ✅ Игра в Plinko
- ✅ Создание пользователя
- ✅ Сохранение ставок
- ✅ История транзакций

## 🎉 Поздравляем!
Ваша Plinko игра успешно развернута на Render!

URL: https://ваше-app-название.onrender.com