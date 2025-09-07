import mongoose from 'mongoose';
import { log } from './vite';

function getMongoUrl(): string {
  const mongoUrl = process.env.MONGO_URL || process.env.DATABASE_URL;
  
  if (!mongoUrl) {
    console.error('[MongoDB] ERROR: MONGO_URL environment variable is required');
    throw new Error('MONGO_URL environment variable is required');
  }

  return mongoUrl;
}

let isConnected = false;

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    const mongoUrl = getMongoUrl();
    log(`[MongoDB] Connecting to database...`);

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    log('[MongoDB] Connected successfully');

    mongoose.connection.on('error', (error) => {
      log(`[MongoDB] Connection error: ${error}`, 'error');
    });

    mongoose.connection.on('disconnected', () => {
      log('[MongoDB] Disconnected', 'error');
      isConnected = false;
    });

  } catch (error) {
    log(`[MongoDB] Connection failed: ${error}`, 'error');
    throw error;
  }
}

// Graceful shutdown
export async function disconnectFromMongoDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    log('[MongoDB] Disconnected gracefully');
  } catch (error) {
    log(`[MongoDB] Error during disconnect: ${error}`, 'error');
  }
}

export { mongoose };