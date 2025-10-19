import { json } from '@sveltejs/kit';
import { GAME_WALLET_ADDRESS } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const walletAddress = GAME_WALLET_ADDRESS || 'UQAAPcRiR3yfX-8TfKKiPHtVBzNmHl6zI6jLNFLz2aBlHLCR';
  
  return json({
    success: true,
    address: walletAddress,
    wallet_address: walletAddress // Для обратной совместимости
  });
};