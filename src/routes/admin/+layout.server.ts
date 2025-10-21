import { redirect, type LayoutServerLoad } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ url, cookies }) => {
  const authed = cookies.get('admin_auth') === '1';

  // Разрешаем доступ к /admin/login без авторизации
  const isLogin = url.pathname.startsWith('/admin/login');

  if (!authed && !isLogin) {
    throw redirect(302, '/admin/login');
  }

  // Если уже авторизован и попадает на /admin/login — отправляем на /admin
  if (authed && isLogin) {
    throw redirect(302, '/admin');
  }

  return { authed };
};
