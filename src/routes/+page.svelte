<script lang="ts">
  import logo from '$lib/assets/logo.svg';
  import Balance from '$lib/components/Balance.svelte';
  import LiveStatsWindow from '$lib/components/LiveStatsWindow/LiveStatsWindow.svelte';
  import Plinko from '$lib/components/Plinko';
  import Sidebar from '$lib/components/Sidebar';
  import { setBalanceFromLocalStorage, writeBalanceToLocalStorage } from '$lib/utils/game';
  import GitHubLogo from 'phosphor-svelte/lib/GithubLogo';

  $effect(() => {
    // Сначала загружаем баланс из localStorage для быстрого отображения
    setBalanceFromLocalStorage();
    
    // Затем синхронизируем с сервером для получения актуального баланса
    const userId = localStorage.getItem('user_id');
    if (userId) {
      syncBalanceWithServer(userId);
    }
  });

  async function syncBalanceWithServer(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}/balance`);
      if (response.ok) {
        const data = await response.json();
        if (data?.user?.balance?.stars != null) {
          const { balance } = await import('$lib/stores/game');
          const serverBalance = Number(data.user.balance.stars) || 0;
          
          // Всегда обновляем баланс с сервера - это источник истины
          balance.set(serverBalance);
          localStorage.setItem('plinko_balance', String(serverBalance));
          
          console.log('Баланс синхронизирован с сервером:', serverBalance);
        }
      }
    } catch (error) {
      console.error('Ошибка синхронизации баланса:', error);
    }
  }
</script>

<svelte:window onbeforeunload={writeBalanceToLocalStorage} />

<div class="relative flex min-h-dvh w-full flex-col">
  <nav class="sticky top-0 z-10 w-full bg-gray-700 px-5 drop-shadow-lg">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between">
      <img src={logo} alt="logo" class="h-6 sm:h-7" />
      <div class="mx-auto">
        <Balance />
      </div>
    </div>
  </nav>

  <div class="flex-1 px-5">
    <div class="mx-auto mt-5 max-w-xl min-w-[300px] drop-shadow-xl md:mt-10 lg:max-w-7xl">
      <div class="flex flex-col-reverse overflow-hidden rounded-lg lg:w-full lg:flex-row">
        <Sidebar />
        <div class="flex-1">
          <Plinko />
        </div>
      </div>
    </div>
  </div>

  <LiveStatsWindow />

  <footer class="px-5 pt-16 pb-4">
    <div class="mx-auto max-w-[40rem]">
      <div aria-hidden="true" class="h-[1px] bg-slate-700"></div>
      <div class="flex items-center justify-between p-2">
        <p class="text-sm text-slate-500">
          <a
            href="https://t.me/Plinkostars"
            target="_blank"
            rel="noreferrer"
            class="flex items-center gap-1 text-cyan-600 transition hover:text-cyan-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.93 7.31l-1.43 6.77c-.11.49-.4.61-.81.38l-2.25-1.66-1.09 1.05c-.12.12-.23.23-.47.23l.17-2.39 4.35-3.93c.19-.17-.04-.27-.29-.1l-5.38 3.39-2.32-.73c-.5-.16-.51-.5.1-.73l9.06-3.5c.42-.16.79.1.66.72z"/></svg>
            Plinko Star
          </a>
          © {new Date().getFullYear()}
        </p>
        <a
          href="https://t.me/PlinkoStars_Support"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-1 p-1 text-sm text-slate-500 transition hover:text-cyan-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.93 7.31l-1.43 6.77c-.11.49-.4.61-.81.38l-2.25-1.66-1.09 1.05c-.12.12-.23.23-.47.23l.17-2.39 4.35-3.93c.19-.17-.04-.27-.29-.1l-5.38 3.39-2.32-.73c-.5-.16-.51-.5.1-.73l9.06-3.5c.42-.16.79.1.66.72z"/></svg>
          <span>Поддержка/Support</span>
        </a>
      </div>
    </div>
  </footer>
</div>

<style lang="postcss">
  @reference "../app.css";

  :global(body) {
    @apply bg-gray-800;
  }
</style>
