# API Документация - Plinko Game

## Обзор

API для игры Plinko с интеграцией TON Connect и базой данных PostgreSQL.

**Base URL**: `http://localhost:5173/api`

---

## 🎮 Игровые эндпоинты

### POST /bets
Создание новой ставки в игре Plinko

**Request Body:**
```json
{
  "user_id": 1,
  "bet_amount": 10.0,
  "currency": "STARS",
  "risk_level": "MEDIUM",
  "rows_count": 12
}
```

**Response:**
```json
{
  "success": true,
  "bet": {
    "id": 123,
    "multiplier": 2.5,
    "payout": 25.0,
    "profit": 15.0,
    "is_win": true,
    "ball_path": [0, 1, 1, 2, 3, 3, 4, 5, 6],
    "created_at": "2025-01-14T..."
  },
  "balance": {
    "stars_balance": 1015.0,
    "ton_balance": 0.0
  }
}
```

**Параметры:**
- `risk_level`: LOW, MEDIUM, HIGH
- `rows_count`: 8, 12, 16
- `currency`: STARS, TON

---

## 👤 Пользователи

### POST /users
Регистрация/обновление пользователя через TON Connect

**Request Body:**
```json
{
  "ton_address": "EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG",
  "public_key": "ed25519_key...",
  "wallet_type": "tonkeeper",
  "wallet_version": "2.0",
  "telegram_username": "@username",
  "telegram_id": 123456789
}
```

### GET /users/{id}/balance
Получение баланса пользователя

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "ton_address": "EQBvW8Z5...",
    "balance": {
      "stars": 1000.0,
      "ton": 0.0
    },
    "last_login": "2025-01-14T...",
    "created_at": "2025-01-13T..."
  }
}
```

### GET /users/{id}/games
Получение истории игр пользователя

**Query Parameters:**
- `page`: номер страницы (по умолчанию 1)
- `limit`: количество записей (по умолчанию 20, максимум 100)
- `currency`: STARS или TON
- `risk_level`: LOW, MEDIUM, HIGH
- `only_wins`: true/false

**Response:**
```json
{
  "success": true,
  "games": [
    {
      "id": 123,
      "bet_amount": 10.0,
      "currency": "STARS",
      "risk_level": "MEDIUM",
      "rows_count": 12,
      "multiplier": 2.5,
      "payout": 25.0,
      "profit": 15.0,
      "is_win": true,
      "ball_path": [0, 1, 1, 2, 3, 3, 4, 5, 6],
      "created_at": "2025-01-14T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "stats": {
    "total_games": 100,
    "total_wins": 45,
    "win_rate": 45.0,
    "total_wagered": 1000.0,
    "total_payout": 950.0,
    "total_profit": -50.0,
    "max_multiplier": 110.0
  }
}
```

### GET /users/{id}/settings
Получение настроек пользователя

**Response:**
```json
{
  "success": true,
  "settings": {
    "animations_enabled": true,
    "sound_enabled": true,
    "notifications_enabled": true,
    "theme": "dark",
    "language": "ru",
    "created_at": "2025-01-14T...",
    "updated_at": "2025-01-14T..."
  }
}
```

### PUT /users/{id}/settings
Обновление настроек пользователя

**Request Body:**
```json
{
  "animations_enabled": false,
  "sound_enabled": true,
  "notifications_enabled": true,
  "theme": "light",
  "language": "en"
}
```

---

## 🎯 Игровые сессии

### POST /sessions
Создание новой игровой сессии

**Request Body:**
```json
{
  "user_id": 1,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "network": "mainnet"
}
```

### GET /sessions?user_id={id}
Получение активной сессии пользователя

### DELETE /sessions?user_id={id}
Закрытие всех активных сессий пользователя

---

## 💰 TON Транзакции

### POST /transactions
Создание новой TON транзакции

**Request Body:**
```json
{
  "user_id": 1,
  "transaction_hash": "abc123...",
  "transaction_type": "DEPOSIT",
  "amount": 1.5,
  "from_address": "EQBvW8Z5...",
  "to_address": "EQCxE6mUtQJKFnGfaROTKOt...",
  "fee": 0.001
}
```

**transaction_type**: DEPOSIT, WITHDRAWAL, BET, PAYOUT

### GET /transactions?user_id={id}
Получение транзакций пользователя

**Query Parameters:**
- `user_id`: ID пользователя (обязательно)
- `status`: PENDING, CONFIRMED, FAILED
- `type`: DEPOSIT, WITHDRAWAL, BET, PAYOUT
- `page`, `limit`: пагинация

### PUT /transactions
Обновление статуса транзакции

**Request Body:**
```json
{
  "transaction_hash": "abc123...",
  "status": "CONFIRMED",
  "block_number": 12345678,
  "confirmed_at": "2025-01-14T12:00:00Z"
}
```

---

## 🛠️ Дебаг эндпоинты

### GET /debug
Тестирование подключения к базе данных

**Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "user": {
    "id": 999,
    "ton_address": "test_1734567890",
    "created_at": "2025-01-14T..."
  }
}
```

---

## 📊 Статусы и коды ошибок

### HTTP Status Codes
- `200` - Успешно
- `400` - Неверные параметры запроса
- `404` - Ресурс не найден
- `409` - Конфликт (например, дублирующийся хеш транзакции)
- `500` - Внутренняя ошибка сервера

### Примеры ошибок
```json
{
  "error": "Missing required fields: user_id, bet_amount",
  "details": "Validation failed"
}
```

```json
{
  "error": "Insufficient balance",
  "current_balance": 5.0,
  "required": 10.0
}
```

---

## 🎲 Механика игры Plinko

### Таблицы множителей

**LOW Risk (8 рядов)**: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6]
**MEDIUM Risk (12 рядов)**: [24, 5, 1.8, 1.3, 0.9, 0.7, 0.4, 0.7, 0.9, 1.3, 1.8, 5, 24]
**HIGH Risk (16 рядов)**: [110, 41, 10, 5, 1.9, 0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 1.9, 5, 10, 41, 110]

### Логика расчёта
1. Шарик падает через rows_count рядов
2. На каждом ряду случайное направление (влево/вправо)
3. Финальная позиция определяет множитель
4. Выплата = ставка × множитель
5. Прибыль = выплата - ставка

---

## 🔒 Безопасность

- Все денежные операции в транзакциях
- Проверка баланса перед ставками
- Валидация всех входных параметров
- Защита от SQL инъекций через параметризованные запросы
- Уникальность хешей транзакций