-- Создание таблицы для Telegram Stars транзакций
CREATE TABLE IF NOT EXISTS star_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    amount INTEGER NOT NULL, -- количество Stars
    payload VARCHAR(255) UNIQUE NOT NULL, -- уникальный идентификатор транзакции
    status VARCHAR(20) DEFAULT 'pending', -- pending/completed/failed/cancelled
    telegram_payment_charge_id VARCHAR(255), -- ID платежа от Telegram
    provider_payment_charge_id VARCHAR(255), -- ID от провайдера
    invoice_url TEXT, -- ссылка на invoice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Дополнительные данные о платеже
    currency VARCHAR(10) DEFAULT 'XTR', -- XTR = Telegram Stars
    title TEXT,
    description TEXT,
    
    -- Индексы для быстрого поиска
    CONSTRAINT unique_payload UNIQUE (payload)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_star_transactions_user_id ON star_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_star_transactions_telegram_id ON star_transactions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_star_transactions_status ON star_transactions(status);
CREATE INDEX IF NOT EXISTS idx_star_transactions_payload ON star_transactions(payload);
CREATE INDEX IF NOT EXISTS idx_star_transactions_created_at ON star_transactions(created_at);

-- Добавляем поле telegram_id в таблицу users если его нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Индекс для telegram_id в users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id_unique ON users(telegram_id);