console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 Создание таблицы withdrawals в Production БД            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Шаги для выполнения:\n');

console.log('1️⃣  Зайдите на Render Dashboard:');
console.log('   https://dashboard.render.com\n');

console.log('2️⃣  Найдите вашу PostgreSQL базу данных\n');

console.log('3️⃣  Откройте "Shell" или подключитесь через External URL\n');

console.log('4️⃣  Выполните SQL из файла:');
console.log('   📄 sql/create_withdrawals_table.sql\n');

console.log('5️⃣  Или скопируйте и вставьте эту команду:\n');

console.log('─'.repeat(65));
console.log(`
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

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_process ON withdrawals(auto_process);
`);
console.log('─'.repeat(65));

console.log('\n✅ После выполнения SQL проверьте:');
console.log('   SELECT * FROM withdrawals LIMIT 1;\n');

console.log('📖 Подробная инструкция: WITHDRAWAL_TABLE_SETUP.md\n');
