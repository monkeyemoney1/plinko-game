// Global server hooks: initialize in-memory logger and log every request
import '$lib/server/logger.js';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const { method } = event.request;
  const url = new URL(event.request.url);
  console.log(`[HTTP] ${method} ${url.pathname}`);
  try {
    const response = await resolve(event);
    console.log(`[HTTP] ${method} ${url.pathname} -> ${response.status} (${Date.now() - start}ms)`);
    return response;
  } catch (err) {
    console.error(`[HTTP] ${method} ${url.pathname} ERROR after ${Date.now() - start}ms`, err);
    throw err;
  }
};
