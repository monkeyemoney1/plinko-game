<script lang="ts">
  import { onMount } from 'svelte';
  
  let stats = {
    totalUsers: 0,
    telegramUsers: 0,
    connectedWallets: 0,
    totalStarsVolume: 0,
    totalGames: 0,
    totalBets: 0
  };
  
  async function loadStats() {
    try {
      // Загружаем общие статистики
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        stats = await response.json();
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  }
  
  onMount(loadStats);
</script>

<svelte:head>
  <title>Админ панель</title>
</svelte:head>

<div class="admin-panel">
  <h1>Админ панель</h1>
  
  <!-- Общая статистика -->
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
  
  <!-- Навигация по разделам -->
  <div class="admin-sections">
    <a href="/admin/analytics" class="section-card">
      <h3>📊 Аналитика пользователей</h3>
      <p>Подробная информация о пользователях, их кошельках и транзакциях Telegram Stars</p>
    </a>
    
    <a href="/admin/db" class="section-card">
      <h3>🗄️ База данных</h3>
      <p>Управление базой данных, запросы и статистика</p>
    </a>
    
    <a href="/admin/transactions" class="section-card">
      <h3>💳 Транзакции</h3>
      <p>Мониторинг всех транзакций TON и Telegram Stars</p>
    </a>
    
    <a href="/admin/games" class="section-card">
      <h3>🎲 Игровая статистика</h3>
      <p>Статистика игр, ставок и выигрышей</p>
    </a>
  </div>
</div>

<style>
  .admin-panel {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  h1 {
    color: #333;
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
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
  
  .admin-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .section-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .section-card:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .section-card h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.2rem;
  }
  
  .section-card p {
    margin: 0;
    color: #666;
    line-height: 1.5;
  }
  
  @media (max-width: 768px) {
    .admin-panel {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .admin-sections {
      grid-template-columns: 1fr;
    }
  }
</style>