<script lang="ts">
  // Импорт polyfills для работы с TON
  import '$lib/polyfills';
  // Импорт логотипа для стилистики
  import { onMount } from 'svelte';
  import { tonConnectUI } from '$lib/tonconnect';
  import { goto } from '$app/navigation';
  import logo from '$lib/assets/logo.svg';
  import { normalizeAddressClient } from '$lib/ton-utils';

  onMount(() => {
    if (tonConnectUI) {
      tonConnectUI.onStatusChange(async wallet => {
        if (wallet) {
          localStorage.setItem('plinko_is_auth', '1');
          
          // Конвертируем адрес в user-friendly формат (UQ... 48 символов)
          const normalizedAddress = await normalizeAddressClient(wallet.account.address);
          
          localStorage.setItem('ton_address', normalizedAddress);
          console.log('Saved user-friendly address:', normalizedAddress);
          try {
            // Пытаемся получить данные Telegram, если внедрены через WebApp initData или заранее сохранены
            let telegram_username: string | null = null;
            let telegram_id: number | null = null;
            try {
              // из localStorage, если вы прокинули их с фронта телеграм-бота
              telegram_username = localStorage.getItem('tg_username');
              const tgIdRaw = localStorage.getItem('tg_id');
              telegram_id = tgIdRaw ? Number(tgIdRaw) : null;
            } catch {}

            const resp = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ton_address: normalizedAddress,
                public_key: wallet.account.publicKey,
                wallet_type: wallet.device?.appName || wallet.device?.platform || null,
                wallet_version: wallet.device?.appVersion || null,
                telegram_username,
                telegram_id,
              }),
            });
            if (resp.ok) {
              const { user } = await resp.json();
              if (user?.id) localStorage.setItem('user_id', String(user.id));
            }
          } catch (e) {
            console.error('Не удалось синхронизировать пользователя', e);
          }
          goto('/profile');
        }
      });
    }
  });

  function handleTonConnect() {
    tonConnectUI?.openModal();
  }
</script>

<div class="flex flex-col items-center justify-center min-h-screen bg-gray-900">
  <div class="bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md flex flex-col items-center">
  <img src={logo} alt="logo" class="h-12 mb-6 w-auto max-w-[60vw] sm:h-12 sm:max-w-[200px]" />
    <h1 class="text-2xl font-bold text-white mb-4">Добро пожаловать в Plinko!</h1>
    <p class="text-gray-300 mb-8 text-center">Для входа используйте TON Connect</p>
    <button
      class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition mb-2 w-full"
      on:click={handleTonConnect}
    >
      TON Connect
    </button>
  </div>
</div>
