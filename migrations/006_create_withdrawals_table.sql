-- Создание таблицы для выводов средств
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 6) NOT NULL CHECK (amount > 0),
    fee DECIMAL(15, 6) DEFAULT 0,
    net_amount DECIMAL(15, 6) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'manual_review')),
    auto_process BOOLEAN DEFAULT false,
    transaction_hash VARCHAR(255),
    error_message TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_process ON withdrawals(auto_process);

-- Добавляем комментарии
COMMENT ON TABLE withdrawals IS 'Таблица для хранения запросов на вывод средств';
COMMENT ON COLUMN withdrawals.status IS 'Статус вывода: pending, processing, completed, failed, cancelled, manual_review';
COMMENT ON COLUMN withdrawals.transaction_hash IS 'Hash транзакции в блокчейне TON';
COMMENT ON COLUMN withdrawals.fee IS 'Комиссия за вывод';
COMMENT ON COLUMN withdrawals.net_amount IS 'Сумма к выводу после вычета комиссии';
COMMENT ON COLUMN withdrawals.auto_process IS 'Флаг автоматической обработки';
COMMENT ON COLUMN withdrawals.admin_notes IS 'Заметки администратора';
COMMENT ON COLUMN withdrawals.reviewed_by IS 'ID администратора, проверившего заявку';
