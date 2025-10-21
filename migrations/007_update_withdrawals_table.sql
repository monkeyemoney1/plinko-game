-- Миграция для обновления таблицы withdrawals
-- Добавляем новые поля для улучшенной системы выплат

-- Добавляем новые колонки
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS fee DECIMAL(15, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15, 6),
ADD COLUMN IF NOT EXISTS auto_process BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);

-- Обновляем существующие статусы
ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS withdrawals_status_check,
ADD CONSTRAINT withdrawals_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'manual_review'));

-- Заполняем net_amount для существующих записей (если fee не задан, то net_amount = amount)
UPDATE withdrawals 
SET net_amount = amount 
WHERE net_amount IS NULL;

-- Делаем net_amount обязательным полем
ALTER TABLE withdrawals 
ALTER COLUMN net_amount SET NOT NULL;

-- Создаем индекс для автообработки
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_process ON withdrawals(auto_process);

-- Обновляем комментарии
COMMENT ON COLUMN withdrawals.fee IS 'Комиссия за вывод';
COMMENT ON COLUMN withdrawals.net_amount IS 'Сумма к выводу после вычета комиссии';
COMMENT ON COLUMN withdrawals.auto_process IS 'Флаг автоматической обработки';
COMMENT ON COLUMN withdrawals.admin_notes IS 'Заметки администратора';
COMMENT ON COLUMN withdrawals.reviewed_by IS 'ID администратора, проверившего заявку';