import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  UserPlus, 
  Clock, 
  Calendar, 
  CalendarCheck, 
  MessageSquare, 
  Bot, 
  Shield,
  ChartLine,
  Palette,
  LogOut,
  Menu,
  X,
  FileText,
  User,
  History,
  Send,
  Bell,
  CalendarDays,
  Navigation,
  MapPin,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import Header from "./header";


interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Get unread message count
  const { data: unreadCount } = useQuery<number>({
    queryKey: ['/api/messages/unread-count'],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: ChartLine,
      current: location === "/",
    },
    {
      name: "Updates",
      href: "/updates",
      icon: Bell,
      current: location === "/updates",
    },
    {
      name: "Employee Onboarding",
      href: "/onboarding",
      icon: UserPlus,
      current: location === "/onboarding",
      adminOnly: true,
    },
    {
      name: "Employee Directory",
      href: "/employees",
      icon: Users,
      current: location === "/employees",
      hrOnly: true,
    },
    {
      name: "Real-time Tracker",
      href: "/realtime-attendance",
      icon: Navigation,
      current: location === "/realtime-attendance",
    },

    {
      name: "Shift Scheduling",
      href: "/shift-scheduling",
      icon: CalendarCheck,
      current: location === "/shift-scheduling",
      hrOnly: true,
    },
    {
      name: "Personal Routine",
      href: "/personal-routine",
      icon: CalendarDays,
      current: location === "/personal-routine",
    },
    {
      name: "Calendar Events",
      href: "/admin-calendar",
      icon: Calendar,
      current: location === "/admin-calendar",
      adminOnly: true,
    },



    {
      name: "Messages",
      href: "/messages",
      icon: Send,
      current: location === "/messages",
      badge: (unreadCount && unreadCount > 0) ? unreadCount : undefined,
    },
    // {
    //   name: "AI Insights",
    //   href: "/ai-insights",
    //   icon: Bot,
    //   current: location === "/ai-insights",
    //   hrOnly: true,
    // },
    {
      name: "Role Management",
      href: "/role-management",
      icon: Shield,
      current: location === "/role-management",
      adminOnly: true,
    },
    {
      name: "Admin Requests",
      href: "/admin-requests",
      icon: FileText,
      current: location === "/admin-requests",
      adminOnly: true,
    },
    {
      name: "Request Forms",
      href: "/request-forms",
      icon: FileText,
      current: location === "/request-forms",
    },
    {
      name: "HR Forms",
      href: "/hr-forms",
      icon: Shield,
      current: location === "/hr-forms",
      hrOnly: true,
    },
    {
      name: "Attendance Records",
      href: "/admin-attendance",
      icon: Shield,
      current: location === "/admin-attendance",
      adminOnly: true,
    },

  ];

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.hrOnly && !['admin', 'hr'].includes(user?.role || '')) return false;
    return true;
  });

  const cycleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 primary-bg rounded-lg flex items-center justify-center">
            <Users className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold charcoal-text">Campaign Nepal</h1>
            <p className="text-sm text-muted-foreground">HR Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1">
        <ul className="space-y-2 px-4">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                      item.current
                        ? "primary-bg-50 primary-text-600 dark:bg-primary-900/50 dark:text-primary-400"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="destructive" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4">
        <div className="bg-muted rounded-lg p-4">
          <Link href="/profile">
            <div className="flex items-center space-x-3 mb-3 cursor-pointer hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profilePicture || `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAMAAzAMBIgACEQEDEQH/xAAbAAEAAwEBAQEAAAAAAAAAAAAAAQIFBgQDB//EADIQAQABBAADBQYFBQEAAAAAAAABAgMEEQUhMRITIkFRFTJTYXGBJDNSYpFCcoKhsRT/xAAWAQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAWEQEBAQAAAAAAAAAAAAAAAAAAEQH/2gAMAwEAAhEDEQA/AP0QBpkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABamiuqYimmZ+wqo+//kyJ6Wa/4VqsXaY8VuqPsD5BAIAAAAAAAAAAAAAAAAAAJppmuYiiNzPSES1uD4mo7+uOc+6Li2HwumIirI5z+lpUW6KI1TTER8oXGVQTET1SA8mRg2L0e5FNXrDFysa5jXOzXHhnpLpXwy7FORZm3Mc56LUc0ha5RNu5VRVGppnSrSACAAAAAAAAAAAAAAKtRRNdymn9U6dRZtxbt00U9IjTnuHR2sy3HzdImqAIAACJSAwuNWuzfpriPfjn9We2+OU/h6ao8qmK1iIAEAAAAAAAAAAAAAFV6+FT+Nt/d0TmMOuLeTbq/dzdPE8mdUAQAAAAZ/Gp/Cf5Qwmxx254LduPOdyx2sQAEAAAAAAAAAAAAAAPo6Lh2RGRjRMz4o5S516cHKnFvRP9M8qoTVx0gpbuU3Ke1RO4nzXRQABEzqNz0JZnFM3s0zatT4p6zHkDPz73f5NVUe7HKHmBpAAQAAAAAAAAAAAAAVQk2fYR6cTMuY1XhndP6WtY4nYuaiqrsVeksDZE+u0hXUxftT0uU/y+d3Nx7cbquRP0c1HLyOnTaRa0sritVymabEdmJ/q82dPOdyg+yoAKACKAKgAgAAAAAAAmmmqqqKaImZnpECoenHwr9+fDTqn1lo4XDKaPHfjdXo0opiI1HKPRKMu1wiiPza5n6PTTwzFjrRv6y9givL7Pxfgwez8X4MPUBHl9n4vwYPZ+L8GHqAjy+z8X4MInh2LMflRH0esCM+5wmxVHhmqmXiv8Lu24mbc9uP8AbdRopHKV0zROqomJ9EOlycW1kU6qp8XrHVg5eLcxbnZrjdM+7VHm1UfABQARAAAAAAU57iIhu8Mw+5o7y5Hjnp8nh4Tj97f7yqPDR/1uRMaTROko2bRUiNmwSI2AkRKAWEbNgkRs2CXzvWqL1uaK43Er7Ng5nLx6sa9NFUcvKXxdBxLH7/HmYjxUc4c/z82kABAAAAEoFqKe1XTHrIre4ba7rGpjXOecvUpT4aaY9ITtBYV2bFWFdmwWNq7AWNq7NgsK7NgsK7AWNq7EFpnk53Ntd1k109POHQbY/GadX6avWFxGeAqAAAAC9n86j+6FF7XK7RP7oFdH5G1Yncck7QTs2hGwW2bRuTmCdm0bNgnZMo2bBOzaNo2C2zau07BOzau07BO2Zxnra+ktLbM4vO6rcfIGaAqAAP/Z`} />
                <AvatarFallback>
                  {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.fullName || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ') || 'Employee'}
                </p>
              </div>
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={cycleTheme}
            >
              <Palette className="w-4 h-4 mr-2" />
              Switch Theme ({theme})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="shadow-lg"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 sm:w-72 bg-card border-r border-border flex flex-col
        lg:relative lg:translate-x-0 lg:block
        fixed h-full z-40 transition-transform duration-300 ease-in-out overflow-hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-xl lg:shadow-none
      `}>
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header />
        <div className="flex-1 overflow-auto bg-background">
          <div className="min-h-full">
            {children}
          </div>
        </div>
      </main>


    </div>
  );
}
