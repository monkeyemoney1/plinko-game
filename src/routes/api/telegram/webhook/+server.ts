import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { pool } from '$lib/server/db';
import { answerPreCheckoutQuery } from '$lib/telegram/botAPI';

interface SuccessfulPayment {
  currency: string; // 'XTR' for Stars
  total_amount: number; // for Stars: number of stars
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

interface MessageUpdate {
  message?: {
    chat: { id: number };
    successful_payment?: SuccessfulPayment;
  };
  pre_checkout_query?: {
    id: string;
    from: { id: number };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
}

export const prerender = false;

export async function POST({ request }: RequestEvent) {
  const secret = privateEnv.TELEGRAM_WEBHOOK_SECRET || '';
  // Telegram пришлет заголовок X-Telegram-Bot-Api-Secret-Token
  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token') || '';

  if (!secret || headerSecret !== secret) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const update = (await request.json()) as MessageUpdate;

    // 1) Обрабатываем pre_checkout_query (подтверждаем оплату)
    if (update.pre_checkout_query) {
      const pq = update.pre_checkout_query;
      const ok = await answerPreCheckoutQuery(pq.id, true);
      if (!ok) {
        return json({ ok: false, error: 'pre_checkout_confirm_failed' }, { status: 500 });
      }
      return json({ ok: true, status: 'pre_checkout_confirmed' });
    }

    const sp = update.message?.successful_payment;
    if (!sp) {
      // Не интересующие обновления
      return json({ ok: true });
    }

    const telegramId = update.message!.chat.id;
    const { invoice_payload: payload, total_amount, currency, telegram_payment_charge_id, provider_payment_charge_id } = sp;

    // Обрабатываем только Stars (XTR)
    if (currency !== 'XTR') {
      return json({ ok: true, ignored: true });
    }

    await client.query('BEGIN');
    const txRes = await client.query(
      `SELECT st.*, u.stars_balance, u.ton_balance 
       FROM star_transactions st
       JOIN users u ON st.user_id = u.id
       WHERE st.payload = $1 AND st.telegram_id = $2
       FOR UPDATE`,
      [payload, telegramId]
    );

    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ ok: false, error: 'transaction_not_found' }, { status: 404 });
    }

    const tx = txRes.rows[0];

    if (tx.status === 'completed') {
      await client.query('ROLLBACK');
      return json({ ok: true, status: 'already_completed' });
    }

    // Сравниваем сумму
    const amount = Math.round(Number(total_amount));
    if (Number(tx.amount) !== amount) {
      // Помечаем failed из-за mismatch
      await client.query(
        `UPDATE star_transactions 
         SET status = 'failed', telegram_payment_charge_id = $1, provider_payment_charge_id = $2, completed_at = NOW()
         WHERE id = $3`,
        [telegram_payment_charge_id, provider_payment_charge_id, tx.id]
      );
      await client.query('COMMIT');
      return json({ ok: false, error: 'amount_mismatch' }, { status: 400 });
    }

    const newStarsBalance = parseFloat(tx.stars_balance) + amount;
    await client.query(`
      UPDATE users SET stars_balance = $1, updated_at = NOW() WHERE id = $2
    `, [newStarsBalance, tx.user_id]);

    await client.query(
      `UPDATE star_transactions 
       SET status = 'completed', telegram_payment_charge_id = $1, provider_payment_charge_id = $2, completed_at = NOW()
       WHERE id = $3`,
      [telegram_payment_charge_id, provider_payment_charge_id, tx.id]
    );

    await client.query(
      `INSERT INTO balance_operations (user_id, operation_type, currency, amount, status, notes, completed_at)
       VALUES ($1, 'DEPOSIT', 'STARS', $2, 'COMPLETED', $3, NOW())`,
      [tx.user_id, amount, `Пополнение через Telegram Stars (webhook), payload: ${payload}`]
    );

    await client.query('COMMIT');
    return json({ ok: true, status: 'credited', balance: { stars_balance: newStarsBalance } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('telegram webhook error', e);
    return json({ ok: false, error: 'internal_error' }, { status: 500 });
  } finally {
    client.release();
  }
}
