import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { setWebhook } from '$lib/telegram/botAPI';

export const prerender = false;

export async function POST({ url }: RequestEvent) {
  const adminSecret = privateEnv.ADMIN_PASSWORD || '';
  const provided = url.searchParams.get('token') || '';
  if (!adminSecret || provided !== adminSecret) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const base = String(privateEnv.PUBLIC_BASE_URL || '');
  const secret = privateEnv.TELEGRAM_WEBHOOK_SECRET || '';
  if (!base || !secret) {
    return json({ ok: false, error: 'missing_env' }, { status: 400 });
  }

  const webhookUrl = `${base.replace(/\/$/, '')}/api/telegram/webhook`;
  const ok = await setWebhook(webhookUrl, secret);
  return json({ ok, webhookUrl });
}
