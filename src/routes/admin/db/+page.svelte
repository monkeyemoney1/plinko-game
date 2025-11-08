<script lang="ts">
  import { onMount } from 'svelte';

  let password = '';
  let tables: any[] = [];
  let selectedTable = '';
  let tableData: any = null;
  let loading = false;
  let error = '';
  let activeSection: 'tables' | 'query' | 'stats' | 'export' = 'tables';
  let sqlQuery = '';
  let queryResult: any = null;
  let dbStats: any = null;

  onMount(() => {
    // Проверяем сохраненный пароль
    const savedPassword = localStorage.getItem('admin_db_password');
    if (savedPassword) {
      password = savedPassword;
      loadTables();
    }
  });

  async function loadTables() {
    if (!password) {
      error = 'Введите пароль';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Ошибка загрузки';
        tables = [];
        return;
      }

      tables = data.tables;
      localStorage.setItem('admin_db_password', password);
      loadStats();
    } catch (err) {
      error = 'Ошибка соединения';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadTableData(table: string) {
    loading = true;
    error = '';
    selectedTable = table;

    try {
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, table, limit: 50 })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Ошибка загрузки';
        tableData = null;
        return;
      }

      tableData = data;
    } catch (err) {
      error = 'Ошибка соединения';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'stats' })
      });

      if (response.ok) {
        const data = await response.json();
        dbStats = data;
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  }

  async function executeQuery() {
    if (!sqlQuery.trim()) {
      error = 'Введите SQL запрос';
      return;
    }

    loading = true;
    error = '';
    queryResult = null;

    try {
      const response = await fetch('/api/admin/db-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'query', query: sqlQuery })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Ошибка выполнения запроса';
        return;
      }

      queryResult = data;
    } catch (err) {
      error = 'Ошибка соединения';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="container">
  <h1>�️ Управление базой данных</h1>

  {#if !tables.length}
    <div class="login">
      <input
        type="password"
        bind:value={password}
        placeholder="Введите пароль администратора"
        on:keydown={(e) => e.key === 'Enter' && loadTables()}
      />
      <button on:click={loadTables} disabled={loading}>
        {loading ? 'Загрузка...' : 'Войти'}
      </button>
    </div>
  {:else}
    <!-- Навигация по секциям -->
    <div class="sections-nav">
      <button
        class="section-btn"
        class:active={activeSection === 'tables'}
        on:click={() => activeSection = 'tables'}
      >
        📊 Таблицы
      </button>
      <button
        class="section-btn"
        class:active={activeSection === 'stats'}
        on:click={() => activeSection = 'stats'}
      >
        📈 Статистика
      </button>
      <button
        class="section-btn"
        class:active={activeSection === 'query'}
        on:click={() => activeSection = 'query'}
      >
        💻 SQL Запросы
      </button>
      <button
        class="section-btn"
        class:active={activeSection === 'export'}
        on:click={() => activeSection = 'export'}
      >
        📥 Экспорт
      </button>
    </div>

    <!-- Секция: Таблицы -->
    {#if activeSection === 'tables'}
      <div class="tables-grid">
        <h2>📊 Таблицы в базе данных ({tables.length})</h2>
        <div class="tables-list">
          {#each tables as table}
            <button
              class="table-card"
              class:active={selectedTable === table.name}
              on:click={() => loadTableData(table.name)}
            >
              <div class="table-name">{table.name}</div>
              <div class="table-info">
                📝 {table.rows} строк • 📋 {table.columns} колонок
              </div>
            </button>
          {/each}
        </div>
      </div>

      {#if tableData}
        <div class="table-data">
          <h2>📋 {tableData.table}</h2>
          <p>{tableData.count} записей (показано последние 50)</p>

          <div class="table-scroll">
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

    <!-- Секция: Статистика -->
    {#if activeSection === 'stats'}
      <div class="stats-section">
        <h2>📈 Статистика базы данных</h2>
        
        {#if dbStats}
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-label">Всего таблиц</div>
              <div class="stat-value">{dbStats.total_tables || tables.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📝</div>
              <div class="stat-label">Всего записей</div>
              <div class="stat-value">{dbStats.total_rows || 'N/A'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">💾</div>
              <div class="stat-label">Размер БД</div>
              <div class="stat-value">{dbStats.database_size ? formatBytes(dbStats.database_size) : 'N/A'}</div>
            </div>
          </div>

          <div class="tables-stats">
            <h3>Детальная статистика по таблицам</h3>
            <table class="stats-table">
              <thead>
                <tr>
                  <th>Таблица</th>
                  <th>Записей</th>
                  <th>Размер</th>
                  <th>Последнее обновление</th>
                </tr>
              </thead>
              <tbody>
                {#each tables as table}
                  <tr>
                    <td><strong>{table.name}</strong></td>
                    <td>{table.rows}</td>
                    <td>{table.size || 'N/A'}</td>
                    <td>{table.last_update || 'N/A'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="loading-message">Загрузка статистики...</div>
        {/if}
      </div>
    {/if}

    <!-- Секция: SQL Запросы -->
    {#if activeSection === 'query'}
      <div class="query-section">
        <h2>💻 Выполнение SQL запросов</h2>
        <div class="warning-box">
          ⚠️ <strong>Внимание!</strong> Будьте осторожны с запросами UPDATE, DELETE и DROP. Они могут изменить или удалить данные безвозвратно.
        </div>

        <div class="query-examples">
          <h3>Примеры полезных запросов:</h3>
          <div class="examples-grid">
            <button class="example-btn" on:click={() => sqlQuery = 'SELECT * FROM users ORDER BY created_at DESC LIMIT 10;'}>
              Последние пользователи
            </button>
            <button class="example-btn" on:click={() => sqlQuery = 'SELECT COUNT(*) as total, SUM(bet_amount) as total_bets FROM game_bets;'}>
              Статистика ставок
            </button>
            <button class="example-btn" on:click={() => sqlQuery = 'SELECT * FROM ton_transactions WHERE status = \'PENDING\' ORDER BY created_at DESC;'}>
              Pending транзакции
            </button>
            <button class="example-btn" on:click={() => sqlQuery = 'SELECT user_id, COUNT(*) as games FROM game_bets GROUP BY user_id ORDER BY games DESC LIMIT 10;'}>
              Топ игроков
            </button>
          </div>
        </div>

        <textarea
          bind:value={sqlQuery}
          placeholder="Введите SQL запрос..."
          rows="8"
          class="sql-input"
        ></textarea>

        <button on:click={executeQuery} disabled={loading || !sqlQuery.trim()} class="execute-btn">
          {loading ? 'Выполнение...' : '▶️ Выполнить запрос'}
        </button>

        {#if queryResult}
          <div class="query-result">
            <h3>✅ Результат выполнения</h3>
            {#if queryResult.rows}
              <p>Получено строк: {queryResult.rows.length}</p>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {#each Object.keys(queryResult.rows[0] || {}) as key}
                        <th>{key}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each queryResult.rows as row}
                      <tr>
                        {#each Object.values(row) as value}
                          <td>{value ?? 'NULL'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {:else}
              <p>Запрос выполнен успешно. {queryResult.message || ''}</p>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Секция: Экспорт -->
    {#if activeSection === 'export'}
      <div class="export-section">
        <h2>📥 Экспорт данных</h2>
        <p>Экспорт данных из таблиц в различных форматах (CSV, JSON)</p>
        
        <div class="export-options">
          <h3>Выберите таблицу для экспорта:</h3>
          <div class="tables-list export-tables">
            {#each tables as table}
              <button class="table-card" on:click={() => alert('Функция экспорта будет добавлена')}>
                <div class="table-name">{table.name}</div>
                <div class="table-info">{table.rows} строк</div>
                <div class="export-formats">
                  <span class="format-badge">CSV</span>
                  <span class="format-badge">JSON</span>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <div class="info-box">
          💡 <strong>Совет:</strong> Для больших таблиц рекомендуется использовать фильтры или ограничения по времени для оптимизации экспорта.
        </div>
      </div>
    {/if}
  {/if}

  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #1a1a1a;
    font-weight: 700;
  }

  h2 {
    color: #2d2d2d;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  h3 {
    color: #444;
    font-weight: 600;
    margin: 1.5rem 0 1rem;
  }

  /* Секции навигации */
  .sections-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e0e0e0;
    flex-wrap: wrap;
  }

  .section-btn {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    color: #2d2d2d;
    transition: all 0.3s;
  }

  .section-btn:hover {
    color: #0066ff;
    background: #f8f9fa;
  }

  .section-btn.active {
    color: #0066ff;
    border-bottom-color: #0066ff;
    background: #f0f7ff;
  }

  .login {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    margin-top: 3rem;
  }

  input {
    padding: 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    min-width: 300px;
  }

  input:focus {
    outline: none;
    border-color: #0066ff;
  }

  button {
    padding: 0.75rem 2rem;
    background: #0066ff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 600;
  }

  button:hover:not(:disabled) {
    background: #0052cc;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .tables-grid {
    margin-top: 2rem;
  }

  .tables-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .table-card {
    padding: 1.5rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    text-align: left;
    transition: all 0.2s;
  }

  .table-card:hover {
    border-color: #0066ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 102, 255, 0.1);
  }

  .table-card.active {
    border-color: #0066ff;
    background: #f0f7ff;
  }

  .table-name {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .table-info {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .table-data {
    margin-top: 2rem;
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #e0e0e0;
  }

  .table-scroll {
    overflow-x: auto;
    margin-top: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th {
    background: #f5f5f5;
    padding: 0.75rem;
    text-align: left;
    font-weight: 700;
    color: #000;
    border-bottom: 2px solid #ddd;
    position: sticky;
    top: 0;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid #e0e0e0;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #2d2d2d;
    font-weight: 500;
  }

  tr:hover {
    background: #f9f9f9;
  }

  /* Статистика */
  .stats-section {
    margin-top: 2rem;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .stat-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
  }

  .tables-stats {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #e0e0e0;
  }

  .stats-table {
    margin-top: 1rem;
  }

  /* SQL Запросы */
  .query-section {
    margin-top: 2rem;
  }

  .warning-box {
    background: #fff3cd;
    border: 2px solid #ffc107;
    color: #856404;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .info-box {
    background: #e3f2fd;
    border: 2px solid #2196f3;
    color: #0d47a1;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1.5rem;
  }

  .query-examples {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #e0e0e0;
    margin-bottom: 1.5rem;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .example-btn {
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    font-size: 0.9rem;
    text-align: left;
    color: #495057;
  }

  .example-btn:hover {
    background: #e9ecef;
    border-color: #0066ff;
  }

  .sql-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.95rem;
    resize: vertical;
    margin-bottom: 1rem;
  }

  .sql-input:focus {
    outline: none;
    border-color: #0066ff;
  }

  .execute-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1.1rem;
  }

  .query-result {
    margin-top: 2rem;
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #28a745;
  }

  .query-result h3 {
    color: #28a745;
    margin-top: 0;
  }

  /* Экспорт */
  .export-section {
    margin-top: 2rem;
  }

  .export-options {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #e0e0e0;
    margin-bottom: 1.5rem;
  }

  .export-tables {
    margin-top: 1rem;
  }

  .export-formats {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
  }

  .format-badge {
    background: #0066ff;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    text-align: center;
    font-weight: 600;
  }

  .loading-message {
    text-align: center;
    padding: 3rem;
    color: #666;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .stats-cards {
      grid-template-columns: 1fr;
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .sections-nav {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .section-btn {
      white-space: nowrap;
    }
  }
</style>
