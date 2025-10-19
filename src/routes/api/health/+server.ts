import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logger.js';

/**
 * Health check endpoint for monitoring
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: env.NODE_ENV || 'development',
      checks: {
        database: await checkDatabase(),
        ton: await checkTonConnection()
      }
    };

    const responseTime = Date.now() - startTime;
    health.responseTime = responseTime;

    // Log health check if enabled
    if (env.ENABLE_REQUEST_LOGGING === 'true') {
      logger.debug('Health check completed', { responseTime, status: 'healthy' });
    }

    return json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
    
    return json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const start = Date.now();
  
  try {
    // Import database connection dynamically to avoid issues
    const { pool } = await import('$lib/server/db.js');
    
    // Simple query to check connection
    await pool.query('SELECT 1');
    
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

/**
 * Check TON API connection
 */
async function checkTonConnection(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const start = Date.now();
  
  try {
    const apiKey = env.TONAPI_KEY;
    if (!apiKey) {
      return {
        status: 'skipped',
        responseTime: Date.now() - start,
        error: 'TONAPI_KEY not configured'
      };
    }

    // Simple API call to check connection
    const response = await fetch('https://tonapi.io/v2/status', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } else {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: `TON API returned ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'TON API connection failed'
    };
  }
}

/**
 * Check storage/filesystem
 */
function checkStorage(): { status: string; error?: string } {
  try {
    // Simple check - just return healthy for now
    // In a real production environment, you might want to check disk space, etc.
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Storage check failed'
    };
  }
}