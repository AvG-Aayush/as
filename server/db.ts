import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

function getDatabaseUrl(): string {
  // Get database URL from environment or construct from Replit PostgreSQL variables
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // Construct DATABASE_URL from Replit PostgreSQL environment variables
    const pgHost = process.env.PGHOST;
    const pgPort = process.env.PGPORT || '5432';
    const pgUser = process.env.PGUSER;
    const pgPassword = process.env.PGPASSWORD;
    const pgDatabase = process.env.PGDATABASE;
    
    if (pgHost && pgUser && pgPassword && pgDatabase) {
      databaseUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
      console.log('[DB] Constructed DATABASE_URL from Replit PostgreSQL variables');
    }
  }

  // Add parameters to disable all timeouts
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    url.searchParams.set('connect_timeout', '0');
    url.searchParams.set('command_timeout', '0');
    url.searchParams.set('statement_timeout', '0');
    url.searchParams.set('idle_in_transaction_session_timeout', '0');
    url.searchParams.set('lock_timeout', '0');
    databaseUrl = url.toString();
  }

  console.log('[DB] Environment check - DATABASE_URL exists:', !!databaseUrl);
  console.log('[DB] DATABASE_URL value:', databaseUrl ? `${databaseUrl.substring(0, 20)}...` : 'undefined');

  if (!databaseUrl) {
    console.error('[DB] ERROR: DATABASE_URL environment variable is required');
    console.error('[DB] Available env vars:', Object.keys(process.env).filter(key => key.includes('DB') || key.includes('PG')));
    throw new Error('DATABASE_URL environment variable is required');
  }

  return databaseUrl;
}

// Lazy initialization of database connection
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = getDatabaseUrl();
    console.log('[DB] Database URL configured successfully');

    const connectionString = databaseUrl;
    const isRemoteDb = databaseUrl?.includes('.') && !databaseUrl.includes('localhost');

    console.log('[DB] Creating connection pool with config:', {
      isRemoteDb,
      hasSSL: isRemoteDb
    });

    _pool = new Pool({ 
      connectionString: connectionString,
      ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
      max: 100,
      min: 0,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    });

    // Test database connection
    _pool.on('connect', () => {
      console.log('[DB] Connected to database successfully');
    });

    _pool.on('error', (err: any) => {
      console.error('[DB] Database connection error:', err);
      // Do not reset pool for timeout errors - let them persist
    });

    // Quick connection test without blocking startup
    _pool.connect()
      .then(client => {
        client.query('SELECT 1')
          .then(() => {
            console.log('[DB] Database connection test successful');
            client.release();
          })
          .catch(err => {
            console.error('[DB] Initial query failed:', err);
            client.release();
          });
      })
      .catch(err => {
        console.error('[DB] Initial connection failed:', err);
      });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Export for backward compatibility - but make them lazy
export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    return getPool()[prop as keyof Pool];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});

// Helper function to execute database operations directly without timeout
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs?: number,
  operationName: string = "Database operation"
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.error(`[DB] ${operationName} failed:`, error);
    throw error;
  }
}