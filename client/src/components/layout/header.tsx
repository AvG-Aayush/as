import { useState } from "react";
import { Search, Bell, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

const pageTitle: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Overview",
    description: "Welcome back! Here's what's happening at your company today.",
  },
  "/onboarding": {
    title: "Employee Onboarding",
    description: "Manage new employee registration and setup processes.",
  },
  "/attendance": {
    title: "Attendance Tracking",
    description: "Monitor employee attendance with GPS and biometric verification.",
  },
  "/leave-management": {
    title: "Leave Management",
    description: "Review and manage employee leave requests and approvals.",
  },
  "/shift-scheduling": {
    title: "Shift Scheduling",
    description: "Create and manage employee work schedules and assignments.",
  },
  "/chat": {
    title: "Internal Chat",
    description: "Secure communication platform for team collaboration.",
  },
  "/ai-insights": {
    title: "AI Insights",
    description: "Smart analytics and automated reports for HR decision making.",
  },
  "/role-management": {
    title: "Role Management",
    description: "Configure user roles and permission levels across the platform.",
  },
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  
  const currentPage = pageTitle[location] || {
    title: "HR Platform",
    description: "Human Resources Management System",
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log("Searching for:", searchQuery);
      // You could navigate to a search results page or filter current data
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        {/* Page title and description */}
        <div className="flex-1 min-w-0 mr-4 lg:mr-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold charcoal-text truncate">
            {currentPage.title}
          </h2>
          <p className="text-muted-foreground mt-1 truncate text-xs sm:text-sm lg:text-base hidden sm:block">
            {currentPage.description}
          </p>
        </div>

        {/* User profile and logout */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profilePicture || ""} alt={user.fullName} />
                    <AvatarFallback>
                      {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Role: {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile search bar */}
      {/* <div className="sm:hidden mt-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="search"
              placeholder="Search employees, reports..."
              className="pl-10 pr-4 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div> */}
    </header>
  );
}
