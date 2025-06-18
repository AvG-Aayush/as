import { Pool } from 'pg';

export interface DatabaseConfig {
  url: string;
  connectionString: string;
}

export interface AuthConfig {
  sessionSecret: string;
  tokenExpiry: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  auth: AuthConfig;
  environment: 'development' | 'production';
  port: number;
}

function getRequiredEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    console.error(`ERROR: Required environment variable ${name} is not set`);
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function getOptionalEnvVar(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function createAppConfig(): AppConfig {
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
      console.log("Constructed DATABASE_URL from Replit PostgreSQL variables");
    }
  }
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required and could not be constructed');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  console.log("Using database connection from environment");
  
  return {
    database: {
      url: databaseUrl,
      connectionString: databaseUrl,
    },
    auth: {
      sessionSecret: getOptionalEnvVar('SESSION_SECRET', 'default-session-secret-for-development'),
      tokenExpiry: parseInt(getOptionalEnvVar('TOKEN_EXPIRY', '86400'), 10), // 24 hours
    },
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    port: parseInt(getOptionalEnvVar('PORT', '5000'), 10),
  };
}

export async function validateDatabaseConnection(config: DatabaseConfig): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: config.connectionString });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection validated successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}