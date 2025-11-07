// Инициализация логгера при запуске приложения
import '$lib/server/logger.js';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return response;
};
