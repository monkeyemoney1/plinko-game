-- Тестовые SQL запросы для проверки базы данных

-- 1. Проверка структуры таблиц
\dt

-- 2. Проверка структуры таблицы users
\d users

-- 3. Добавление тестового пользователя
INSERT INTO users (ton_address, telegram_username, telegram_id) 
VALUES ('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG', 'test_user', 123456789);

-- 4. Проверка добавленного пользователя
SELECT * FROM users;

-- 5. Добавление игровой сессии
INSERT INTO game_sessions (user_id, ip_address, user_agent, network) 
VALUES (1, '127.0.0.1', 'Mozilla/5.0', 'mainnet');

-- 6. Добавление тестовой ставки
INSERT INTO game_bets (user_id, session_id, bet_amount, currency, risk_level, rows_count, multiplier, payout, profit, is_win, ball_path) 
VALUES (1, 1, 10.00, 'STARS', 'MEDIUM', 16, 2.5, 25.00, 15.00, true, '[0,1,0,1,1,0,1,0,1,1,0,1,0,1,1,0]');

-- 7. Добавление настроек пользователя
INSERT INTO user_settings (user_id, animations_enabled, sound_enabled, theme, language) 
VALUES (1, true, true, 'dark', 'ru');

-- 8. Добавление события в лог
INSERT INTO event_logs (user_id, event_type, event_data, ip_address) 
VALUES (1, 'LOGIN', '{"wallet_type": "tonkeeper", "wallet_version": "2.0"}', '127.0.0.1');

-- 9. Статистика по пользователю
SELECT 
    u.id,
    u.ton_address,
    u.telegram_username,
    u.stars_balance,
    u.ton_balance,
    COUNT(gb.id) as total_bets,
    SUM(gb.profit) as total_profit,
    SUM(CASE WHEN gb.is_win THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN NOT gb.is_win THEN 1 ELSE 0 END) as losses
FROM users u
LEFT JOIN game_bets gb ON u.id = gb.user_id
WHERE u.id = 1
GROUP BY u.id;

-- 10. Проверка всех таблиц с данными
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'game_sessions', COUNT(*) FROM game_sessions
UNION ALL
SELECT 'game_bets', COUNT(*) FROM game_bets
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings
UNION ALL
SELECT 'event_logs', COUNT(*) FROM event_logs;

-- 11. Последние ставки
SELECT 
    gb.id,
    u.telegram_username,
    gb.bet_amount,
    gb.currency,
    gb.risk_level,
    gb.multiplier,
    gb.profit,
    gb.is_win,
    gb.created_at
FROM game_bets gb
JOIN users u ON gb.user_id = u.id
ORDER BY gb.created_at DESC
LIMIT 10;