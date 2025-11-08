// Direct logger access without console interception for debugging
import { getLogs, clearLogs, getStats } from './logger.js';

const MAX_LOGS = 1000;
const logs = [];

function add(level, message) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message)
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  console.log(`[DIRECT-LOG] ${level.toUpperCase()}: ${entry.message}`);
}

function getDirectLogs(limit = 500, level = null) {
  let list = logs;
  if (level) list = list.filter((l) => l.level === level);
  return list.slice(-limit).reverse();
}

function getDirectStats() {
  return {
    total: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length
  };
}

export { add, getDirectLogs, getDirectStats };