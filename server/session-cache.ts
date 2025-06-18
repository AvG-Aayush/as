import { User } from "../shared/schema";

interface CachedUser {
  user: User;
  lastAccessed: number;
  expiresAt: number;
}

class SessionCache {
  private static instance: SessionCache;
  private cache = new Map<string, CachedUser>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanup();
  }

  public static getInstance(): SessionCache {
    if (!SessionCache.instance) {
      SessionCache.instance = new SessionCache();
    }
    return SessionCache.instance;
  }

  public set(sessionId: string, user: User): void {
    const now = Date.now();
    this.cache.set(sessionId, {
      user,
      lastAccessed: now,
      expiresAt: now + this.CACHE_DURATION
    });
  }

  public get(sessionId: string): User | null {
    const cached = this.cache.get(sessionId);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      this.cache.delete(sessionId);
      return null;
    }

    // Update last accessed time and extend expiration
    cached.lastAccessed = now;
    cached.expiresAt = now + this.CACHE_DURATION;
    return cached.user;
  }

  public remove(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  public clear(): void {
    this.cache.clear();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      this.cache.forEach((cached, sessionId) => {
        if (now > cached.expiresAt) {
          this.cache.delete(sessionId);
        }
      });
    }, this.CLEANUP_INTERVAL);
  }

  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  public getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      const cached = this.cache.get(key);
      if (cached && now > cached.expiresAt) {
        expired++;
      }
    }
    return { size: this.cache.size, expired };
  }
}

export const sessionCache = SessionCache.getInstance();