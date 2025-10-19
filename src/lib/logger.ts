/**
 * Production-ready logging system for Plinko Game
 */
import { env } from '$env/dynamic/private';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private enableRequestLogging: boolean;
  private enableTransactionLogging: boolean;

  constructor() {
    this.logLevel = (env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    this.enableRequestLogging = env.ENABLE_REQUEST_LOGGING === 'true';
    this.enableTransactionLogging = env.ENABLE_TRANSACTION_LOGGING === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data, userId, ip, userAgent, requestId } = entry;
    
    let logString = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (requestId) logString += ` [${requestId}]`;
    if (userId) logString += ` [User:${userId}]`;
    if (ip) logString += ` [IP:${ip}]`;
    
    logString += ` ${message}`;
    
    if (data) {
      logString += ` | Data: ${JSON.stringify(data)}`;
    }
    
    if (userAgent && this.enableRequestLogging) {
      logString += ` | UA: ${userAgent}`;
    }
    
    return logString;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;
    
    const formattedLog = this.formatLog(entry);
    
    // Console output with colors
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
    }

    // In production, you might want to write to files or external logging service
    if (env.NODE_ENV === 'production') {
      // Example: write to file or send to logging service
      // fs.appendFileSync('logs/app.log', formattedLog + '\n');
    }
  }

  error(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      data,
      ...context
    });
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      data,
      ...context
    });
  }

  info(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      data,
      ...context
    });
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      data,
      ...context
    });
  }

  // Specialized logging methods
  transaction(message: string, data: any, context?: Partial<LogEntry>): void {
    if (!this.enableTransactionLogging) return;
    
    this.info(`[TRANSACTION] ${message}`, data, context);
  }

  api(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.enableRequestLogging) return;
    
    this.info(`[API] ${message}`, data, context);
  }

  game(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.info(`[GAME] ${message}`, data, context);
  }

  security(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.warn(`[SECURITY] ${message}`, data, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper function to extract request context
export function getRequestContext(request: Request): Partial<LogEntry> {
  const url = new URL(request.url);
  return {
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId: crypto.randomUUID()
  };
}

// Performance monitoring
export function measureTime<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: Partial<LogEntry>
): Promise<T> | T {
  const start = Date.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = Date.now() - start;
        logger.debug(`Operation completed: ${operation}`, { duration }, context);
      });
    } else {
      const duration = Date.now() - start;
      logger.debug(`Operation completed: ${operation}`, { duration }, context);
      return result;
    }
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Operation failed: ${operation}`, { 
      error: error instanceof Error ? error.message : error,
      duration 
    }, context);
    throw error;
  }
}