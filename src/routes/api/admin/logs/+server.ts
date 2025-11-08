import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLogs, clearLogs, getStats } from '$lib/server/logger.js';
import { env as privateEnv } from '$env/dynamic/private';

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLogs, clearLogs, getStats } from '$lib/server/logger.js';
import { getDirectLogs, getDirectStats } from '$lib/server/logger-direct.js';
import { env as privateEnv } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
  const password = url.searchParams.get('password');
  const expected = privateEnv.ADMIN_PASSWORD || '2282211q';
  if (password !== expected) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limit = parseInt(url.searchParams.get('limit') || '500');
  const level = url.searchParams.get('level') || null;
  const format = url.searchParams.get('format') || 'json';
  
  // Combine regular and direct logs
  const regularLogs = getLogs(limit, level);
  const directLogs = getDirectLogs(limit, level);
  const allLogs = [...regularLogs, ...directLogs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);

  const regularStats = getStats();
  const directStats = getDirectStats();
  const stats = {
    total: regularStats.total + directStats.total,
    info: regularStats.info + directStats.info,
    warn: regularStats.warn + directStats.warn,
    error: regularStats.error + directStats.error
  };

  if (format === 'text') {
    const text = allLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    return new Response(text, { headers: { 'Content-Type': 'text/plain' } });
  }
  return json({ success: true, logs: allLogs, stats, limit, level });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const pwd = request.headers.get('X-Admin-Password');
  const expected = privateEnv.ADMIN_PASSWORD || '2282211q';
  if (pwd !== expected) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  clearLogs();
  console.log('[LOGS] Cleared by admin');
  return json({ success: true });
};
