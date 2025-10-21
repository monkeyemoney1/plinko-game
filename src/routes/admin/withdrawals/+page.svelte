<script lang="ts">
  import { onMount } from 'svelte';
  
  let withdrawals: any[] = [];
  let loading = false;
  let stats: any = {};
  let selectedStatus = 'all';
  let selectedWithdrawal: any = null;
  let showModal = false;
  let adminNotes = '';
  let rejectReason = '';
  
  const statusLabels = {
    pending: 'Ожидает',
    processing: 'Обрабатывается', 
    completed: 'Завершен',
    failed: 'Ошибка',
    cancelled: 'Отменен',
    manual_review: 'Ручная проверка'
  };
  
  const statusColors = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500', 
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
    manual_review: 'bg-orange-500'
  };

  async function loadWithdrawals() {
    loading = true;
    try {
      const url = `/api/admin/withdrawals?status=${selectedStatus}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        withdrawals = data.withdrawals;
        stats = data.stats;
      }
    } catch (e) {
      console.error('Failed to load withdrawals:', e);
    } finally {
      loading = false;
    }
  }

  async function performAction(action: string, withdrawalId: number) {
    try {
      const adminId = localStorage.getItem('user_id');
      if (!adminId) {
        alert('Не авторизован как администратор');
        return;
      }

      const body: any = {
        action,
        withdrawal_id: withdrawalId,
        admin_id: parseInt(adminId)
      };

      if (action === 'add_note' || action === 'approve') {
        body.admin_notes = adminNotes;
      }
      
      if (action === 'reject') {
        body.admin_notes = adminNotes;
        body.reject_reason = rejectReason;
      }

      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        showModal = false;
        adminNotes = '';
        rejectReason = '';
        await loadWithdrawals();
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (e) {
      console.error('Action failed:', e);
      alert('Ошибка выполнения действия');
    }
  }

  function openModal(withdrawal: any) {
    selectedWithdrawal = withdrawal;
    adminNotes = withdrawal.admin_notes || '';
    showModal = true;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ru-RU');
  }

  function formatTON(amount: number) {
    return amount.toFixed(6) + ' TON';
  }

  onMount(() => {
    loadWithdrawals();
  });
</script>

<div class="min-h-screen bg-gray-900 p-6">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-white mb-6">Управление выплатами</h1>
    
    <!-- Статистика -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {#each Object.entries(stats) as [status, data]}
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="text-sm text-gray-400">{statusLabels[status] || status}</div>
          <div class="text-xl font-bold text-white">{data.count}</div>
          <div class="text-xs text-gray-500">{formatTON(data.total_amount)}</div>
        </div>
      {/each}
    </div>

    <!-- Фильтры -->
    <div class="bg-gray-800 rounded-lg p-4 mb-6">
      <div class="flex gap-4 items-center">
        <label class="text-white">Статус:</label>
        <select bind:value={selectedStatus} on:change={loadWithdrawals} class="bg-gray-700 text-white rounded px-3 py-1">
          <option value="all">Все</option>
          <option value="pending">Ожидает</option>
          <option value="manual_review">Ручная проверка</option>
          <option value="processing">Обрабатывается</option>
          <option value="completed">Завершены</option>
          <option value="failed">Ошибки</option>
          <option value="cancelled">Отменены</option>
        </select>
        <button on:click={loadWithdrawals} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded">
          Обновить
        </button>
      </div>
    </div>

    <!-- Таблица выплат -->
    <div class="bg-gray-800 rounded-lg overflow-hidden">
      {#if loading}
        <div class="p-8 text-center text-gray-400">Загрузка...</div>
      {:else if withdrawals.length === 0}
        <div class="p-8 text-center text-gray-400">Выплаты не найдены</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-700">
              <tr class="text-left">
                <th class="p-3 text-gray-300">ID</th>
                <th class="p-3 text-gray-300">Пользователь</th>
                <th class="p-3 text-gray-300">Сумма</th>
                <th class="p-3 text-gray-300">Комиссия</th>
                <th class="p-3 text-gray-300">К выводу</th>
                <th class="p-3 text-gray-300">Адрес</th>
                <th class="p-3 text-gray-300">Статус</th>
                <th class="p-3 text-gray-300">Создано</th>
                <th class="p-3 text-gray-300">Действия</th>
              </tr>
            </thead>
            <tbody>
              {#each withdrawals as withdrawal}
                <tr class="border-t border-gray-700 hover:bg-gray-750">
                  <td class="p-3 text-white">#{withdrawal.id}</td>
                  <td class="p-3">
                    <div class="text-white">ID: {withdrawal.user_id}</div>
                    {#if withdrawal.user_telegram_id}
                      <div class="text-xs text-gray-400">TG: {withdrawal.user_telegram_id}</div>
                    {/if}
                  </td>
                  <td class="p-3 text-white">{formatTON(withdrawal.amount)}</td>
                  <td class="p-3 text-yellow-400">{formatTON(withdrawal.fee)}</td>
                  <td class="p-3 text-green-400">{formatTON(withdrawal.net_amount)}</td>
                  <td class="p-3">
                    <div class="text-xs text-gray-400 font-mono break-all max-w-32">
                      {withdrawal.wallet_address}
                    </div>
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs text-white {statusColors[withdrawal.status]}">
                      {statusLabels[withdrawal.status] || withdrawal.status}
                    </span>
                    {#if withdrawal.auto_process}
                      <div class="text-xs text-blue-400 mt-1">Авто</div>
                    {/if}
                  </td>
                  <td class="p-3 text-gray-400 text-xs">{formatDate(withdrawal.created_at)}</td>
                  <td class="p-3">
                    <button 
                      on:click={() => openModal(withdrawal)}
                      class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Управление
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Модальное окно управления -->
{#if showModal && selectedWithdrawal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
      <h3 class="text-xl font-bold text-white mb-4">
        Управление выплатой #{selectedWithdrawal.id}
      </h3>
      
      <div class="space-y-3 mb-4 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Пользователь:</span>
          <span class="text-white">ID {selectedWithdrawal.user_id}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Сумма:</span>
          <span class="text-white">{formatTON(selectedWithdrawal.amount)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">К выводу:</span>
          <span class="text-green-400">{formatTON(selectedWithdrawal.net_amount)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Статус:</span>
          <span class="text-white">{statusLabels[selectedWithdrawal.status]}</span>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-gray-400 text-sm mb-2">Заметки администратора:</label>
        <textarea 
          bind:value={adminNotes}
          class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
          rows="3"
        ></textarea>
      </div>

      {#if selectedWithdrawal.status === 'manual_review' || selectedWithdrawal.status === 'pending'}
        <div class="mb-4">
          <label class="block text-gray-400 text-sm mb-2">Причина отклонения (если отклоняете):</label>
          <input 
            bind:value={rejectReason}
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            placeholder="Укажите причину отклонения"
          />
        </div>
      {/if}

      <div class="flex gap-2 mb-4">
        {#if selectedWithdrawal.status === 'manual_review'}
          <button 
            on:click={() => performAction('approve', selectedWithdrawal.id)}
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Одобрить
          </button>
        {/if}
        
        {#if ['pending', 'manual_review'].includes(selectedWithdrawal.status)}
          <button 
            on:click={() => performAction('reject', selectedWithdrawal.id)}
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Отклонить
          </button>
        {/if}
        
        <button 
          on:click={() => performAction('add_note', selectedWithdrawal.id)}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Сохранить заметку
        </button>
      </div>

      <div class="flex justify-end">
        <button 
          on:click={() => showModal = false}
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .hover\:bg-gray-750:hover {
    background-color: #374151;
  }
</style>