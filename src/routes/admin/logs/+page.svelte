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
    async function sendPing() {
      try {
        await fetch('/api/ping');
        // give the server a moment to write the log, then refresh
        setTimeout(fetchLogs, 300);
      } catch (e) {
        console.error('Ping failed', e);
      }
    }
  function toggleAuto() {
    auto = !auto;
    if (auto) timer = setInterval(fetchLogs, 3000); else clearInterval(timer);
  }
  $: filtered = logs.filter(l => !search || l.message.toLowerCase().includes(search.toLowerCase()));
  onMount(() => {
    try {
      const saved = localStorage.getItem('admin_pwd');
      if (saved) password = saved;
    } catch {}
    timer = setInterval(fetchLogs, 3000);
    return () => clearInterval(timer);
  });

  function onPwdInput(e: Event) {
    try { localStorage.setItem('admin_pwd', password); } catch {}
  }
</script>

<style>
  .wrap { max-width: 1300px; margin: 0 auto; padding: 20px; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#e6e6e6; }
  h1 { margin: 0 0 16px; }
  .panel { background:#ffffff; color:#111; padding:18px; border-radius:10px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 10px rgba(0,0,0,.15); }
  /* Force readable colors inside white panel */
  .panel, .panel * { color:#111 !important; }
  .row { display:flex; flex-wrap:wrap; gap:10px; }
  input, select { padding:10px 12px; border:1px solid #c7c7c7; border-radius:6px; font-size:15px; background:#fff !important; color:#111 !important; }
  input::placeholder { color:#7a8794 !important; }
  button { padding:10px 16px; border:none; background:#0d6efd; color:#fff; border-radius:6px; cursor:pointer; font-weight:700; font-size:15px; }
  button:disabled { background:#999; }
    .btn-secondary { background:#6c757d; }
  .stats { display:flex; gap:20px; font-weight:700; margin:6px 0 0; }
  .logs { background:#111418; color:#f0f3f5; padding:14px 16px; border-radius:10px; max-height:70vh; overflow:auto; font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .entry { border-bottom:1px solid #333; padding:6px 0; }
  .entry:last-child { border-bottom:none; }
  .entry.error { background:rgba(220,53,69,.12); }
  .entry.warn { background:rgba(255,193,7,.10); }
  .ts { color:#9aa4af; margin-right:10px; }
  .lvl { font-weight:900; margin-right:10px; letter-spacing:.2px; }
  .lvl.info { color:#4fc3f7; }
  .lvl.warn { color:#ffc107; }
  .lvl.error { color:#ff5252; }
  .empty { text-align:center; padding:40px; color:#9aa4af; font-size:15px; }
</style>

<div class="wrap">
  <h1>🔍 Application Logs</h1>
  <div class="panel">
    <div class="row">
  <input type="password" bind:value={password} on:input={onPwdInput} placeholder="Admin password" />
      <button on:click={fetchLogs} disabled={!password}>Fetch Logs</button>
          <button class="btn-secondary" on:click={sendPing}>Ping</button>
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
    {#if !password}
      <div class="empty">Enter admin password above and click "Fetch Logs"</div>
    {:else if filtered.length === 0}
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
