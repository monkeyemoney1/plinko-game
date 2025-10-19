-- База данных для Plinko Game с TON Connect и Telegram интеграцией
-- Используется PostgreSQL

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    ton_address VARCHAR(100) UNIQUE NOT NULL,
    public_key VARCHAR(100),
    wallet_type VARCHAR(50),
    wallet_version VARCHAR(20),
    telegram_username VARCHAR(100),
    telegram_id BIGINT,
    stars_balance DECIMAL(10, 2) DEFAULT 1000.00,
    ton_balance DECIMAL(18, 9) DEFAULT 0.000000000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблица игровых сессий
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    network VARCHAR(20) DEFAULT 'mainnet', -- mainnet/testnet
    is_active BOOLEAN DEFAULT true
);

-- Таблица ставок/игр
CREATE TABLE game_bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL,
    bet_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'STARS', -- STARS/TON
    risk_level VARCHAR(10) NOT NULL, -- LOW/MEDIUM/HIGH
    rows_count INTEGER NOT NULL,
    multiplier DECIMAL(8, 4),
    payout DECIMAL(10, 2) DEFAULT 0.00,
    profit DECIMAL(10, 2) DEFAULT 0.00,
    is_win BOOLEAN DEFAULT false,
    ball_path TEXT, -- JSON массив пути шарика
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица транзакций TON
CREATE TABLE ton_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(100) UNIQUE,
    transaction_type VARCHAR(20) NOT NULL, -- DEPOSIT/WITHDRAWAL/BET/PAYOUT
    amount DECIMAL(18, 9) NOT NULL,
    from_address VARCHAR(100),
    to_address VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING/CONFIRMED/FAILED
    block_number BIGINT,
    fee DECIMAL(18, 9),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Таблица пополнений и выводов
CREATE TABLE balance_operations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(20) NOT NULL, -- DEPOSIT/WITHDRAWAL
    currency VARCHAR(10) NOT NULL, -- STARS/TON
    amount DECIMAL(18, 9) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING/COMPLETED/FAILED/CANCELLED
    ton_transaction_id INTEGER REFERENCES ton_transactions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Таблица депозитов
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(100) NOT NULL,
    amount DECIMAL(18, 9) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending/confirmed/failed
    transaction_hash VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Таблица логов событий
CREATE TABLE event_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- LOGIN/LOGOUT/BET/WIN/DEPOSIT/WITHDRAWAL/ERROR
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек пользователя
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    animations_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_users_ton_address ON users(ton_address);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_game_bets_user_id ON game_bets(user_id);
CREATE INDEX idx_game_bets_created_at ON game_bets(created_at);
CREATE INDEX idx_game_bets_user_created ON game_bets(user_id, created_at);

CREATE INDEX idx_ton_transactions_hash ON ton_transactions(transaction_hash);
CREATE INDEX idx_ton_transactions_user_id ON ton_transactions(user_id);
CREATE INDEX idx_ton_transactions_status ON ton_transactions(status);
CREATE INDEX idx_ton_transactions_created_at ON ton_transactions(created_at);

CREATE INDEX idx_balance_operations_user_id ON balance_operations(user_id);
CREATE INDEX idx_balance_operations_status ON balance_operations(status);
CREATE INDEX idx_balance_operations_created_at ON balance_operations(created_at);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_transaction_hash ON deposits(transaction_hash);
CREATE INDEX idx_deposits_created_at ON deposits(created_at);

CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_active ON game_sessions(is_active);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных данных (опционально)
-- INSERT INTO users (ton_address, telegram_username) VALUES 
-- ('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG', 'test_user');