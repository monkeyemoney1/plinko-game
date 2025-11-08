<script lang="ts">
  import { onMount } from 'svelte';
  let password = '';
  let logs: any[] = [];
  let stats: any = { total: 0, info: 0, warn: 0, error: 0 };
  let level = 'all';
  let search = '';
  let auto = true;
  let timer: any;

  async function fetchLogs() {
    if (!password) return;
    const params = new URLSearchParams({ password, limit: '500' });
    if (level !== 'all') params.set('level', level);
    const res = await fetch(`/api/admin/logs?${params}`);
    const data = await res.json();
    if (data.success) {
      logs = data.logs;
      stats = data.stats;
    }
  }
  function toggleAuto() {
    auto = !auto;
    if (auto) timer = setInterval(fetchLogs, 3000); else clearInterval(timer);
  }
  $: filtered = logs.filter(l => !search || l.message.toLowerCase().includes(search.toLowerCase()));
  onMount(() => { timer = setInterval(fetchLogs, 3000); return () => clearInterval(timer); });
</script>

<style>
  .wrap { max-width: 1300px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif; }
  h1 { margin: 0 0 16px; }
  .panel { background:#f5f5f5; padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px; }
  .row { display:flex; flex-wrap:wrap; gap:10px; }
  input, select { padding:8px 10px; border:1px solid #ccc; border-radius:4px; }
  button { padding:8px 14px; border:none; background:#0069d9; color:#fff; border-radius:4px; cursor:pointer; font-weight:600; }
  button:disabled { background:#999; }
  .stats { display:flex; gap:20px; font-weight:600; margin:10px 0; }
  .logs { background:#1e1e1e; color:#ddd; padding:12px 14px; border-radius:8px; max-height:65vh; overflow:auto; font:12px/1.5 monospace; }
  .entry { border-bottom:1px solid #333; padding:6px 0; }
  .entry:last-child { border-bottom:none; }
  .entry.error { background:rgba(220,53,69,.15); }
  .entry.warn { background:rgba(255,193,7,.15); }
  .ts { color:#888; margin-right:8px; }
  .lvl { font-weight:700; margin-right:8px; }
  .lvl.info { color:#4fc3f7; }
  .lvl.warn { color:#ffc107; }
  .lvl.error { color:#ff5252; }
  .empty { text-align:center; padding:40px; color:#777; }
</style>

<div class="wrap">
  <h1>🔍 Application Logs</h1>
  <div class="panel">
    <div class="row">
      <input type="password" bind:value={password} placeholder="Admin password" />
      <button on:click={fetchLogs} disabled={!password}>Fetch Logs</button>
      <select bind:value={level} on:change={fetchLogs}>
        <option value="all">All</option>
        <option value="info">Info</option>
        <option value="warn">Warn</option>
        <option value="error">Error</option>
      </select>
      <input type="text" bind:value={search} placeholder="Search..." />
      <label style="display:flex;align-items:center;gap:6px; font-size:14px;">
        <input type="checkbox" checked={auto} on:change={toggleAuto} /> Auto-refresh (3s)
      </label>
    </div>
    <div class="stats">
      <span>Total: {stats.total}</span>
      <span style="color:#4fc3f7">Info: {stats.info}</span>
      <span style="color:#ffc107">Warn: {stats.warn}</span>
      <span style="color:#ff5252">Error: {stats.error}</span>
    </div>
  </div>
  <div class="logs">
    {#if filtered.length === 0}
      <div class="empty">No logs yet</div>
    {:else}
      {#each filtered as l}
        <div class="entry {l.level}">
          <span class="ts">{new Date(l.timestamp).toLocaleString()}</span>
          <span class="lvl {l.level}">[{l.level.toUpperCase()}]</span>
          <span class="msg">{l.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
