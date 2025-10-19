import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
  const address = url.searchParams.get('address');
  if (!address) return json({ error: 'address is required' }, { status: 400 });

  // Используем адрес как есть
  const apiAddress = address;
  
  console.log('Balance request for address:', apiAddress);

  const token = env.TONAPI_TOKEN || env.TON_API_TOKEN || '';
  const headers: Record<string, string> = { 'accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    // TonAPI accounts endpoint: returns balance in nanotons
    const resp = await fetch(`https://tonapi.io/v2/accounts/${apiAddress}`, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      return json({ error: 'failed_to_fetch', status: resp.status, details: text }, { status: 502 });
    }
    const data = await resp.json();
    const nano = Number(data.balance ?? 0);
    const ton = nano / 1e9;
    return json({ success: true, address, ton_balance: ton, nanotons: nano });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: 'internal_error', details: message }, { status: 500 });
  }
};
