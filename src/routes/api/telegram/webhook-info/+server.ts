import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { getWebhookInfo } from '$lib/telegram/botAPI';

export const prerender = false;

export async function GET({ url }: RequestEvent) {
  const adminSecret = privateEnv.ADMIN_PASSWORD || '';
  const provided = url.searchParams.get('token') || '';
  if (!adminSecret || provided !== adminSecret) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const info = await getWebhookInfo();
  return json({ ok: true, info });
}
