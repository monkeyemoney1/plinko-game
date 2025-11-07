<script lang="ts">
  import { onMount } from 'svelte';
  
  let logs: any[] = [];
  let stats = { total: 0, info: 0, error: 0, warn: 0 };
  let loading = false;
  let error = '';
  let password = '';
  let autoRefresh = false;
  let refreshInterval: any = null;
  let levelFilter = 'all';
  let searchQuery = '';
  
  async function fetchLogs() {
    if (!password) {
      error = 'Enter admin password';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const params = new URLSearchParams({
        password,
        limit: '500'
      });
      
      if (levelFilter !== 'all') {
        params.append('level', levelFilter);
      }
      
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      
      if (data.success) {
        logs = data.logs;
        stats = data.stats;
      } else {
        error = data.error || 'Failed to fetch logs';
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
  
  async function clearLogs() {
    if (!confirm('Clear all logs?')) return;
    
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': password
        }
      });
      
      const data = await res.json();
      if (data.success) {
        logs = [];
        stats = { total: 0, info: 0, error: 0, warn: 0 };
      }
    } catch (e: any) {
      error = e.message;
    }
  }
  
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    
    if (autoRefresh) {
      refreshInterval = setInterval(fetchLogs, 3000);
    } else {
      if (refreshInterval) clearInterval(refreshInterval);
    }
  }
  
  $: filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    return log.message.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  onMount(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });
</script>

<svelte:head>
  <title>Admin Logs</title>
</svelte:head>

<div class="container">
  <h1>🔍 Application Logs</h1>
  
  <div class="controls">
    <div class="auth">
      <input 
        type="password" 
        bind:value={password} 
        placeholder="Admin password"
        on:keydown={(e) => e.key === 'Enter' && fetchLogs()}
      />
      <button on:click={fetchLogs} disabled={loading || !password}>
        {loading ? 'Loading...' : 'Fetch Logs'}
      </button>
    </div>
    
    <div class="filters">
      <select bind:value={levelFilter} on:change={fetchLogs}>
        <option value="all">All Levels</option>
        <option value="info">Info</option>
        <option value="warn">Warnings</option>
        <option value="error">Errors</option>
      </select>
      
      <input 
        type="text" 
        bind:value={searchQuery} 
        placeholder="Search in logs..."
      />
      
      <label>
        <input type="checkbox" checked={autoRefresh} on:change={toggleAutoRefresh} />
        Auto-refresh (3s)
      </label>
      
      <button on:click={clearLogs} disabled={!password} class="danger">
        Clear Logs
      </button>
    </div>
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  <div class="stats">
    <span>Total: {stats.total}</span>
    <span class="info">Info: {stats.info}</span>
    <span class="warn">Warnings: {stats.warn}</span>
    <span class="error-stat">Errors: {stats.error}</span>
  </div>
  
  <div class="logs">
    {#if filteredLogs.length === 0}
      <div class="empty">No logs found. Click "Fetch Logs" to load.</div>
    {:else}
      {#each filteredLogs as log}
        <div class="log-entry {log.level}">
          <span class="timestamp">{new Date(log.timestamp).toLocaleString()}</span>
          <span class="level">[{log.level.toUpperCase()}]</span>
          <span class="message">{log.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Courier New', monospace;
  }
  
  h1 {
    margin-bottom: 20px;
  }
  
  .controls {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .auth {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  
  input[type="password"],
  input[type="text"],
  select {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
  }
  
  input[type="password"] {
    flex: 1;
    max-width: 300px;
  }
  
  input[type="text"] {
    flex: 1;
    max-width: 400px;
  }
  
  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover:not(:disabled) {
    background: #0056b3;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  button.danger {
    background: #dc3545;
  }
  
  button.danger:hover:not(:disabled) {
    background: #c82333;
  }
  
  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
  }
  
  .stats {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .stats .info { color: #007bff; }
  .stats .warn { color: #ffc107; }
  .stats .error-stat { color: #dc3545; }
  
  .logs {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 8px;
    max-height: 70vh;
    overflow-y: auto;
    font-size: 13px;
    line-height: 1.6;
  }
  
  .empty {
    text-align: center;
    padding: 40px;
    color: #888;
  }
  
  .log-entry {
    padding: 6px 0;
    border-bottom: 1px solid #333;
  }
  
  .log-entry:last-child {
    border-bottom: none;
  }
  
  .log-entry.error {
    background: rgba(220, 53, 69, 0.1);
  }
  
  .log-entry.warn {
    background: rgba(255, 193, 7, 0.1);
  }
  
  .timestamp {
    color: #858585;
    margin-right: 10px;
  }
  
  .level {
    font-weight: bold;
    margin-right: 10px;
  }
  
  .log-entry.info .level { color: #4fc3f7; }
  .log-entry.warn .level { color: #ffc107; }
  .log-entry.error .level { color: #ef5350; }
  
  .message {
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }
</style>
