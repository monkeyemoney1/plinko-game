import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLogs, clearLogs, getStats } from '$lib/server/logger.js';
import { env as privateEnv } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
  const password = url.searchParams.get('password');
  const expected = privateEnv.ADMIN_PASSWORD || '2282211q';
  if (password !== expected) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limit = parseInt(url.searchParams.get('limit') || '500');
  const level = url.searchParams.get('level') || null;
  const format = url.searchParams.get('format') || 'json';
  const logs = getLogs(limit, level);
  const stats = getStats();
  if (format === 'text') {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    return new Response(text, { headers: { 'Content-Type': 'text/plain' } });
  }
  return json({ success: true, logs, stats, limit, level });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const pwd = request.headers.get('X-Admin-Password');
  const expected = privateEnv.ADMIN_PASSWORD || '2282211q';
  if (pwd !== expected) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  clearLogs();
  console.log('[LOGS] Cleared by admin');
  return json({ success: true });
};
