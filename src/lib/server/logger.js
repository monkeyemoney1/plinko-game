// In-memory logger for Render debugging
const MAX_LOGS = 1000;
const logs = [];

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function add(level, args) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: args.map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ')
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

console.log = (...args) => { add('info', args); originalLog(...args); };
console.error = (...args) => { add('error', args); originalError(...args); };
console.warn = (...args) => { add('warn', args); originalWarn(...args); };

export function getLogs(limit = 500, level = null) {
  let list = logs;
  if (level) list = list.filter((l) => l.level === level);
  return list.slice(-limit).reverse();
}

export function clearLogs() { logs.length = 0; }

export function getStats() {
  return {
    total: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length
  };
}

console.log('[LOGGER] Initialized');
