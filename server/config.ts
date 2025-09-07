export interface DatabaseConfig {
  url: string;
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

function getOptionalEnvVar(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function createAppConfig(): AppConfig {
  // Get MongoDB URL from environment
  const mongoUrl = process.env.MONGO_URL || process.env.DATABASE_URL;
  
  if (!mongoUrl) {
    console.error('ERROR: MONGO_URL environment variable is required');
    throw new Error('MONGO_URL environment variable is required');
  }
  
  console.log("Using MongoDB connection from environment");
  
  return {
    database: {
      url: mongoUrl,
    },
    auth: {
      sessionSecret: getOptionalEnvVar('SESSION_SECRET', 'default-session-secret-for-development'),
      tokenExpiry: parseInt(getOptionalEnvVar('TOKEN_EXPIRY', '86400'), 10), // 24 hours
    },
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    port: parseInt(getOptionalEnvVar('PORT', '5000'), 10),
  };
}

export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    const { connectToMongoDB } = await import('./mongodb');
    await connectToMongoDB();
    console.log('MongoDB connection validated successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
}