import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { add } from '$lib/server/logger-direct.js';

export const GET: RequestHandler = async () => {
	const now = new Date().toISOString();
	console.log(`[PING] ${now}`);
	add('info', `[PING] ${now}`);
	return json({ ok: true, now });
};

