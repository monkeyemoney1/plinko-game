<script lang="ts">
  import { onMount } from 'svelte';
  import type { User, StarTransaction } from '$lib/types';
  
  interface UserAnalytics extends User {
    wallet_count: number;
    star_transactions_count: number;
    total_stars_spent: number;
    total_stars_received: number;
    last_activity: string;
  }
  
  interface WalletRegistration {
    id: number;
    user_id: number;
    username: string;
    telegram_id: string;
    wallet_address: string;
    registration_date: string;
    is_connected: boolean;
  }
  
  let users: UserAnalytics[] = [];
  let walletRegistrations: WalletRegistration[] = [];
  let starTransactions: StarTransaction[] = [];
  let loading = true;
  let activeTab = 'users';
  let searchTerm = '';
  
  // Статистика
  let totalUsers = 0;
  let telegramUsers = 0;
  let connectedWallets = 0;
  let totalStarsVolume = 0;
  
  async function loadAnalytics() {
    try {
      loading = true;
      
      // Загружаем пользователей с аналитикой
      const usersResponse = await fetch('/api/admin/analytics/users');
      if (usersResponse.ok) {
        users = await usersResponse.json();
        totalUsers = users.length;
        telegramUsers = users.filter(u => u.telegram_id).length;
      }
      
      // Загружаем регистрации кошельков
      const walletsResponse = await fetch('/api/admin/analytics/wallets');
      if (walletsResponse.ok) {
        walletRegistrations = await walletsResponse.json();
        connectedWallets = walletRegistrations.filter(w => w.is_connected).length;
      }
      
      // Загружаем транзакции Stars
      const starsResponse = await fetch('/api/admin/analytics/stars');
      if (starsResponse.ok) {
        starTransactions = await starsResponse.json();
        totalStarsVolume = starTransactions.reduce((sum, t) => sum + t.amount, 0);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      loading = false;
    }
  }
  
  onMount(loadAnalytics);
  
  // Фильтрация пользователей
  $: filteredUsers = users.filter(user => 
    !searchTerm || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telegram_id?.includes(searchTerm) ||
    user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Фильтрация кошельков
  $: filteredWallets = walletRegistrations.filter(wallet =>
    !searchTerm ||
    wallet.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.telegram_id?.includes(searchTerm) ||
    wallet.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Форматирование даты
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ru-RU');
  }
  
  // Копирование в буфер обмена
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Можно добавить toast уведомление
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  }
</script>

<svelte:head>
  <title>Аналитика пользователей - Admin</title>
</svelte:head>

<div class="admin-analytics">
  <h1>Аналитика пользователей и транзакций</h1>
  
  <!-- Общая статистика -->
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Всего пользователей</h3>
      <div class="stat-value">{totalUsers}</div>
    </div>
    <div class="stat-card">
      <h3>Telegram пользователи</h3>
      <div class="stat-value">{telegramUsers}</div>
    </div>
    <div class="stat-card">
      <h3>Подключенные кошельки</h3>
      <div class="stat-value">{connectedWallets}</div>
    </div>
    <div class="stat-card">
      <h3>Объем Stars</h3>
      <div class="stat-value">{totalStarsVolume}</div>
    </div>
  </div>
  
  <!-- Поиск -->
  <div class="search-section">
    <input 
      type="text" 
      placeholder="Поиск по username, Telegram ID или адресу кошелька..."
      bind:value={searchTerm}
      class="search-input"
    />
  </div>
  
  <!-- Вкладки -->
  <div class="tabs">
    <button 
      class="tab {activeTab === 'users' ? 'active' : ''}"
      on:click={() => activeTab = 'users'}
    >
      Пользователи ({users.length})
    </button>
    <button 
      class="tab {activeTab === 'wallets' ? 'active' : ''}"
      on:click={() => activeTab = 'wallets'}
    >
      Кошельки ({walletRegistrations.length})
    </button>
    <button 
      class="tab {activeTab === 'stars' ? 'active' : ''}"
      on:click={() => activeTab = 'stars'}
    >
      Stars транзакции ({starTransactions.length})
    </button>
  </div>
  
  {#if loading}
    <div class="loading">Загрузка данных...</div>
  {:else}
    
    <!-- Вкладка пользователей -->
    {#if activeTab === 'users'}
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Telegram ID</th>
              <th>Кошелек</th>
              <th>Баланс</th>
              <th>Stars баланс</th>
              <th>Кол-во кошельков</th>
              <th>Stars транзакций</th>
              <th>Потрачено Stars</th>
              <th>Получено Stars</th>
              <th>Последняя активность</th>
              <th>Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredUsers as user}
              <tr>
                <td>{user.id}</td>
                <td>{user.username || 'N/A'}</td>
                <td>
                  {#if user.telegram_id}
                    <button 
                      class="copy-btn"
                      on:click={() => copyToClipboard(user.telegram_id)}
                      title="Копировать Telegram ID"
                    >
                      {user.telegram_id}
                    </button>
                  {:else}
                    N/A
                  {/if}
                </td>
                <td>
                  {#if user.wallet_address}
                    <button 
                      class="copy-btn wallet-addr"
                      on:click={() => copyToClipboard(user.wallet_address)}
                      title="Копировать адрес кошелька"
                    >
                      {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                    </button>
                  {:else}
                    N/A
                  {/if}
                </td>
                <td>{user.balance}</td>
                <td>{user.stars_balance || 0}</td>
                <td>{user.wallet_count || 0}</td>
                <td>{user.star_transactions_count || 0}</td>
                <td>{user.total_stars_spent || 0}</td>
                <td>{user.total_stars_received || 0}</td>
                <td>{user.last_activity ? formatDate(user.last_activity) : 'N/A'}</td>
                <td>{formatDate(user.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    
    <!-- Вкладка кошельков -->
    {#if activeTab === 'wallets'}
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Username</th>
              <th>Telegram ID</th>
              <th>Адрес кошелька</th>
              <th>Статус</th>
              <th>Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredWallets as wallet}
              <tr>
                <td>{wallet.id}</td>
                <td>{wallet.user_id}</td>
                <td>{wallet.username || 'N/A'}</td>
                <td>
                  {#if wallet.telegram_id}
                    <button 
                      class="copy-btn"
                      on:click={() => copyToClipboard(wallet.telegram_id)}
                    >
                      {wallet.telegram_id}
                    </button>
                  {:else}
                    N/A
                  {/if}
                </td>
                <td>
                  <button 
                    class="copy-btn wallet-addr"
                    on:click={() => copyToClipboard(wallet.wallet_address)}
                  >
                    {wallet.wallet_address.slice(0, 12)}...{wallet.wallet_address.slice(-8)}
                  </button>
                </td>
                <td>
                  <span class="status {wallet.is_connected ? 'connected' : 'disconnected'}">
                    {wallet.is_connected ? 'Подключен' : 'Отключен'}
                  </span>
                </td>
                <td>{formatDate(wallet.registration_date)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    
    <!-- Вкладка Stars транзакций -->
    {#if activeTab === 'stars'}
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Telegram ID</th>
              <th>Количество</th>
              <th>Payload</th>
              <th>Статус</th>
              <th>Дата создания</th>
              <th>Дата завершения</th>
            </tr>
          </thead>
          <tbody>
            {#each starTransactions as transaction}
              <tr>
                <td>{transaction.id}</td>
                <td>{transaction.user_id}</td>
                <td>
                  <button 
                    class="copy-btn"
                    on:click={() => copyToClipboard(transaction.telegram_id)}
                  >
                    {transaction.telegram_id}
                  </button>
                </td>
                <td class="amount">{transaction.amount}</td>
                <td>
                  <button 
                    class="copy-btn"
                    on:click={() => copyToClipboard(transaction.payload)}
                  >
                    {transaction.payload.slice(0, 8)}...
                  </button>
                </td>
                <td>
                  <span class="status {transaction.status}">
                    {transaction.status}
                  </span>
                </td>
                <td>{formatDate(transaction.created_at)}</td>
                <td>{transaction.completed_at ? formatDate(transaction.completed_at) : 'N/A'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    
  {/if}
</div>

<style>
  .admin-analytics {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  h1 {
    color: #333;
    margin-bottom: 2rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
  }
  
  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
  }
  
  .search-section {
    margin-bottom: 1.5rem;
  }
  
  .search-input {
    width: 100%;
    max-width: 400px;
    padding: 0.8rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .tab {
    padding: 0.8rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #666;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;
  }
  
  .tab:hover {
    color: #333;
  }
  
  .tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
  }
  
  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
  }
  
  .data-table {
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
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }
  
  th {
    background: #f8f9fa;
    font-weight: 600;
    color: #333;
    position: sticky;
    top: 0;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
  
  .copy-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .copy-btn:hover {
    background: #f0f0f0;
  }
  
  .wallet-addr {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
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
  
  .status.connected,
  .status.completed {
    background: #d4edda;
    color: #155724;
  }
  
  .status.disconnected,
  .status.pending {
    background: #fff3cd;
    color: #856404;
  }
  
  .status.failed {
    background: #f8d7da;
    color: #721c24;
  }
  
  @media (max-width: 768px) {
    .admin-analytics {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .data-table {
      font-size: 0.8rem;
    }
    
    th, td {
      padding: 0.5rem;
    }
  }
</style>