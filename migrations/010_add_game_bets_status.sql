-- Добавление поля status в таблицу game_bets и поля updated_at
ALTER TABLE game_bets 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Обновляем существующие записи
UPDATE game_bets SET status = 'completed' WHERE status IS NULL;

-- Создаем индекс для быстрого поиска pending ставок
CREATE INDEX IF NOT EXISTS idx_game_bets_status ON game_bets(status);

COMMENT ON COLUMN game_bets.status IS 'Статус ставки: pending (ожидает завершения), completed (завершена)';
