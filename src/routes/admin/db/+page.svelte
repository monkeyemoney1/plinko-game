<script lang="ts">
  import { onMount } from 'svelte';

  let password = '';
  let tables: any[] = [];
  let selectedTable = '';
  let tableData: any = null;
  let loading = false;
  let error = '';

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
</script>

<div class="container">
  <h1>🔐 Database Viewer</h1>

  {#if !tables.length}
    <div class="login">
      <input
        type="password"
        bind:value={password}
        placeholder="Введите пароль"
        on:keydown={(e) => e.key === 'Enter' && loadTables()}
      />
      <button on:click={loadTables} disabled={loading}>
        {loading ? 'Загрузка...' : 'Войти'}
      </button>
    </div>
  {:else}
    <div class="tables-grid">
      <h2>📊 Таблицы в базе данных</h2>
      <div class="tables-list">
        {#each tables as table}
          <button
            class="table-card"
            class:active={selectedTable === table.name}
            on:click={() => loadTableData(table.name)}
          >
            <div class="table-name">{table.name}</div>
            <div class="table-info">
              {table.rows} строк • {table.columns} колонок
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

  button {
    padding: 0.75rem 2rem;
    background: #0066ff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
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
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .table-info {
    font-size: 0.9rem;
    color: #666;
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
    font-weight: 600;
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
  }

  tr:hover {
    background: #f9f9f9;
  }

  .error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    text-align: center;
  }
</style>
