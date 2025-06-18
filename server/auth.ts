import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    console.log(`Attempting authentication for user: ${username}`);
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log(`Authentication failed: User not found: ${username}`);
      return null;
    }
    
    // Check if account is active
    if (!user.isActive) {
      console.log(`Authentication failed: Account is deactivated for user: ${username}`);
      return null;
    }
    
    console.log(`User found: ${username}, checking password...`);
    const passwordMatch = await comparePasswords(password, user.password);
    if (!passwordMatch) {
      console.log(`Authentication failed: Password mismatch for user: ${username}`);
      return null;
    }
    
    console.log(`User authenticated successfully: ${username}`);
    return user;
  } catch (error) {
    console.error('Authentication error for user:', username, error);
    throw error; // Re-throw to surface the actual error
  }
}

export async function createUser(username: string, email: string, password: string, role: string, fullName: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  
  // Check if user already exists
  const existingUserByUsername = await storage.getUserByUsername(username);
  if (existingUserByUsername) {
    throw new Error("Username already exists");
  }
  
  const existingUserByEmail = await storage.getUserByEmail(email);
  if (existingUserByEmail) {
    throw new Error("Email already exists");
  }
  
  return await storage.createUser({
    username,
    email,
    password: hashedPassword,
    role,
    fullName,
    department: role === 'admin' ? "Administration" : "General",
    position: role === 'admin' ? "System Administrator" : "Employee",
    isActive: true,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'Please log in to access this resource'
    });
  }
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth checks for static assets and Vite dev server files to improve performance
  if (req.path.startsWith('/@') || req.path.startsWith('/src/') || req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.tsx')) {
    return next();
  }
  
  // Debug session info for troubleshooting
  if (req.path.startsWith('/api/') && req.path !== '/api/login') {
    console.log(`[AUTH] ${req.method} ${req.path} - Session ID: ${(req as any).session?.id}, User ID: ${(req as any).session?.userId}`);
  }
  
  // First check session-based authentication (most common for web requests)
  if ((req as any).session?.userId) {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUser(userId);
      if (user && user.isActive !== false) {
        req.user = user;
        return next();
      } else {
        // User not found or inactive, clear session
        console.log(`[AUTH] User ${userId} not found or inactive, clearing session`);
        (req as any).session.destroy(() => {});
      }
    } catch (error) {
      console.error(`[AUTH] Session validation error:`, error);
      // Clear potentially corrupted session
      try {
        (req as any).session.destroy(() => {});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }

  // Check for Bearer token authentication as fallback
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const [username, password] = Buffer.from(token, 'base64').toString().split(':');
      const user = await authenticateUser(username, password);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      // Token auth failed, continue without user
    }
  }
  
  next();
}