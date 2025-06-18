import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[PROTECTED_ROUTE] No user found, redirecting to login');
      setLocation("/login");
      return;
    }

    if (user && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      console.warn(`[PROTECTED_ROUTE] User ${user.username} (${user.role}) does not have required role:`, requiredRoles);
      setLocation("/unauthorized");
      return;
    }

    if (user) {
      console.log(`[PROTECTED_ROUTE] Access granted for user: ${user.username} (${user.role})`);
    }
  }, [user, isLoading, requiredRoles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}