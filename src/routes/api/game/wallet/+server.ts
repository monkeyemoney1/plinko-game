import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const walletAddress = env.GAME_WALLET_ADDRESS || 'UQBUqJjVTapj2_4J_CMte8FWrJ2hy4WRBIJLBymMuATA2jCX';
  
  return json({
    success: true,
    address: walletAddress,
    wallet_address: walletAddress // Для обратной совместимости
  });
};