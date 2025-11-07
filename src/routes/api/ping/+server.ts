import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  console.log('[PING] GET /api/ping');
  return json({ ok: true, timestamp: new Date().toISOString() });
};
