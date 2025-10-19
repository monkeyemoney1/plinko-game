# ✅ ЧЕК-ЛИСТ ДЕПЛОЯ PLINKO GAME НА RENDER

## 📦 ЛОКАЛЬНАЯ ПОДГОТОВКА (Выполнено)

- [x] Установлен @sveltejs/adapter-node
- [x] Обновлен svelte.config.js
- [x] Настроены скрипты в package.json
- [x] Создан скрипт миграции
- [x] Настроена база данных для продакшна
- [x] Протестирована продакшн сборка (`pnpm build`)
- [x] Инициализирован Git репозиторий
- [x] Созданы коммиты с кодом
- [x] Созданы инструкции деплоя

---

## 🌐 GITHUB (Нужно выполнить)

- [ ] Войти на https://github.com
- [ ] Создать новый репозиторий `plinko-game`
- [ ] Настроить как Public репозиторий
- [ ] Скопировать команды для связки с локальным Git
- [ ] Создать Personal Access Token (если нужно)
- [ ] Выполнить команды:
  ```powershell
  git remote add origin https://github.com/YOUR_USERNAME/plinko-game.git
  git branch -M main
  git push -u origin main
  ```
- [ ] Проверить что код появился на GitHub

---

## 🗄️ RENDER: БАЗА ДАННЫХ (После GitHub)

- [ ] Зарегистрироваться/войти на https://render.com
- [ ] Нажать "New +" → "PostgreSQL"
- [ ] Заполнить форму:
  - Name: `plinko-game-db`
  - Database: `plinko_game`
  - Region: Frankfurt (или ближайший)
  - Plan: Free
- [ ] Нажать "Create Database"
- [ ] Дождаться создания (1-2 минуты)
- [ ] Скопировать "External Database URL"
- [ ] Сохранить URL в блокнот

---

## 🚀 RENDER: WEB SERVICE (После создания БД)

- [ ] В Render нажать "New +" → "Web Service"
- [ ] Подключить GitHub аккаунт
- [ ] Выбрать репозиторий `plinko-game`
- [ ] Заполнить настройки:
  - Name: `plinko-game`
  - Region: тот же что БД
  - Branch: `main`
  - Runtime: Node
  - Build Command: `pnpm install && pnpm build`
  - Start Command: `pnpm start`
  - Plan: Free

---

## 🔧 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (В форме Web Service)

Добавить в секции "Environment Variables":

- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` = URL из предыдущего шага
- [ ] `TON_API_KEY` = `AEBE4GOFFSWC2MAAAAAFVZ24DO3WJWH7IKYUQDS2EF6UAIS2ULVW5XDB4YU3VQYHPGHIC6A`
- [ ] `TON_NETWORK` = `testnet`
- [ ] `SESSION_SECRET` = любая длинная строка (32+ символа)

Опционально:
- [ ] `GAME_MIN_BET` = `1`
- [ ] `GAME_MAX_BET` = `1000`
- [ ] `LOG_LEVEL` = `info`

- [ ] Нажать "Create Web Service"

---

## ⏳ ПЕРВЫЙ ДЕПЛОЙ (Автоматически)

- [ ] Дождаться окончания сборки (5-10 минут)
- [ ] Проверить логи на наличие ошибок
- [ ] Убедиться что появилось: "Your service is live 🎉"
- [ ] Скопировать URL приложения

---

## 💾 ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ

- [ ] Открыть Web Service в Render Dashboard
- [ ] Перейти на вкладку "Shell"
- [ ] Выполнить команду: `pnpm migrate`
- [ ] Проверить успешное создание таблиц

---

## 🧪 ПРОВЕРКА РАБОТЫ

- [ ] Открыть URL приложения в браузере
- [ ] Проверить загрузку главной страницы
- [ ] Проверить что игра Plinko отображается
- [ ] Проверить API: `/api/health`
- [ ] Попробовать подключить TON кошелек
- [ ] Сделать тестовую ставку

---

## 🔄 ОБНОВЛЕНИЕ TON MANIFEST

- [ ] Открыть `.well-known/tonconnect-manifest.json`
- [ ] Заменить URL на production URL
- [ ] Закоммитить и запушить:
  ```powershell
  git add .well-known/tonconnect-manifest.json
  git commit -m "Update TON manifest with production URL"
  git push
  ```
- [ ] Дождаться автоматического редеплоя

---

## 🎉 ГОТОВО!

- [ ] Игра работает в продакшне
- [ ] Все функции протестированы
- [ ] URL сохранен и расшарен

---

## 📌 ПОЛЕЗНЫЕ ССЫЛКИ

После деплоя заполните:

- **Приложение**: https://__________.onrender.com
- **GitHub репо**: https://github.com/________/plinko-game
- **Render Dashboard**: https://dashboard.render.com
- **База данных**: (в Render Dashboard)

---

## 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

1. Проверьте логи в Render Dashboard → Logs
2. Убедитесь что все переменные окружения добавлены
3. Проверьте что миграция выполнена
4. Смотрите TROUBLESHOOTING в DEPLOY_INSTRUCTIONS.md

**УДАЧИ! 🚀**