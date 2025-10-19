<script lang="ts">
  import { onMount } from 'svelte';
  
  let gameStats = {
    totalGames: 0,
    totalBets: 0,
    totalPayouts: 0,
    houseEdge: 0,
    averageBet: 0,
    biggestWin: 0
  };
  
  let recentGames = [];
  let loading = true;
  
  async function loadGameStats() {
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
  
  onMount(loadGameStats);
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ru-RU');
  }
  
  function formatNumber(num: number) {
    return new Intl.NumberFormat('ru-RU', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(num);
  }
</script>

<svelte:head>
  <title>Игровая статистика - Admin</title>
</svelte:head>

<div class="admin-games">
  <h1>Игровая статистика</h1>
  
  {#if loading}
    <div class="loading">Загрузка статистики...</div>
  {:else}
    <!-- Общая статистика -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Всего игр</h3>
        <div class="stat-value">{gameStats.totalGames}</div>
      </div>
      <div class="stat-card">
        <h3>Общая сумма ставок</h3>
        <div class="stat-value">{formatNumber(gameStats.totalBets)}</div>
      </div>
      <div class="stat-card">
        <h3>Общие выплаты</h3>
        <div class="stat-value">{formatNumber(gameStats.totalPayouts)}</div>
      </div>
      <div class="stat-card">
        <h3>Преимущество казино</h3>
        <div class="stat-value">{formatNumber(gameStats.houseEdge)}%</div>
      </div>
      <div class="stat-card">
        <h3>Средняя ставка</h3>
        <div class="stat-value">{formatNumber(gameStats.averageBet)}</div>
      </div>
      <div class="stat-card">
        <h3>Максимальный выигрыш</h3>
        <div class="stat-value">{formatNumber(gameStats.biggestWin)}</div>
      </div>
    </div>
    
    <!-- Последние игры -->
    <div class="recent-games">
      <h2>Последние игры</h2>
      <div class="games-table">
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
</div>

<style>
  .admin-games {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  h1 {
    color: #333;
    margin-bottom: 2rem;
  }
  
  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
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
    font-size: 1.8rem;
    font-weight: bold;
  }
  
  .recent-games {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  .recent-games h2 {
    margin: 0 0 1.5rem 0;
    color: #333;
  }
  
  .games-table {
    overflow-x: auto;
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
  
  .bet-amount, .payout {
    font-weight: bold;
    color: #667eea;
  }
  
  .multiplier {
    font-weight: bold;
    color: #28a745;
  }
  
  .profit.positive {
    color: #28a745;
    font-weight: bold;
  }
  
  .profit.negative {
    color: #dc3545;
    font-weight: bold;
  }
  
  @media (max-width: 768px) {
    .admin-games {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>