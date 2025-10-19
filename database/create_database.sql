-- Файл для создания базы данных Plinko Game
-- Выполните этот скрипт как суперпользователь PostgreSQL (postgres)

-- Создание базы данных
CREATE DATABASE plinko_game 
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Russian_Russia.1251'
    LC_CTYPE = 'Russian_Russia.1251'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Создание пользователя для приложения (опционально)
CREATE USER plinko_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Предоставление привилегий
GRANT CONNECT ON DATABASE plinko_game TO plinko_user;
GRANT USAGE ON SCHEMA public TO plinko_user;
GRANT CREATE ON SCHEMA public TO plinko_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO plinko_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO plinko_user;

-- Для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO plinko_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO plinko_user;