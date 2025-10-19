-- Создание таблицы для выводов средств
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 6) NOT NULL CHECK (amount > 0),
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_hash VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- Добавляем комментарии
COMMENT ON TABLE withdrawals IS 'Таблица для хранения запросов на вывод средств';
COMMENT ON COLUMN withdrawals.status IS 'Статус вывода: pending, processing, completed, failed';
COMMENT ON COLUMN withdrawals.transaction_hash IS 'Hash транзакции в блокчейне TON';