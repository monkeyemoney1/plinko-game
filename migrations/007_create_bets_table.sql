-- Создание таблицы для отслеживания ставок в реальном времени
CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bet_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'STARS',
    risk_level VARCHAR(10) NOT NULL,
    rows_count INTEGER NOT NULL,
    ball_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    
    -- Результаты игры (заполняются после завершения)
    bin_index INTEGER,
    multiplier NUMERIC(10, 4),
    payout NUMERIC(10, 2),
    profit NUMERIC(10, 2),
    is_win BOOLEAN,
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Индексы для быстрого поиска
    CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_ball_id ON bets(ball_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);

-- Уникальный индекс для предотвращения дублирования ставок по ball_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_unique_ball ON bets(ball_id, user_id);