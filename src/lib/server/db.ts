import { Pool } from 'pg';
import { env } from '$env/dynamic/private';

// Используем SvelteKit API для динамических приватных переменных окружения
const connectionString = env.DATABASE_URL;
if (!connectionString) {
  console.error('[DB] DATABASE_URL не определён через $env/dynamic/private. Проверьте файл .env (должен лежать в корне plinkogame) и имя переменной без префикса VITE_.');
  throw new Error('DATABASE_URL not set');
}

// Database pool configuration
export const pool = new Pool({ 
  connectionString,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

try {
  const masked = connectionString.replace(/:(.*?)@/, ':****@');
  const user = connectionString.split('://')[1]?.split('@')[0]?.split(':')[0];
  console.log('[DB] Using connection user:', user, 'conn:', masked);
} catch {
  // ignore mask errors
}

export async function getClient() {
  return pool.connect();
}

export async function ensureUser(params: {
  ton_address: string;
  public_key?: string | null;
  wallet_type?: string | null;
  wallet_version?: string | null;
  telegram_username?: string | null;
  telegram_id?: number | null;
}): Promise<{ id: number } & Record<string, any>> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Храним адрес ровно в том виде, как пришёл от клиента (TON Connect может отдавать UQ/EQ/raw)
    const inputAddress = (params.ton_address || '').trim();
    if (!inputAddress) {
      throw new Error('TON address is required');
    }

    const selectRes = await client.query(
      `SELECT * FROM users WHERE ton_address = $1 FOR UPDATE`,
      [inputAddress],
    );
    let userRow;
    if (selectRes.rows.length === 0) {
      const insertRes = await client.query(
        `INSERT INTO users (ton_address, public_key, wallet_type, wallet_version, telegram_username, telegram_id, stars_balance, ton_balance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          inputAddress,
          params.public_key || null,
          params.wallet_type || null,
          params.wallet_version || null,
          params.telegram_username || null,
          params.telegram_id || null,
          0,
          0
        ],
      );
      userRow = insertRes.rows[0];
    } else {
      const updateRes = await client.query(
        `UPDATE users
           SET public_key = COALESCE($1, public_key),
               wallet_type = COALESCE($2, wallet_type),
               wallet_version = COALESCE($3, wallet_version),
               telegram_username = COALESCE($4, telegram_username),
               telegram_id = COALESCE($5, telegram_id),
               last_login = NOW(),
               updated_at = NOW()
         WHERE ton_address = $6 RETURNING *`,
        [
          params.public_key || null,
          params.wallet_type || null,
          params.wallet_version || null,
          params.telegram_username || null,
          params.telegram_id || null,
          inputAddress,
        ],
      );
      userRow = updateRes.rows[0];
    }
    await client.query('COMMIT');
    return userRow;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Совместимый helper, аналогичный `$lib/db` для существующих вызовов
export const db = {
  async query(text: string, params?: any[]) {
    const client = await getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  },
  async getClient() {
    return await getClient();
  }
};
