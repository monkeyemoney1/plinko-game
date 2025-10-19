import { json } from '@sveltejs/kit';
import { trackWalletConnection } from '$lib/utils/wallet-tracking';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { user_id, wallet_address } = await request.json();
    
    if (!user_id || !wallet_address) {
      return json({ error: 'user_id и wallet_address обязательны' }, { status: 400 });
    }
    
    await trackWalletConnection(user_id, wallet_address);
    
    return json({ success: true });
  } catch (error) {
    console.error('Ошибка отслеживания подключения кошелька:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};