-- Добавление таблицы deposits для отслеживания депозитов
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(100) NOT NULL,
    amount DECIMAL(18, 9) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending/confirmed/failed
    transaction_hash VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_transaction_hash ON deposits(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);
