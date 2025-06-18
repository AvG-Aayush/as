import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RealTimeInsightsProps {
  metrics: any;
}

export default function RealTimeInsights({ metrics }: RealTimeInsightsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
            <p>Loading real-time insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const attendanceRate = metrics.attendanceRate || 0;
  const totalEmployees = metrics.totalEmployees || 0;
  const presentToday = metrics.presentToday || 0;

  // Calculate real-time status
  const getAttendanceStatus = () => {
    if (attendanceRate >= 95) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
    if (attendanceRate >= 85) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    if (attendanceRate >= 70) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { status: 'needs attention', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
  };

  const status = getAttendanceStatus();

  return (
    <div className="space-y-6">
      {/* Real-time Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Real-time Dashboard
              </CardTitle>
              <CardDescription>
                Live data updated every minute • Last update: {currentTime.toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Live</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${status.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold ${status.color}`}>
                  System Status: {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {presentToday} of {totalEmployees} employees present
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${status.color}`}>
                  {attendanceRate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={attendanceRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Employees */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-green-600">
                  {presentToday}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(metrics.totalEmployees || 0) - (metrics.presentToday || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                {metrics.pendingLeaves || 0} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(metrics.pendingLeaves || 0) + (metrics.pendingTimeoffs || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Needs Review
              </Badge>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Department Performance Summary */}
      {metrics.departmentPerformance && metrics.departmentPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Real-time attendance by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.departmentPerformance.map((dept: any, index: number) => (
                <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: `hsl(${index * 45}, 70%, 60%)` }}
                    ></div>
                    <div>
                      <p className="font-medium">{dept.department}</p>
                      <p className="text-sm text-muted-foreground">
                        {dept.presentToday}/{dept.employeeCount} present
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {dept.attendanceRate.toFixed(1)}%
                    </p>
                    <Progress value={dept.attendanceRate} className="w-20 h-2 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.systemHealth || {}).map(([system, status]) => {
              if (system === 'lastUpdated') return null;
              return (
                <div key={system} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium capitalize">
                      {system.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {status as string}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}