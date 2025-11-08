import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const now = new Date().toISOString();
	console.log(`[PING] ${now}`);
	return json({ ok: true, now });
};

