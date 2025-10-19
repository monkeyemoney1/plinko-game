import { json } from '@sveltejs/kit';
import { ensureUser } from '$lib/server/db';

export async function GET() {
  try {
    // Тестируем создание пользователя напрямую
    const testUser = await ensureUser({
      ton_address: 'test_' + Date.now(),
      public_key: 'test_key',
      wallet_type: 'debug',
      wallet_version: '1.0'
    });

    return json({
      success: true,
      message: 'Database connection successful',
      user: testUser
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return json({
      success: false,
      error: errorMessage,
      details: error
    }, { status: 500 });
  }
}