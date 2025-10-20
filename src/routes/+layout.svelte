<script lang="ts">
  import ogImage from '$lib/assets/og_image.jpg';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { initTelegramWebApp, isTelegramWebApp } from '$lib/telegram/webApp';
  import '../app.css';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    // Инициализация Telegram WebApp
    if (isTelegramWebApp()) {
      initTelegramWebApp();
      console.log('Telegram WebApp инициализировано');
    }

    // Проверка авторизации
    const isAuth = localStorage.getItem('plinko_is_auth');
    const currentPath = window.location.pathname;
    // Если не авторизован, не пускать никуда кроме /auth
    if (!isAuth && currentPath !== '/auth') {
      window.location.replace('/auth');
    }
    // Если авторизован и попал на /auth, отправлять на /profile
    if (isAuth && currentPath === '/auth') {
      window.location.replace('/profile');
    }
  });

  function handleLogout() {
    localStorage.removeItem('plinko_is_auth');
    window.location.replace('/auth');
  }
</script>

<svelte:head>
  <title>Plinko</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
    rel="stylesheet"
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Plinko" />
  <meta property="og:url" content="https://plinko-web-game.netlify.app/" />
  <meta property="og:image" content={ogImage} />
</svelte:head>

{@render children?.()}
