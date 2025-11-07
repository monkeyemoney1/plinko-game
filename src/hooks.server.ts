// Инициализация логгера при запуске приложения
import '$lib/server/logger.js';

import type { Handle } from '@sveltejs/kit';

// Глобальное логирование всех HTTP-запросов
export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const { method } = event.request;
  const url = new URL(event.request.url);

  console.log(`[HTTP] ➡️  ${method} ${url.pathname}`);

  try {
    const response = await resolve(event);
    const duration = Date.now() - start;
    console.log(`[HTTP] ⬅️  ${method} ${url.pathname} -> ${response.status} (${duration}ms)`);
    return response;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[HTTP] ❌ ${method} ${url.pathname} failed after ${duration}ms:`, err);
    throw err;
  }
};
