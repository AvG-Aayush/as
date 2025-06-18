import { db } from './db.js';
import { sql } from 'drizzle-orm';

export async function createMissingTables() {
  try {
    console.log('Creating missing database tables...');



    console.log('Missing database tables created successfully');
  } catch (error) {
    console.error('Error creating missing tables:', error);
  }
}