# Plinko Game - Настройка системы депозитов

## Реализованная функциональность

### 1. Система депозитов с TON Connect
- Пользователь вводит сумму и нажимает "Пополнить"
- Создается запись в таблице `deposits` с статусом "pending"
- TON Connect SDK генерирует ссылку для транзакции
- Пользователь подтверждает транзакцию в кошельке
- Backend проверяет транзакцию в блокчейне через TON API
- При подтверждении обновляется баланс пользователя

### 2. Новые API endpoints

#### `/api/deposits/create` (POST)
Создает новую запись о депозите:
```json
{
  "user_id": 1,
  "amount": 1.5,
  "wallet_address": "UQABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr"
}
```

#### `/api/deposits/verify` (POST)
Проверяет статус депозита в блокчейне:
```json
{
  "deposit_id": 123
}
```

#### `/api/game/wallet` (GET)
Возвращает адрес игрового кошелька:
```json
{
  "wallet_address": "UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX"
}
```

### 3. Таблица deposits
```sql
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    wallet_address VARCHAR(48) NOT NULL,
    amount DECIMAL(10,6) NOT NULL,
    transaction_hash VARCHAR(128),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    CONSTRAINT deposits_status_check CHECK (status IN ('pending', 'confirmed', 'failed'))
);
```

## Настройка для продакшена

### 1. Получите TON API ключ
1. Зайдите на https://tonapi.io/
2. Зарегистрируйтесь и получите API ключ
3. Добавьте ключ в `.env` файл:
```
TONAPI_KEY=ваш_реальный_ключ_tonapi
```

### 2. Настройте игровой кошелек
1. Создайте новый TON кошелек для игры
2. Получите его адрес в формате UQ... (48 символов)
3. Обновите в `.env`:
```
GAME_WALLET_ADDRESS=UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX
```

### 3. Безопасность
- ✅ Все транзакции проверяются в блокчейне
- ✅ Адреса пользователей сохраняются для предотвращения подделки
- ✅ Используется таблица deposits для отслеживания статуса
- ✅ Проверка суммы с допустимой погрешностью 0.001 TON
- ✅ Проверка времени транзакции

### 4. Манифест TON Connect
Манифест уже опубликован на GitHub Pages:
https://plinko-game-9hku.onrender.com/.well-known/tonconnect-manifest.json

## Как тестировать

1. Запустите проект: `npm run dev`
2. Подключите кошелек на странице `/auth`
3. Перейдите в профиль
4. Попробуйте создать депозит
5. Подтвердите транзакцию в кошельке
6. Система автоматически проверит статус каждые 30 секунд

## Курс конвертации
- TON → Stars: 1 TON = 145 Stars
- Stars → TON: 155 Stars = 1 TON

## Что делать дальше
1. Добавьте реальный TON API ключ в .env
2. Замените игровой кошелек на ваш реальный
3. Протестируйте с реальными, но небольшими суммами
4. При необходимости добавьте уведомления пользователям о статусе депозита