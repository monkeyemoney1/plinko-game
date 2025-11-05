/**
 * API для подтверждения Telegram Stars платежей
 * Проверяет payload, подтверждает платеж, зачисляет средства на баланс
 */
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { pool } from '$lib/server/db';
import {
  verifyStarsPayment,
  sendPaymentSuccessNotification
} from '$lib/telegram/botAPI';

// Типы для запроса и ответа
interface VerifyStarsPaymentRequest {
  telegram_id: number;
  payload: string;
  amount: number;
  telegram_payment_charge_id?: string;
  provider_payment_charge_id?: string;
  initData?: any;
}

interface VerifyStarsPaymentResponse {
  success: boolean;
  balance?: {
    stars_balance: number;
    ton_balance: number;
  };
  transaction_id?: number;
  error?: string;
}

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    const body: VerifyStarsPaymentRequest = await request.json();
    const { 
      telegram_id, 
      payload, 
      amount: rawAmount,
      telegram_payment_charge_id = '',
      provider_payment_charge_id = '',
      initData 
    } = body;
    // Stars списываются целыми — приводим к целому
    const amount = Math.round(Number(rawAmount));

    // Валидация входных данных
    if (!telegram_id || !payload || !amount) {
      return json({
        success: false,
        error: 'Отсутствуют обязательные поля: telegram_id, payload, amount'
      }, { status: 400 });
    }

    console.log(`Подтверждение Stars платежа: пользователь ${telegram_id}, payload ${payload}`);

    await client.query('BEGIN');

    // 1. Проверяем существование транзакции с данным payload
    const transactionResult = await client.query(`
      SELECT st.*, u.stars_balance, u.ton_balance 
      FROM star_transactions st
      JOIN users u ON st.user_id = u.id
      WHERE st.payload = $1 AND st.telegram_id = $2
    `, [payload, telegram_id]);

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({
        success: false,
        error: 'Транзакция не найдена или некорректный payload'
      }, { status: 404 });
    }

    const transaction = transactionResult.rows[0];

    // 2. Проверяем, не была ли транзакция уже обработана
    if (transaction.status === 'completed') {
      // Возвращаем успешный ответ идемпотентно
      const updatedUserResult = await client.query(
        'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
        [transaction.user_id]
      );
      const updatedBalance = updatedUserResult.rows[0];
      await client.query('ROLLBACK');
      return json({
        success: true,
        transaction_id: transaction.id,
        balance: {
          stars_balance: parseFloat(updatedBalance.stars_balance),
          ton_balance: parseFloat(updatedBalance.ton_balance)
        }
      });
    }

    if (transaction.status === 'failed' || transaction.status === 'cancelled') {
      await client.query('ROLLBACK');
      return json({
        success: false,
        error: 'Транзакция была отменена или завершилась с ошибкой'
      }, { status: 409 });
    }

    // 3. Проверяем соответствие суммы
    if (Number(transaction.amount) !== Number(amount)) {
      await client.query('ROLLBACK');
      return json({
        success: false,
        error: 'Сумма платежа не соответствует заявке'
      }, { status: 400 });
    }

    // 4. Проверяем платеж через Telegram Bot API (если есть charge_id)
    if (telegram_payment_charge_id) {
      console.log('Проверка платежа через Bot API...');
      const isPaymentValid = await verifyStarsPayment(
        payload,
        telegram_payment_charge_id,
        provider_payment_charge_id
      );

      if (!isPaymentValid) {
        // Помечаем транзакцию как неудачную
        await client.query(`
          UPDATE star_transactions 
          SET status = 'failed', 
              telegram_payment_charge_id = $1,
              provider_payment_charge_id = $2,
              completed_at = NOW()
          WHERE id = $3
        `, [telegram_payment_charge_id, provider_payment_charge_id, transaction.id]);

        await client.query('COMMIT');
        return json({
          success: false,
          error: 'Платеж не прошел проверку через Telegram'
        }, { status: 400 });
      }
    }

    // 5. Зачисляем Stars на баланс пользователя
  const newStarsBalance = parseFloat(transaction.stars_balance) + Number(amount);

    await client.query(`
      UPDATE users 
      SET stars_balance = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [newStarsBalance, transaction.user_id]);

    // 6. Помечаем транзакцию как завершенную
    await client.query(`
      UPDATE star_transactions 
      SET status = 'completed',
          telegram_payment_charge_id = $1,
          provider_payment_charge_id = $2,
          completed_at = NOW()
      WHERE id = $3
    `, [telegram_payment_charge_id, provider_payment_charge_id, transaction.id]);

    // 7. Создаем запись в истории операций
    await client.query(`
      INSERT INTO balance_operations (
        user_id, operation_type, currency, amount, status, notes, completed_at
      ) VALUES ($1, 'DEPOSIT', 'STARS', $2, 'COMPLETED', $3, NOW())
    `, [
      transaction.user_id, 
      amount, 
      `Пополнение через Telegram Stars, payload: ${payload}`
    ]);

    // 8. Получаем обновленный баланс
    const updatedUserResult = await client.query(
      'SELECT stars_balance, ton_balance FROM users WHERE id = $1',
      [transaction.user_id]
    );
    const updatedBalance = updatedUserResult.rows[0];

    await client.query('COMMIT');

    console.log(`Stars платеж успешно подтвержден: пользователь ${telegram_id}, сумма ${amount}`);

    // 9. Отправляем уведомление пользователю (асинхронно, не блокируем ответ)
    sendPaymentSuccessNotification(telegram_id, amount, newStarsBalance)
      .catch(error => {
        console.error('Ошибка отправки уведомления:', error);
      });

    return json({
      success: true,
      transaction_id: transaction.id,
      balance: {
        stars_balance: parseFloat(updatedBalance.stars_balance),
        ton_balance: parseFloat(updatedBalance.ton_balance)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка подтверждения Stars платежа:', error);
    
    return json({
      success: false,
      error: 'Внутренняя ошибка сервера при подтверждении платежа'
    }, { status: 500 });

  } finally {
    client.release();
  }
};
