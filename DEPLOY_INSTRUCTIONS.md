# 📝 ПОШАГОВАЯ ИНСТРУКЦИЯ ДЕПЛОЯ НА RENDER

## ШАГ 1: СОЗДАНИЕ GITHUB РЕПОЗИТОРИЯ ✅ (Выполнено локально)

Локально мы уже:
- ✅ Инициализировали Git
- ✅ Добавили все файлы
- ✅ Создали первый коммит

## ШАГ 2: СОЗДАНИЕ РЕПОЗИТОРИЯ НА GITHUB

### Вариант A: Через веб-интерфейс GitHub

1. Откройте https://github.com и войдите в аккаунт
2. Нажмите "+" в правом верхнем углу → "New repository"
3. Заполните:
   - **Repository name**: `plinko-game` (или любое другое имя)
   - **Description**: "Plinko Casino Game with TON blockchain integration"
   - **Visibility**: Public (для бесплатного деплоя на Render)
   - **НЕ** добавляйте README, .gitignore, license (у нас уже есть)
4. Нажмите "Create repository"

5. GitHub покажет команды для связки с локальным репозиторием:
   ```bash
   git remote add origin https://github.com/ВАШ_USERNAME/plinko-game.git
   git branch -M main
   git push -u origin main
   ```

### Выполните эти команды в терминале:

```powershell
# Замените YOUR_USERNAME на ваш GitHub username
git remote add origin https://github.com/YOUR_USERNAME/plinko-game.git
git branch -M main
git push -u origin main
```

**ВАЖНО**: GitHub попросит авторизацию. Используйте Personal Access Token вместо пароля!

### Как создать Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → "Generate new token (classic)"
3. Выберите срок действия и права: `repo` (все галочки в разделе)
4. Скопируйте токен (он показывается только один раз!)
5. При push используйте токен вместо пароля

---

## ШАГ 3: СОЗДАНИЕ POSTGRESQL БАЗЫ В RENDER

1. Откройте https://render.com и войдите/зарегистрируйтесь
2. На Dashboard нажмите **"New +"** → **"PostgreSQL"**
3. Заполните форму:
   - **Name**: `plinko-game-db`
   - **Database**: `plinko_game`
   - **User**: `plinko_user` (оставьте автоматически)
   - **Region**: выберите ближайший регион (например, Frankfurt)
   - **PostgreSQL Version**: 16 (или последняя доступная)
   - **Datadog API Key**: оставьте пустым
   - **Plan**: **Free** (для начала)
4. Нажмите **"Create Database"**

⏳ Render создаст базу данных (это займет 1-2 минуты)

5. После создания найдите секцию **"Connections"**
6. **ВАЖНО**: Скопируйте **"External Database URL"** - это ваш DATABASE_URL
   - Формат: `postgresql://user:password@host/database`
   - Сохраните его в блокнот - понадобится в следующем шаге!

---

## ШАГ 4: СОЗДАНИЕ WEB SERVICE В RENDER

1. В Render Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите GitHub:
   - Если еще не подключали: нажмите "Connect GitHub" → авторизуйтесь
   - Выберите ваш репозиторий `plinko-game` из списка
   - Нажмите "Connect"

3. Заполните настройки сервиса:
   - **Name**: `plinko-game` (или любое имя - это будет в URL)
   - **Region**: **тот же, что и база данных!** (Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: оставьте пустым
   - **Runtime**: **Node**
   - **Build Command**: 
     ```
     pnpm install && pnpm build
     ```
   - **Start Command**: 
     ```
     pnpm start
     ```
   - **Plan**: **Free** (для начала)

---

## ШАГ 5: ДОБАВЛЕНИЕ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

Прокрутите вниз до секции **"Environment Variables"** и добавьте:

### Обязательные переменные:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Вставьте URL из шага 3 |
| `TON_API_KEY` | `AEBE4GOFFSWC2MAAAAAFVZ24DO3WJWH7IKYUQDS2EF6UAIS2ULVW5XDB4YU3VQYHPGHIC6A` |
| `TON_NETWORK` | `testnet` |
| `SESSION_SECRET` | Любая длинная случайная строка (мин. 32 символа) |

**Пример SESSION_SECRET**: `super_secure_random_string_for_sessions_abc123xyz789`

### Дополнительные переменные (опционально):

| Key | Value |
|-----|-------|
| `GAME_MIN_BET` | `1` |
| `GAME_MAX_BET` | `1000` |
| `GAME_HOUSE_EDGE` | `0.02` |
| `LOG_LEVEL` | `info` |
| `PROMETHEUS_ENABLED` | `false` |

После добавления всех переменных нажмите **"Create Web Service"**

---

## ШАГ 6: ПЕРВЫЙ ДЕПЛОЙ

⏳ Render начнет автоматический деплой:
1. Клонирование репозитория
2. Установка зависимостей (`pnpm install`)
3. Сборка приложения (`pnpm build`)
4. Запуск сервера (`pnpm start`)

**Это займет 5-10 минут** при первом деплое.

Вы увидите логи в реальном времени. Ждите сообщения:
```
==> Your service is live 🎉
```

---

## ШАГ 7: ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ

После успешного деплоя нужно создать таблицы:

1. В Render Dashboard откройте ваш Web Service
2. Перейдите на вкладку **"Shell"** (в левом меню)
3. Нажмите **"Connect via SSH"** или используйте веб-терминал
4. В терминале выполните:
   ```bash
   pnpm migrate
   ```

Вы увидите:
```
🚀 Starting database migration...
✅ Connected to database
📝 Executing database schema...
✅ Database schema created successfully
🎉 Migration completed successfully!
```

---

## ШАГ 8: ПРОВЕРКА РАБОТЫ

1. Скопируйте URL вашего приложения (например: `https://plinko-game.onrender.com`)
2. Откройте его в браузере
3. Проверьте:
   - ✅ Главная страница загружается
   - ✅ Игра Plinko отображается
   - ✅ Можно подключить TON кошелек
   - ✅ Игра работает

4. Проверьте API endpoints:
   - `https://plinko-game.onrender.com/api/health` - должен вернуть статус
   - `https://plinko-game.onrender.com/api/simple-health` - `{"status":"ok"}`

---

## ШАГ 9: ОБНОВЛЕНИЕ TON CONNECT MANIFEST (ВАЖНО!)

После деплоя нужно обновить URL в манифесте:

1. Откройте файл `.well-known/tonconnect-manifest.json` в вашем репозитории
2. Замените URL на ваш Render URL:
   ```json
   {
     "url": "https://ваш-app-name.onrender.com",
     "name": "Plinko Game",
     "iconUrl": "https://ваш-app-name.onrender.com/android-chrome-512x512.png"
   }
   ```
3. Сохраните, закоммитьте и запушьте изменения:
   ```bash
   git add .well-known/tonconnect-manifest.json
   git commit -m "Update TON Connect manifest with production URL"
   git push
   ```
4. Render автоматически пересоберет приложение

---

## 🎉 ГОТОВО!

Ваша Plinko игра запущена в продакшене!

### Полезные ссылки:
- 🌐 Ваше приложение: `https://ваш-app-name.onrender.com`
- 📊 Dashboard Render: https://dashboard.render.com
- 📝 Логи: в Render Dashboard → вкладка "Logs"
- 💾 База данных: в Render Dashboard → ваша PostgreSQL база

---

## 🔄 КАК ОБНОВЛЯТЬ ПРИЛОЖЕНИЕ

1. Внесите изменения в код локально
2. Закоммитьте:
   ```bash
   git add .
   git commit -m "Описание изменений"
   git push
   ```
3. Render **автоматически** пересоберет и задеплоит новую версию!

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### Free план Render:
- 🆓 Бесплатный
- 💤 Сервис "засыпает" после 15 минут неактивности
- ⏰ Первый запрос после сна занимает 30-60 секунд
- 📊 750 часов в месяц (достаточно для одного проекта)

### Чтобы избежать "засыпания":
- Используйте сервис мониторинга (UptimeRobot, Pingdom)
- Или обновитесь на Starter план ($7/месяц)

---

## 🆘 TROUBLESHOOTING

### Проблема: Build failed
- Проверьте логи в Render
- Убедитесь что все зависимости в package.json
- Проверьте NODE_ENV переменную

### Проблема: База данных не подключается
- Проверьте DATABASE_URL в переменных окружения
- Убедитесь что регионы БД и Web Service совпадают
- Запустите миграцию заново

### Проблема: TON Connect не работает
- Обновите manifest с правильным production URL
- Проверьте что TON_API_KEY установлен
- Убедитесь что manifest доступен по HTTPS

---

## 🎓 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Просмотр логов через Render CLI
render logs --tail

# Просмотр статуса сервиса
render services list

# Перезапуск сервиса
render services restart plinko-game
```

**УСПЕХОВ С ДЕПЛОЕМ! 🚀**