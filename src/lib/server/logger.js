// In-memory logger для отладки на Render
// Перехватывает console.log/error и сохраняет в кольцевой буфер

const MAX_LOGS = 1000; // Максимум логов в памяти
const logs = [];

// Сохраняем оригинальные функции
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addLog(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  const logEntry = {
    timestamp,
    level,
    message
  };

  logs.push(logEntry);
  
  // Кольцевой буфер - удаляем старые логи
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

// Перехватываем console методы
console.log = function(...args) {
  addLog('info', args);
  originalLog.apply(console, args);
};

console.error = function(...args) {
  addLog('error', args);
  originalError.apply(console, args);
};

console.warn = function(...args) {
  addLog('warn', args);
  originalWarn.apply(console, args);
};

// API для получения логов
export function getLogs(limit = 500, level = null) {
  let filtered = logs;
  
  if (level) {
    filtered = logs.filter(log => log.level === level);
  }
  
  return filtered.slice(-limit).reverse(); // Последние N логов, новые сверху
}

export function clearLogs() {
  logs.length = 0;
}

export function getLogsCount() {
  return {
    total: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn').length
  };
}

console.log('[LOGGER] In-memory logger initialized, max logs:', MAX_LOGS);
