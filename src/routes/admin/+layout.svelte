<script lang="ts">
  export let data: { authed: boolean };
</script>

<div class="min-h-screen bg-gray-900 text-white">
  <div class="max-w-5xl mx-auto p-4">
    <header class="flex items-center justify-between py-3">
      <h1 class="text-xl font-bold">Админ-панель</h1>
      {#if data?.authed}
        <a href="/admin/logout" class="text-sm text-red-400 hover:text-red-300">Выйти</a>
      {/if}
    </header>
    <slot />
  </div>
</div>
