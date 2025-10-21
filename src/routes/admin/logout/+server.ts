import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  cookies.delete('admin_auth', { path: '/' });
  return new Response(null, { status: 302, headers: { location: '/admin/login' } });
};
