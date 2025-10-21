import { fail, redirect, type Actions } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

const COOKIE = 'admin_auth';

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const expected = privateEnv.ADMIN_PASSWORD ?? '';

    if (!expected) {
      return fail(500, { message: 'ADMIN_PASSWORD не задан в переменных окружения' });
    }
    if (password !== expected) {
      return fail(400, { message: 'Неверный пароль' });
    }

    cookies.set(COOKIE, '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 12 // 12 часов
    });

    throw redirect(302, '/admin');
  }
};
