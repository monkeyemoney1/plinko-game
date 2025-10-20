<script lang="ts">
  import { onMount } from 'svelte';
  import type { User, StarTransaction } from '$lib/types';
  
  // Состояние аутентификации
  let isAuthenticated = false;
  let password = '';
  let authError = '';
  
  // Активная вкладка
  let activeTab: 'dashboard' | 'analytics' | 'database' | 'transactions' | 'games' = 'dashboard';
  
  // Данные дашборда
  let stats = {
    totalUsers: 0,
    telegramUsers: 0,
    connectedWallets: 0,
    totalStarsVolume: 0,
    totalGames: 0,
    totalBets: 0
  };
  
  // Аналитика
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
  let analyticsSubTab = 'users';
  let searchTerm = '';
  
  // База данных
  let dbTables: any[] = [];
  let selectedTable = '';
  let tableData: any = null;
  
  // Транзакции
  let transactions = [];
  let transactionsFilter = 'all';
  
  // Игры
  let gameStats = {
    totalGames: 0,
    totalBets: 0,
    totalPayouts: 0,
    houseEdge: 0,
    averageBet: 0,
    biggestWin: 0
  };
  let recentGames = [];
  
  let loading = false;
  
  // Проверка пароля в localStorage
  onMount(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth) {
      isAuthenticated = true;
      password = savedAuth;
      loadStats();
    }
  });
  
  async function handleLogin() {
    if (!password) {
      authError = 'Введите пароль';
      return;
    }
    
    // Простая проверка пароля (можно заменить на серверную проверку)
    const ADMIN_PASSWORD = 'admin123'; // Измените на свой пароль!
    
    if (password === ADMIN_PASSWORD) {
      isAuthenticated = true;
      authError = '';
      localStorage.setItem('admin_auth', password);
      loadStats();
    } else {
      authError = 'Неверный пароль';
    }
  }
  
  function handleLogout() {
    isAuthenticated = false;
    password = '';
    localStorage.removeItem('admin_auth');
  }
  
  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        stats = await response.json();
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  }
  
  async function loadAnalytics() {
    if (users.length > 0) return; // Уже загружено
    
    try {
      loading = true;
      
      const usersResponse = await fetch('/api/admin/analytics/users');
      if (usersResponse.ok) {
        users = await usersResponse.json();
      }
      
      const walletsResponse = await fetch('/api/admin/analytics/wallets');
      if (walletsResponse.ok) {
        walletRegistrations = await walletsResponse.json();
      }
      
      const starsResponse = await fetch('/api/admin/analytics/stars');
      if (starsResponse.ok) {
        starTransactions = await starsResponse.json();
      }
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      loading = false;
    }
  }
  
  async function loadDatabase() {
    if (dbTables.length > 0) return; // Уже загружено
    
    try {
      loading = true;
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      if (response.ok) {
        dbTables = data.tables;
      }
    } catch (error) {
      console.error('Ошибка загрузки БД:', error);
    } finally {
      loading = false;
    }
  }
  
  async function loadTableData(table: string) {
    loading = true;
    selectedTable = table;
    
    try {
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, table, limit: 50 })
      });
      
      const data = await response.json();
      if (response.ok) {
        tableData = data;
      }
    } catch (error) {
      console.error('Ошибка загрузки таблицы:', error);
    } finally {
      loading = false;
    }
  }
  
  async function loadTransactions() {
    if (transactions.length > 0) return; // Уже загружено
    
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
  
  async function loadGameStats() {
    if (gameStats.totalGames > 0) return; // Уже загружено
    
    try {
      loading = true;
      const response = await fetch('/api/admin/game-stats');
      if (response.ok) {
        const data = await response.json();
        gameStats = data.stats;
        recentGames = data.recentGames;
      }
    } catch (error) {
      console.error('Ошибка загрузки игровой статистики:', error);
    } finally {
      loading = false;
    }
  }
  
  function switchTab(tab: typeof activeTab) {
    activeTab = tab;
    
    // Подгружаем данные при переключении
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'database') loadDatabase();
    if (tab === 'transactions') loadTransactions();
    if (tab === 'games') loadGameStats();
  }
  
  // Вспомогательные функции
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ru-RU');
  }
  
  function formatNumber(num: number) {
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(num);
  }
  
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  }
  
  // Фильтры
  $: filteredUsers = users.filter(user => 
    !searchTerm || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telegram_id?.includes(searchTerm) ||
    user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  $: filteredWallets = walletRegistrations.filter(wallet =>
    !searchTerm ||
    wallet.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.telegram_id?.includes(searchTerm) ||
    wallet.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  $: filteredTransactions = transactions.filter(t => {
    if (transactionsFilter === 'all') return true;
    if (transactionsFilter === 'ton') return t.type === 'ton';
    if (transactionsFilter === 'stars') return t.type === 'stars';
    return true;
  });
</script>

<svelte:head>
  <title>Админ панель</title>
</svelte:head>

{#if !isAuthenticated}
  <!-- Экран входа -->
  <div class="login-container">
    <div class="login-box">
      <h1>🔐 Админ панель</h1>
      <p>Введите пароль для доступа</p>
      
      <input
        type="password"
        bind:value={password}
        placeholder="Пароль"
        on:keydown={(e) => e.key === 'Enter' && handleLogin()}
        class="password-input"
      />
      
      {#if authError}
        <div class="auth-error">{authError}</div>
      {/if}
      
      <button on:click={handleLogin} class="login-btn">
        Войти
      </button>
    </div>
  </div>
{:else}
  <!-- Основная панель -->
  <div class="admin-panel">
    <div class="admin-header">
      <h1>🎮 Админ панель</h1>
      <button on:click={handleLogout} class="logout-btn">Выйти</button>
    </div>
    
    <!-- Навигация по вкладкам -->
    <div class="tabs">
      <button 
        class="tab {activeTab === 'dashboard' ? 'active' : ''}"
        on:click={() => switchTab('dashboard')}
      >
        📊 Дашборд
      </button>
      <button 
        class="tab {activeTab === 'analytics' ? 'active' : ''}"
        on:click={() => switchTab('analytics')}
      >
        📈 Аналитика
      </button>
      <button 
        class="tab {activeTab === 'database' ? 'active' : ''}"
        on:click={() => switchTab('database')}
      >
        🗄️ База данных
      </button>
      <button 
        class="tab {activeTab === 'transactions' ? 'active' : ''}"
        on:click={() => switchTab('transactions')}
      >
        💳 Транзакции
      </button>
      <button 
        class="tab {activeTab === 'games' ? 'active' : ''}"
        on:click={() => switchTab('games')}
      >
        🎲 Игры
      </button>
    </div>
    
    <!-- Содержимое вкладок -->
    <div class="tab-content">
      
      <!-- ДАШБОРД -->
      {#if activeTab === 'dashboard'}
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Всего пользователей</h3>
            <div class="stat-value">{stats.totalUsers}</div>
          </div>
          <div class="stat-card">
            <h3>Telegram пользователи</h3>
            <div class="stat-value">{stats.telegramUsers}</div>
          </div>
          <div class="stat-card">
            <h3>Подключенные кошельки</h3>
            <div class="stat-value">{stats.connectedWallets}</div>
          </div>
          <div class="stat-card">
            <h3>Объем Stars</h3>
            <div class="stat-value">{stats.totalStarsVolume}</div>
          </div>
        </div>
        
        <div class="welcome-message">
          <h2>Добро пожаловать в админ-панель!</h2>
          <p>Выберите вкладку выше для просмотра детальной информации.</p>
        </div>
      {/if}
      
      <!-- АНАЛИТИКА -->
      {#if activeTab === 'analytics'}
        <div class="section-header">
          <h2>Аналитика пользователей и транзакций</h2>
          <input 
            type="text" 
            placeholder="Поиск по username, Telegram ID или адресу..."
            bind:value={searchTerm}
            class="search-input"
          />
        </div>
        
        <!-- Подвкладки аналитики -->
        <div class="sub-tabs">
          <button 
            class="sub-tab {analyticsSubTab === 'users' ? 'active' : ''}"
            on:click={() => analyticsSubTab = 'users'}
          >
            Пользователи ({users.length})
          </button>
          <button 
            class="sub-tab {analyticsSubTab === 'wallets' ? 'active' : ''}"
            on:click={() => analyticsSubTab = 'wallets'}
          >
            Кошельки ({walletRegistrations.length})
          </button>
          <button 
            class="sub-tab {analyticsSubTab === 'stars' ? 'active' : ''}"
            on:click={() => analyticsSubTab = 'stars'}
          >
            Stars ({starTransactions.length})
          </button>
        </div>
        
        {#if loading}
          <div class="loading">Загрузка...</div>
        {:else}
          
          <!-- Пользователи -->
          {#if analyticsSubTab === 'users'}
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Telegram ID</th>
                    <th>Баланс</th>
                    <th>Stars баланс</th>
                    <th>Stars потрачено</th>
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
                          <button class="copy-btn" on:click={() => copyToClipboard(user.telegram_id)}>
                            {user.telegram_id}
                          </button>
                        {:else}
                          N/A
                        {/if}
                      </td>
                      <td>{user.balance}</td>
                      <td>{user.stars_balance || 0}</td>
                      <td>{user.total_stars_spent || 0}</td>
                      <td>{formatDate(user.created_at)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          
          <!-- Кошельки -->
          {#if analyticsSubTab === 'wallets'}
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Адрес кошелька</th>
                    <th>Статус</th>
                    <th>Дата регистрации</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredWallets as wallet}
                    <tr>
                      <td>{wallet.id}</td>
                      <td>{wallet.username || 'N/A'}</td>
                      <td>
                        <button class="copy-btn wallet-addr" on:click={() => copyToClipboard(wallet.wallet_address)}>
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
          
          <!-- Stars транзакции -->
          {#if analyticsSubTab === 'stars'}
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Telegram ID</th>
                    <th>Количество</th>
                    <th>Статус</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {#each starTransactions as transaction}
                    <tr>
                      <td>{transaction.id}</td>
                      <td>
                        <button class="copy-btn" on:click={() => copyToClipboard(transaction.telegram_id)}>
                          {transaction.telegram_id}
                        </button>
                      </td>
                      <td class="amount">{transaction.amount}</td>
                      <td>
                        <span class="status {transaction.status}">
                          {transaction.status}
                        </span>
                      </td>
                      <td>{formatDate(transaction.created_at)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          
        {/if}
      {/if}
      
      <!-- БАЗА ДАННЫХ -->
      {#if activeTab === 'database'}
        <div class="section-header">
          <h2>Управление базой данных</h2>
        </div>
        
        {#if loading}
          <div class="loading">Загрузка...</div>
        {:else}
          <div class="db-tables-grid">
            {#each dbTables as table}
              <button
                class="table-card {selectedTable === table.name ? 'active' : ''}"
                on:click={() => loadTableData(table.name)}
              >
                <div class="table-name">{table.name}</div>
                <div class="table-info">{table.rows} строк • {table.columns} колонок</div>
              </button>
            {/each}
          </div>
          
          {#if tableData}
            <div class="table-data-view">
              <h3>{tableData.table}</h3>
              <p>{tableData.count} записей (показано последние 50)</p>
              <div class="data-table">
                <table>
                  <thead>
                    <tr>
                      {#each tableData.columns as col}
                        <th>{col.column_name}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each tableData.data as row}
                      <tr>
                        {#each tableData.columns as col}
                          <td>{row[col.column_name] ?? 'NULL'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        {/if}
      {/if}
      
      <!-- ТРАНЗАКЦИИ -->
      {#if activeTab === 'transactions'}
        <div class="section-header">
          <h2>Мониторинг транзакций</h2>
        </div>
        
        <div class="filters">
          <button 
            class="filter-btn {transactionsFilter === 'all' ? 'active' : ''}"
            on:click={() => transactionsFilter = 'all'}
          >
            Все
          </button>
          <button 
            class="filter-btn {transactionsFilter === 'ton' ? 'active' : ''}"
            on:click={() => transactionsFilter = 'ton'}
          >
            TON
          </button>
          <button 
            class="filter-btn {transactionsFilter === 'stars' ? 'active' : ''}"
            on:click={() => transactionsFilter = 'stars'}
          >
            Stars
          </button>
        </div>
        
        {#if loading}
          <div class="loading">Загрузка...</div>
        {:else}
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тип</th>
                  <th>Пользователь</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredTransactions as transaction}
                  <tr>
                    <td>{transaction.id}</td>
                    <td>
                      <span class="type-badge {transaction.type}">
                        {transaction.type?.toUpperCase()}
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
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
      
      <!-- ИГРЫ -->
      {#if activeTab === 'games'}
        <div class="section-header">
          <h2>Игровая статистика</h2>
        </div>
        
        {#if loading}
          <div class="loading">Загрузка...</div>
        {:else}
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Всего игр</h3>
              <div class="stat-value">{gameStats.totalGames}</div>
            </div>
            <div class="stat-card">
              <h3>Общие ставки</h3>
              <div class="stat-value">{formatNumber(gameStats.totalBets)}</div>
            </div>
            <div class="stat-card">
              <h3>Выплаты</h3>
              <div class="stat-value">{formatNumber(gameStats.totalPayouts)}</div>
            </div>
            <div class="stat-card">
              <h3>Преимущество казино</h3>
              <div class="stat-value">{formatNumber(gameStats.houseEdge)}%</div>
            </div>
          </div>
          
          <div class="recent-games">
            <h3>Последние игры</h3>
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Ставка</th>
                    <th>Множитель</th>
                    <th>Выплата</th>
                    <th>Прибыль</th>
                    <th>Время</th>
                  </tr>
                </thead>
                <tbody>
                  {#each recentGames as game}
                    <tr>
                      <td>{game.id}</td>
                      <td>{game.user_id}</td>
                      <td class="bet-amount">{formatNumber(game.bet_amount)}</td>
                      <td class="multiplier">x{formatNumber(game.multiplier)}</td>
                      <td class="payout">{formatNumber(game.payout)}</td>
                      <td class="profit {game.profit > 0 ? 'positive' : 'negative'}">
                        {formatNumber(game.profit)}
                      </td>
                      <td>{formatDate(game.created_at)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/if}
      
    </div>
  </div>
{/if}


<style>
  /* Общие стили */
  :global(body) {
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f5f5f5;
  }
  
  /* Экран входа */
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .login-box {
    background: white;
    padding: 3rem;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 400px;
    width: 90%;
  }
  
  .login-box h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .login-box p {
    color: #666;
    margin-bottom: 2rem;
  }
  
  .password-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1rem;
    margin-bottom: 1rem;
    box-sizing: border-box;
    transition: border-color 0.3s;
  }
  
  .password-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .auth-error {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .login-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
  
  /* Основная панель */
  .admin-panel {
    min-height: 100vh;
    background: #f5f5f5;
  }
  
  .admin-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .admin-header h1 {
    margin: 0;
    font-size: 1.8rem;
  }
  
  .logout-btn {
    padding: 0.6rem 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid white;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
  }
  
  .logout-btn:hover {
    background: white;
    color: #667eea;
  }
  
  /* Вкладки */
  .tabs {
    display: flex;
    gap: 0;
    background: white;
    border-bottom: 2px solid #e0e0e0;
    overflow-x: auto;
  }
  
  .tab {
    padding: 1rem 2rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #666;
    transition: all 0.3s;
    white-space: nowrap;
  }
  
  .tab:hover {
    color: #333;
    background: #f8f9fa;
  }
  
  .tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
    background: #f8f9fa;
  }
  
  /* Содержимое вкладок */
  .tab-content {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }
  
  /* Статистические карточки */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    text-align: center;
  }
  
  .stat-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    opacity: 0.9;
    font-weight: 500;
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    margin: 0;
  }
  
  /* Заголовок секции */
  .section-header {
    margin-bottom: 1.5rem;
  }
  
  .section-header h2 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  .search-input {
    width: 100%;
    max-width: 500px;
    padding: 0.8rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1rem;
    transition: border-color 0.3s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  /* Подвкладки */
  .sub-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .sub-tab {
    padding: 0.6rem 1.2rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.3s;
  }
  
  .sub-tab:hover {
    border-color: #667eea;
  }
  
  .sub-tab.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  
  /* Таблицы */
  .data-table {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
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
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  /* Кнопки для копирования */
  .copy-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    padding: 0.3rem 0.5rem;
    border-radius: 5px;
    font-family: monospace;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .copy-btn:hover {
    background: #f0f0f0;
  }
  
  .wallet-addr {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Статусы */
  .status {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    display: inline-block;
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
  
  /* Типы транзакций */
  .type-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    display: inline-block;
  }
  
  .type-badge.ton {
    background: #0088cc;
    color: white;
  }
  
  .type-badge.stars {
    background: #ffd700;
    color: #333;
  }
  
  /* Суммы */
  .amount {
    font-weight: bold;
    color: #667eea;
  }
  
  .bet-amount, .payout {
    font-weight: 600;
    color: #667eea;
  }
  
  .multiplier {
    font-weight: 600;
    color: #28a745;
  }
  
  .profit.positive {
    color: #28a745;
    font-weight: 600;
  }
  
  .profit.negative {
    color: #dc3545;
    font-weight: 600;
  }
  
  /* База данных */
  .db-tables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .table-card {
    padding: 1.5rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .table-card:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }
  
  .table-card.active {
    border-color: #667eea;
    background: #f0f7ff;
  }
  
  .table-name {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .table-info {
    font-size: 0.9rem;
    color: #666;
  }
  
  .table-data-view {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
  }
  
  .table-data-view h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .table-data-view p {
    margin: 0 0 1rem 0;
    color: #666;
  }
  
  /* Фильтры */
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .filter-btn {
    padding: 0.7rem 1.5rem;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 500;
  }
  
  .filter-btn:hover {
    border-color: #667eea;
  }
  
  .filter-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  
  /* Последние игры */
  .recent-games {
    margin-top: 2rem;
  }
  
  .recent-games h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  /* Загрузка */
  .loading {
    text-align: center;
    padding: 4rem 2rem;
    color: #666;
    font-size: 1.1rem;
  }
  
  /* Приветствие */
  .welcome-message {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .welcome-message h2 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  .welcome-message p {
    margin: 0;
    color: #666;
    font-size: 1.1rem;
  }
  
  /* Адаптивность */
  @media (max-width: 1024px) {
    .tab-content {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 768px) {
    .admin-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .admin-header h1 {
      font-size: 1.5rem;
    }
    
    .tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .tab {
      padding: 0.8rem 1rem;
      font-size: 0.9rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .data-table {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    table {
      font-size: 0.85rem;
    }
    
    th, td {
      padding: 0.6rem;
    }
  }
</style>