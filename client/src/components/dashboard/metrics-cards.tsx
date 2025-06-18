import { 
  Users, 
  UserCheck, 
  Calendar, 
  Clock, 
  PlaneTakeoff, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Timer,
  Target,
  Activity,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface MetricsCardsProps {
  metrics?: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    attendanceRate: number;
    pendingLeaves: number;
    pendingTimeoffs: number;
    pendingOvertimeRequests: number;
    totalWorkingHours: number;
    totalOvertimeHours: number;
    avgWorkingHours: number;
    lateArrivals: number;
    earlyDepartures: number;
    weeklyTrend: Array<{
      date: string;
      present: number;
      absent: number;
      rate: number;
    }>;
    departmentPerformance: Array<{
      department: string;
      employeeCount: number;
      presentToday: number;
      attendanceRate: number;
    }>;
    systemHealth: {
      attendanceSystem: string;
      leaveManagement: string;
      messaging: string;
      lastUpdated: string;
    };
  };
  isLoading?: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayMetrics = metrics || {
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

  // Calculate trend from weekly data
  const weeklyTrend = displayMetrics.weeklyTrend || [];
  const lastWeekRate = weeklyTrend.length >= 2 ? weeklyTrend[weeklyTrend.length - 2]?.rate || 0 : 0;
  const currentRate = displayMetrics.attendanceRate || 0;
  const trendDirection = currentRate > lastWeekRate ? 'up' : currentRate < lastWeekRate ? 'down' : 'stable';
  const trendValue = Math.abs(currentRate - lastWeekRate);

  const primaryCards = [
    {
      title: "Total Employees",
      value: displayMetrics.totalEmployees,
      subtitle: `${displayMetrics.absentToday} absent • ${displayMetrics.onLeaveToday} on leave`,
      icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      progress: null,
      badge: null,
    },
    {
      title: "Present Today",
      value: displayMetrics.presentToday,
      subtitle: `${(displayMetrics.attendanceRate || 0).toFixed(1)}% attendance rate`,
      icon: UserCheck,
      iconBg: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      progress: displayMetrics.attendanceRate,
      badge: trendDirection === 'up' ? 
        { text: `+${(trendValue || 0).toFixed(1)}%`, variant: 'default', icon: TrendingUp } :
        trendDirection === 'down' ?
        { text: `-${(trendValue || 0).toFixed(1)}%`, variant: 'destructive', icon: TrendingDown } :
        null,
    },
    {
      title: "On Leave",
      value: displayMetrics.totalEmployees - displayMetrics.presentToday,
      subtitle: `${displayMetrics.pendingLeaves} pending requests`,
      icon: PlaneTakeoff,
      iconBg: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      progress: null,
      badge: displayMetrics.onLeaveToday > 0 ? 
        { text: `${displayMetrics.onLeaveToday} approved`, variant: 'secondary', icon: Calendar } : null,
    },
    {
      title: "Pending Requests",
      value: displayMetrics.pendingLeaves + displayMetrics.pendingTimeoffs + displayMetrics.pendingOvertimeRequests,
      subtitle: `${displayMetrics.pendingLeaves} leaves • ${displayMetrics.pendingTimeoffs} timeoffs`,
      icon: Calendar,
      iconBg: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-orange-600 dark:text-orange-400",
      progress: null,
      badge: displayMetrics.pendingOvertimeRequests > 0 ?
        { text: `${displayMetrics.pendingOvertimeRequests} OT`, variant: 'outline', icon: AlertCircle } : null,
    },

    {
      title: "System Health",
      value: "Operational",
      subtitle: "All systems running smoothly",
      icon: Activity,
      iconBg: "bg-emerald-100 dark:bg-emerald-900",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      progress: null,
      badge: { text: "Live", variant: 'default', icon: Target },
    },
  ];

  // Secondary metrics cards (to be removed as requested)
  const secondaryCards = [
    {
      title: "Working Hours",
      value: displayMetrics.avgWorkingHours || 0,
      subtitle: `${displayMetrics.avgWorkingHours?.toFixed(1) || '0.0'}h avg per person`,
      icon: Clock,
      iconBg: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      progress: null,
      badge: null,
    },
    {
      title: "Attendance Issues",
      value: (displayMetrics.lateArrivals || 0) + (displayMetrics.earlyDepartures || 0),
      subtitle: `${displayMetrics.lateArrivals || 0} late • ${displayMetrics.earlyDepartures || 0} early`,
      icon: AlertTriangle,
      iconBg: "bg-red-100 dark:bg-red-900",
      iconColor: "text-red-600 dark:text-red-400",
      progress: null,
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {primaryCards.slice(0, 3).map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-card border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {card.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-foreground">
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </p>
                      {card.badge && (
                        <Badge variant={card.badge.variant as any} className="text-xs">
                          {card.badge.icon && <card.badge.icon className="w-3 h-3 mr-1" />}
                          {card.badge.text}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`${card.iconColor} w-5 h-5`} />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {card.subtitle}
                </p>
                
                {card.progress !== null && (
                  <div className="space-y-1">
                    <Progress 
                      value={card.progress} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {(card.progress || 0).toFixed(1)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Department Performance Cards */}
      {displayMetrics.departmentPerformance && displayMetrics.departmentPerformance.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayMetrics.departmentPerformance.map((dept) => (
              <Card key={dept.department} className="bg-card border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{dept.department}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Present</span>
                      <span className="font-medium">{dept.presentToday}/{dept.employeeCount}</span>
                    </div>
                    <Progress value={dept.attendanceRate} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {(dept.attendanceRate || 0).toFixed(1)}% attendance
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
