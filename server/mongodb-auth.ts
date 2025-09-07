import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { User } from "../shared/mongodb-schema";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

export async function authenticateUser(username: string, password: string): Promise<any | null> {
  try {
    console.log(`Attempting authentication for user: ${username}`);
    
    const user = await User.findOne({ username });
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
    
    // Convert MongoDB document to plain object for session storage
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      position: user.position,
      profilePicture: user.profilePicture,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Authentication error for user:', username, error);
    throw error; // Re-throw to surface the actual error
  }
}

export async function createUser(userData: any): Promise<any> {
  try {
    console.log('Creating new user:', userData.username);
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: userData.username },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      throw new Error('User with this username or email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create new user
    const newUser = new User({
      ...userData,
      password: hashedPassword
    });

    await newUser.save();
    
    console.log('User created successfully:', userData.username);
    
    // Return plain object
    return {
      id: newUser._id.toString(),
      _id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      department: newUser.department,
      position: newUser.position,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = req.session.user;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }
    next();
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user) {
    req.user = req.session.user;
  }
  next();
}

export async function getUserById(id: string): Promise<any | null> {
  try {
    const user = await User.findById(id);
    if (!user) return null;
    
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      position: user.position,
      profilePicture: user.profilePicture,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<any | null> {
  try {
    const user = await User.findOne({ username });
    if (!user) return null;
    
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      position: user.position,
      profilePicture: user.profilePicture,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}