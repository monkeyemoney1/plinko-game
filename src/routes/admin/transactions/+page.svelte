<script lang="ts">
  import { onMount } from 'svelte';
  
  let transactions = [];
  let loading = true;
  let filter = 'all'; // all, ton, stars
  
  async function loadTransactions() {
    try {
      loading = true;
      const response = await fetch('/api/admin/transactions');
      if (response.ok) {
        transactions = await response.json();
      }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    } finally {
      loading = false;
    }
  }
  
  onMount(loadTransactions);
  
  // Фильтрация транзакций
  $: filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'ton') return t.type === 'ton';
    if (filter === 'stars') return t.type === 'stars';
    return true;
  });
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ru-RU');
  }
</script>

<svelte:head>
  <title>Транзакции - Admin</title>
</svelte:head>

<div class="admin-transactions">
  <h1>Мониторинг транзакций</h1>
  
  <!-- Фильтры -->
  <div class="filters">
    <button 
      class="filter-btn {filter === 'all' ? 'active' : ''}"
      on:click={() => filter = 'all'}
    >
      Все транзакции
    </button>
    <button 
      class="filter-btn {filter === 'ton' ? 'active' : ''}"
      on:click={() => filter = 'ton'}
    >
      TON транзакции
    </button>
    <button 
      class="filter-btn {filter === 'stars' ? 'active' : ''}"
      on:click={() => filter = 'stars'}
    >
      Stars транзакции
    </button>
  </div>
  
  {#if loading}
    <div class="loading">Загрузка транзакций...</div>
  {:else}
    <div class="transactions-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Тип</th>
            <th>Пользователь</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Hash/Payload</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredTransactions as transaction}
            <tr>
              <td>{transaction.id}</td>
              <td>
                <span class="type-badge {transaction.type}">
                  {transaction.type.toUpperCase()}
                </span>
              </td>
              <td>{transaction.user_id}</td>
              <td class="amount">{transaction.amount}</td>
              <td>
                <span class="status {transaction.status}">
                  {transaction.status}
                </span>
              </td>
              <td>{formatDate(transaction.created_at)}</td>
              <td>
                <code class="hash">
                  {transaction.hash || transaction.payload || 'N/A'}
                </code>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .admin-transactions {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  h1 {
    color: #333;
    margin-bottom: 2rem;
  }
  
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .filter-btn {
    padding: 0.8rem 1.5rem;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .filter-btn:hover {
    border-color: #667eea;
  }
  
  .filter-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  
  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
  }
  
  .transactions-table {
    overflow-x: auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }
  
  th {
    background: #f8f9fa;
    font-weight: 600;
    color: #333;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
  
  .type-badge {
    padding: 0.3rem 0.6rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .type-badge.ton {
    background: #0088cc;
    color: white;
  }
  
  .type-badge.stars {
    background: #ffd700;
    color: #333;
  }
  
  .amount {
    font-weight: bold;
    color: #667eea;
  }
  
  .status {
    padding: 0.3rem 0.6rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .status.completed {
    background: #d4edda;
    color: #155724;
  }
  
  .status.pending {
    background: #fff3cd;
    color: #856404;
  }
  
  .status.failed {
    background: #f8d7da;
    color: #721c24;
  }
  
  .hash {
    font-family: monospace;
    font-size: 0.8rem;
    background: #f0f0f0;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
  }
</style>