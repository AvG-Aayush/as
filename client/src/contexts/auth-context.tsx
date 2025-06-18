import { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session with server
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch("/api/user", {
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    console.log('[AUTH_CONTEXT] Starting login process for username:', username);
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      console.log('[AUTH_CONTEXT] Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AUTH_CONTEXT] Login failed:', errorData);
        throw new Error(errorData.error || "Login failed");
      }

      const { user } = await response.json();
      console.log('[AUTH_CONTEXT] Login successful for user:', user.username);
      
      // Remove password from user object for security
      const { password: _, ...userWithoutPassword } = user;
      setUser(userWithoutPassword);
      
      // Store session info in sessionId state for debugging
      setSessionId(user.id.toString());
      
    } catch (error) {
      console.error('[AUTH_CONTEXT] Login error:', error);
      setUser(null);
      setSessionId(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[AUTH_CONTEXT] Starting logout process for user:', user?.username);
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        console.log('[AUTH_CONTEXT] Logout successful');
      } else {
        console.warn('[AUTH_CONTEXT] Logout response not ok:', response.status);
      }
    } catch (error) {
      console.error("[AUTH_CONTEXT] Logout error:", error);
    } finally {
      console.log('[AUTH_CONTEXT] Clearing user state');
      setUser(null);
      setSessionId(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
