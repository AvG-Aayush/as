import { db, executeWithTimeout } from './db';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  start() {
    if (this.cleanupInterval) {
      console.log('Session cleanup service already running');
      return;
    }
    
    console.log('Session cleanup service started - runs every hour');
    
    // Run initial cleanup immediately
    this.performCleanup();
    
    // Schedule regular cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('Session cleanup service stopped');
  }
  
  private async getSessionTableSchema() {
    try {
      const result = await executeWithTimeout(
        () => db.execute(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sessions'
          ORDER BY ordinal_position;
        `),
        10000,
        "Get session table schema"
      );
      
      return result.rows.map((row: any) => ({
        column: row.column_name,
        type: row.data_type
      }));
    } catch (error) {
      console.error('Failed to get session table schema:', error);
      return [];
    }
  }

  private async performCleanup() {
    try {
      // First, get the session table schema to understand its structure
      const schema = await this.getSessionTableSchema();
      
      if (schema.length === 0) {
        console.log('Session table does not exist, skipping cleanup');
        return { expiredSessions: 0, oldSessions: 0 };
      }
      
      console.log('Session table schema detected:', schema.map(s => s.column).join(', '));
      
      // Check if we have the expected expiration column
      const hasExpiresAt = schema.some(col => col.column === 'expires_at');
      const hasExpiredAt = schema.some(col => col.column === 'expired_at');
      const hasCreatedAt = schema.some(col => col.column === 'created_at');
      
      let deletedExpired = 0;
      let deletedOld = 0;
      
      if (hasExpiresAt) {
        // Delete expired sessions using expires_at column
        const now = new Date().toISOString();
        const expiredResult = await executeWithTimeout(
          () => db.execute(`DELETE FROM sessions WHERE expires_at < '${now}'`),
          15000,
          "Delete expired sessions"
        );
        deletedExpired = expiredResult.rowCount || 0;
      } else if (hasExpiredAt) {
        // Alternative column name
        const now = new Date().toISOString();
        const expiredResult = await executeWithTimeout(
          () => db.execute(`DELETE FROM sessions WHERE expired_at < '${now}'`),
          15000,
          "Delete expired sessions (alt column)"
        );
        deletedExpired = expiredResult.rowCount || 0;
      }
      
      if (hasCreatedAt) {
        // Additional cleanup: sessions older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldResult = await executeWithTimeout(
          () => db.execute(`DELETE FROM sessions WHERE created_at < '${thirtyDaysAgo.toISOString()}'`),
          15000,
          "Delete old sessions"
        );
        deletedOld = oldResult.rowCount || 0;
      }
      
      if (deletedExpired > 0) {
        console.log(`Session cleanup: removed ${deletedExpired} expired sessions`);
      }
      
      if (deletedOld > 0) {
        console.log(`Session cleanup: removed ${deletedOld} old sessions (30+ days)`);
      }
      
      return {
        expiredSessions: deletedExpired,
        oldSessions: deletedOld
      };
    } catch (error) {
      console.error('Session cleanup failed:', error);
      return {
        expiredSessions: 0,
        oldSessions: 0
      };
    }
  }
  
  async runCleanup() {
    return await this.performCleanup();
  }
  
  async getSessionStats() {
    try {
      const schema = await this.getSessionTableSchema();
      
      if (schema.length === 0) {
        return { total: 0, expired: 0, active: 0 };
      }
      
      // Count total sessions
      const totalResult = await executeWithTimeout(
        () => db.execute(`SELECT COUNT(*) as count FROM sessions`),
        10000,
        "Count total sessions"
      );
      const total = parseInt(String((totalResult.rows[0] as any)?.count || '0'));
      
      // Count expired sessions if expiration column exists
      let expired = 0;
      const hasExpiresAt = schema.some(col => col.column === 'expires_at');
      const hasExpiredAt = schema.some(col => col.column === 'expired_at');
      
      if (hasExpiresAt) {
        const now = new Date().toISOString();
        const expiredResult = await executeWithTimeout(
          () => db.execute(`SELECT COUNT(*) as count FROM sessions WHERE expires_at < '${now}'`),
          10000,
          "Count expired sessions"
        );
        const countValue = (expiredResult.rows[0] as any)?.count;
        expired = parseInt(String(countValue) || '0');
      } else if (hasExpiredAt) {
        const now = new Date().toISOString();
        const expiredResult = await executeWithTimeout(
          () => db.execute(`SELECT COUNT(*) as count FROM sessions WHERE expired_at < '${now}'`),
          10000,
          "Count expired sessions (alt column)"
        );
        const countValue = (expiredResult.rows[0] as any)?.count;
        expired = parseInt(String(countValue) || '0');
      }
      
      return {
        total,
        expired,
        active: total - expired
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        total: 0,
        expired: 0,
        active: 0
      };
    }
  }
}

export const sessionCleanupService = new SessionCleanupService();