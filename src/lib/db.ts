import { Pool } from 'pg';

// Database configuration with environment variables support
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Fallback for local development
  user: process.env.DATABASE_URL ? undefined : 'postgres',
  host: process.env.DATABASE_URL ? undefined : 'localhost',
  database: process.env.DATABASE_URL ? undefined : 'plinko_game',
  password: process.env.DATABASE_URL ? undefined : 'PapaDianki2231',
  port: process.env.DATABASE_URL ? undefined : 5432,
});

// Test connection and export for use in API routes
export const db = {
  async query(text: string, params?: any[]) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  },
  
  async getClient() {
    return await pool.connect();
  }
};