import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { RefreshCw, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import MetricsCards from "@/components/dashboard/metrics-cards";
import AnalyticsOverview from "@/components/dashboard/analytics-overview";
import RealTimeInsights from "@/components/dashboard/real-time-insights";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentAnnouncements from "@/components/dashboard/recent-activity";
import LeaveRequests from "@/components/dashboard/leave-requests";
import LiveTracker from "@/components/attendance/live-tracker";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Get dashboard metrics with optimized loading
  const { data: metrics, isLoading: metricsLoading, error, refetch } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const res = await fetch('/api/dashboard/metrics', {
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Authentication required');
          }
          throw new Error(`Failed to fetch metrics: ${res.status}`);
        }
        
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    enabled: !!user && !authLoading, // Only when authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2, // Allow 2 retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Show loading state only when auth is loading
  if (authLoading) {
    return (
      <div className="content-padding">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="content-padding">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please log in to view the dashboard</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    // Manually trigger all data fetching
    await refetch(); // Fetch dashboard metrics
    // Invalidate related queries to refresh analytics data
    queryClient.invalidateQueries({ queryKey: ['/api/admin/employees-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  // Provide default data structure to prevent rendering issues
  const safeMetrics = metrics || {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    attendanceRate: 0,
    pendingLeaves: 0,
    pendingTimeoffs: 0,
    pendingOvertimeRequests: 0,
    totalWorkingHours: 0,
    totalOvertimeHours: 0,
    avgWorkingHours: 0,
    lateArrivals: 0,
    earlyDepartures: 0,
    weeklyTrend: [],
    departmentPerformance: [],
    systemHealth: {
      attendanceSystem: 'operational',
      leaveManagement: 'operational',
      messaging: 'operational',
      lastUpdated: new Date().toISOString()
    }
  };

  return (
    <div className="content-padding space-y-4 sm:space-y-6">
      {/* Dashboard Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={metricsLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Show error banner if there's an error but still show dashboard */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="text-yellow-600 dark:text-yellow-400 text-sm">
              <strong>Notice:</strong> Some dashboard data may be outdated. Click refresh to update.
            </div>
          </div>
        </div>
      )}
      
      {/* Real-time Insights */}
      <RealTimeInsights metrics={safeMetrics} />

      {/* Metrics Cards - show cached data or loading placeholders */}
      <MetricsCards metrics={safeMetrics as any} isLoading={metricsLoading} />

      {/* Analytics Overview */}
      <AnalyticsOverview metrics={safeMetrics} isLoading={metricsLoading} />

      {/* Secondary Content Grid */}
      <div className="mobile-stack">
        {/* Quick Actions */}
        <div className="flex-1">
          <QuickActions />
        </div>
      </div>

      {/* Announcements and Leave Requests */}
      <div className="mobile-stack">
        <div className="flex-1">
          <RecentAnnouncements />
        </div>
        <div className="flex-1">
          <LeaveRequests />
        </div>
      </div>

      {/* Live Attendance Tracking */}
      <LiveTracker />
    </div>
  );
}
