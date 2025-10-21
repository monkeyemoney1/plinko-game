-- Миграция для обновления таблицы withdrawals
-- Добавляем новые поля для улучшенной системы выплат
-- Эта миграция применяется только если таблица уже создана через 006_create_withdrawals_table.sql

-- Проверяем существование таблицы перед обновлением
DO $$ 
BEGIN
    -- Проверяем, существует ли таблица withdrawals
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        -- Добавляем новые колонки если их нет
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'fee') THEN
            ALTER TABLE withdrawals ADD COLUMN fee DECIMAL(15, 6) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'net_amount') THEN
            ALTER TABLE withdrawals ADD COLUMN net_amount DECIMAL(15, 6);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'auto_process') THEN
            ALTER TABLE withdrawals ADD COLUMN auto_process BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'admin_notes') THEN
            ALTER TABLE withdrawals ADD COLUMN admin_notes TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'reviewed_by') THEN
            ALTER TABLE withdrawals ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
        END IF;
        
        -- Заполняем net_amount для существующих записей
        UPDATE withdrawals 
        SET net_amount = amount 
        WHERE net_amount IS NULL;
        
        -- Делаем net_amount обязательным полем если он не NULL
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'net_amount' AND is_nullable = 'YES') THEN
            ALTER TABLE withdrawals ALTER COLUMN net_amount SET NOT NULL;
        END IF;
        
        RAISE NOTICE 'Withdrawals table updated successfully';
    ELSE
        RAISE NOTICE 'Withdrawals table does not exist yet, skipping update migration';
    END IF;
END $$;