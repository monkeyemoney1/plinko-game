import { logger } from './logger.js';

/**
 * Global error handler for API routes
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Standard error responses
 */
export const ErrorResponses = {
  INVALID_REQUEST: (details?: string) => new ApiError(
    `Invalid request${details ? `: ${details}` : ''}`, 
    400, 
    'INVALID_REQUEST'
  ),
  
  UNAUTHORIZED: (details?: string) => new ApiError(
    `Unauthorized${details ? `: ${details}` : ''}`, 
    401, 
    'UNAUTHORIZED'
  ),
  
  FORBIDDEN: (details?: string) => new ApiError(
    `Forbidden${details ? `: ${details}` : ''}`, 
    403, 
    'FORBIDDEN'
  ),
  
  NOT_FOUND: (resource?: string) => new ApiError(
    `${resource || 'Resource'} not found`, 
    404, 
    'NOT_FOUND'
  ),
  
  CONFLICT: (details?: string) => new ApiError(
    `Conflict${details ? `: ${details}` : ''}`, 
    409, 
    'CONFLICT'
  ),
  
  RATE_LIMITED: () => new ApiError(
    'Rate limit exceeded', 
    429, 
    'RATE_LIMITED'
  ),
  
  SERVER_ERROR: (details?: string) => new ApiError(
    `Internal server error${details ? `: ${details}` : ''}`, 
    500, 
    'SERVER_ERROR'
  ),
  
  SERVICE_UNAVAILABLE: (service?: string) => new ApiError(
    `${service || 'Service'} unavailable`, 
    503, 
    'SERVICE_UNAVAILABLE'
  ),

  // Game-specific errors
  INSUFFICIENT_BALANCE: (required: number, available: number) => new ApiError(
    'Insufficient balance', 
    400, 
    'INSUFFICIENT_BALANCE',
    { required, available }
  ),
  
  INVALID_BET: (reason?: string) => new ApiError(
    `Invalid bet${reason ? `: ${reason}` : ''}`, 
    400, 
    'INVALID_BET'
  ),
  
  TRANSACTION_FAILED: (reason?: string) => new ApiError(
    `Transaction failed${reason ? `: ${reason}` : ''}`, 
    500, 
    'TRANSACTION_FAILED'
  ),
  
  WALLET_ERROR: (reason?: string) => new ApiError(
    `Wallet error${reason ? `: ${reason}` : ''}`, 
    500, 
    'WALLET_ERROR'
  )
};

/**
 * Handle and format API errors
 */
export function handleApiError(
  error: unknown, 
  context?: {
    ip?: string;
    userAgent?: string;
    url?: string;
    method?: string;
  },
  fallbackMessage = 'An unexpected error occurred'
): { body: any; status: number } {
  const requestContext = context || {};

  if (error instanceof ApiError) {
    // Log API errors with context
    logger.error(`API Error: ${error.message}`, {
      status: error.status,
      code: error.code,
      details: error.details,
      stack: error.stack
    }, requestContext);
    
    return {
      body: {
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      },
      status: error.status
    };
  }
  
  if (error instanceof Error) {
    // Log unexpected errors
    logger.error(`Unexpected Error: ${error.message}`, {
      name: error.name,
      stack: error.stack
    }, requestContext);
    
    return {
      body: {
        error: fallbackMessage,
        code: 'UNEXPECTED_ERROR'
      },
      status: 500
    };
  }
  
  // Log unknown errors
  logger.error('Unknown Error', { error }, requestContext);
  
  return {
    body: {
      error: fallbackMessage,
      code: 'UNKNOWN_ERROR'
    },
    status: 500
  };
}

/**
 * Async wrapper with error handling for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R> | R,
  fallbackMessage?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract context from args if available
      const result = handleApiError(error, undefined, fallbackMessage);
      throw new ApiError(result.body.error, result.status, result.body.code);
    }
  };
}

/**
 * Validation helpers
 */
export function validateRequired<T>(
  value: T | null | undefined, 
  fieldName: string
): T {
  if (value === null || value === undefined || value === '') {
    throw ErrorResponses.INVALID_REQUEST(`${fieldName} is required`);
  }
  return value;
}

export function validateNumber(
  value: any, 
  fieldName: string, 
  min?: number, 
  max?: number
): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw ErrorResponses.INVALID_REQUEST(`${fieldName} must be a number`);
  }
  
  if (min !== undefined && num < min) {
    throw ErrorResponses.INVALID_REQUEST(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw ErrorResponses.INVALID_REQUEST(`${fieldName} must be at most ${max}`);
  }
  
  return num;
}

export function validateEnum<T extends string>(
  value: any, 
  fieldName: string, 
  allowedValues: readonly T[]
): T {
  if (!allowedValues.includes(value)) {
    throw ErrorResponses.INVALID_REQUEST(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value;
}

/**
 * Database error helper
 */
export function handleDbError(error: any, operation: string): never {
  logger.error(`Database error in ${operation}`, {
    error: error.message,
    code: error.code,
    stack: error.stack
  });
  
  if (error.code === '23505') { // Unique constraint violation
    throw ErrorResponses.CONFLICT('Resource already exists');
  }
  
  if (error.code === '23503') { // Foreign key violation
    throw ErrorResponses.INVALID_REQUEST('Referenced resource does not exist');
  }
  
  throw ErrorResponses.SERVER_ERROR(`Database ${operation} failed`);
}

/**
 * Rate limiting helper
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests = 100, 
  windowMs = 15 * 60 * 1000
): void {
  const now = Date.now();
  const key = identifier;
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (existing.count >= maxRequests) {
    throw ErrorResponses.RATE_LIMITED();
  }
  
  existing.count++;
}