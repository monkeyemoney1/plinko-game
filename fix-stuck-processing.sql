-- SQL для восстановления застрявших processing заявок

-- Вариант 1: Вернуть processing заявки обратно в pending для повторной обработки
-- (если TON транзакция НЕ была отправлена)
UPDATE withdrawals 
SET status = 'pending', 
    error_message = 'Returned to pending from stuck processing state'
WHERE status = 'processing' 
  AND completed_at IS NULL 
  AND transaction_hash IS NULL;

-- Вариант 2: Если нужно отменить и вернуть деньги пользователям
-- (используйте через admin refund endpoint или вручную)
-- UPDATE withdrawals SET status = 'cancelled' WHERE status = 'processing';
-- UPDATE users SET ton_balance = ton_balance + (SELECT amount FROM withdrawals WHERE id = <ID>) WHERE id = <USER_ID>;

-- Проверка статуса заявок после обновления
SELECT id, user_id, amount, wallet_address, status, created_at, error_message
FROM withdrawals 
WHERE status IN ('processing', 'pending')
ORDER BY created_at DESC;
