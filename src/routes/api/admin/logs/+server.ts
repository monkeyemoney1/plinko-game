import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLogs, clearLogs, getLogsCount } from '$lib/server/logger.js';
import { env as privateEnv } from '$env/dynamic/private';

// GET - получить логи
export const GET: RequestHandler = async ({ url, request }) => {
  try {
    const adminPassword = url.searchParams.get('password');
    const expectedPassword = privateEnv.ADMIN_PASSWORD || '2282211q';
    
    if (adminPassword !== expectedPassword) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const limit = parseInt(url.searchParams.get('limit') || '500');
    const level = url.searchParams.get('level') || null;
    const format = url.searchParams.get('format') || 'json';

    const logs = getLogs(limit, level);
    const stats = getLogsCount();

    if (format === 'text') {
      const text = logs.map(log => 
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
      ).join('\n');
      
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return json({
      success: true,
      logs,
      stats,
      limit,
      level
    });

  } catch (error) {
    console.error('Get logs error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};

// DELETE - очистить логи
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const adminPassword = request.headers.get('X-Admin-Password');
    const expectedPassword = privateEnv.ADMIN_PASSWORD || '2282211q';
    
    if (adminPassword !== expectedPassword) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    clearLogs();
    console.log('[LOGS] Logs cleared by admin');

    return json({
      success: true,
      message: 'Logs cleared'
    });

  } catch (error) {
    console.error('Clear logs error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};
