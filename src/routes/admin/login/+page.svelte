<script lang="ts">
  export let data: { message?: string };
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900">
  <form method="POST" action="?/login" class="bg-gray-800 p-6 rounded-xl w-full max-w-sm shadow">
    <h2 class="text-center text-white text-xl font-semibold mb-4">Вход администратора</h2>
    {#if data?.message}
      <div class="text-red-400 text-sm mb-2">{data.message}</div>
    {/if}
    <label class="block text-sm text-gray-300 mb-1">Пароль</label>
    <input name="password" type="password" class="w-full rounded bg-gray-900 text-white px-3 py-2 mb-4" placeholder="Введите пароль" required />
    <button class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded">Войти</button>
  </form>
</div>
