import type { RequestHandler } from '@sveltejs/kit';
import { ensureUser } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.ton_address) {
      return new Response(JSON.stringify({ error: 'ton_address is required' }), { status: 400 });
    }
    const user = await ensureUser({
      ton_address: body.ton_address,
      public_key: body.public_key,
      wallet_type: body.wallet_type,
      wallet_version: body.wallet_version,
      telegram_username: body.telegram_username,
      telegram_id: body.telegram_id,
    });
    return new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (e: any) {
    const message = e?.message || '';
    const isAddrError = message.includes('TON address must be 48 chars and start with UQ');
    if (isAddrError) {
      return new Response(JSON.stringify({ error: 'invalid_ton_address', details: message }), { status: 400 });
    }
    console.error('User upsert error', e);
    return new Response(JSON.stringify({ error: 'internal_error', details: message }), { status: 500 });
  }
};
