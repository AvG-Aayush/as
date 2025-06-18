import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Calendar,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  Area,
  AreaChart
} from "recharts";

interface AnalyticsOverviewProps {
  metrics?: any;
  isLoading?: boolean;
}

export default function AnalyticsOverview({ metrics, isLoading }: AnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState("attendance");

  // Fetch additional analytics data
  const { data: attendanceHistory } = useQuery({
    queryKey: ['/api/admin/employees-attendance'],
    queryFn: async () => {
      const response = await fetch('/api/admin/employees-attendance', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!metrics,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaveRequests } = useQuery({
    queryKey: ['/api/leave-requests/pending'],
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/pending', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!metrics,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
            <p>Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process weekly trend data for line chart
  const weeklyTrendData = metrics.weeklyTrend?.map((day: any) => ({
    day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    date: day.date,
    attendance: day.rate || 0,
    rate: day.rate || 0,
    present: day.present || 0,
    absent: day.absent || 0
  })) || [];



  // Process department performance for pie chart
  const departmentData = metrics.departmentPerformance?.map((dept: any, index: number) => ({
    name: dept.department,
    value: dept.employeeCount,
    attendance: dept.attendanceRate,
    color: `hsl(${index * 45}, 70%, 60%)`
  })) || [];

  // Leave status distribution
  const leaveStatusData = [
    { category: 'Present', count: metrics.presentToday || 0, fill: 'hsl(142, 76%, 36%)' },
    { category: 'On Leave', count: (metrics.totalEmployees || 0) - (metrics.presentToday || 0), fill: 'hsl(25, 95%, 53%)' }
  ];

  // Attendance issues breakdown
  const issuesData = [
    { type: 'Late Arrivals', count: metrics.lateArrivals || 0, color: 'hsl(25, 95%, 53%)' },
    { type: 'Early Departures', count: metrics.earlyDepartures || 0, color: 'hsl(0, 84%, 60%)' },
    { type: 'Absent', count: metrics.absentToday || 0, color: 'hsl(220, 14%, 66%)' }
  ];

  // Custom tooltips
  const AttendanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${data.day}`}</p>
          <p className="text-sm text-blue-600">
            Attendance: {data.attendance?.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Present: {data.present} | Absent: {data.absent}
          </p>
        </div>
      );
    }
    return null;
  };

  const DepartmentTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-blue-600">
            Employees: {data.value}
          </p>
          <p className="text-sm text-muted-foreground">
            Attendance: {data.attendance?.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Attendance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Weekly Attendance Trend
                </CardTitle>
                <CardDescription>
                  Daily attendance rates over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false}
                        tickLine={false}
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        className="text-xs"
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip content={<AttendanceTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="hsl(142, 76%, 36%)"
                        fill="hsl(142, 76%, 36%)"
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-xl font-bold text-green-600">
                      {weeklyTrendData.length > 0 
                        ? (weeklyTrendData.reduce((sum: number, day: any) => sum + day.attendance, 0) / weeklyTrendData.length).toFixed(1)
                        : '0.0'
                      }%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-xl font-bold text-blue-600">
                      {metrics.attendanceRate?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Present vs Absent Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Today's Status
                </CardTitle>
                <CardDescription>
                  Employee presence breakdown for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Present</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.presentToday}/{metrics.totalEmployees}
                    </span>
                  </div>
                  <Progress 
                    value={metrics.attendanceRate} 
                    className="h-3"
                  />
                  
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400">Present</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {metrics.presentToday}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-orange-600 dark:text-orange-400">On Leave</p>
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                        {metrics.onLeaveToday}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">Absent</p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-300">
                        {metrics.absentToday}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Department Distribution
                </CardTitle>
                <CardDescription>
                  Employee count by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {departmentData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DepartmentTooltip />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 space-y-2">
                  {departmentData.map((dept: any, index: number) => (
                    <div key={dept.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: dept.color }}
                        ></div>
                        <span className="text-sm font-medium">{dept.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dept.value} employees
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Department Performance
                </CardTitle>
                <CardDescription>
                  Attendance rates by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.departmentPerformance?.map((dept: any, index: number) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {dept.presentToday}/{dept.employeeCount}
                          </span>
                          <Badge variant={dept.attendanceRate >= 90 ? 'default' : dept.attendanceRate >= 80 ? 'secondary' : 'destructive'}>
                            {dept.attendanceRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={dept.attendanceRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave Status Today
                </CardTitle>
                <CardDescription>
                  Active employees vs on leave distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveStatusData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} className="text-xs" />
                      <Tooltip 
                        formatter={(value) => [`${value} employees`, 'Count']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Present Today</p>
                    <p className="text-xl font-bold text-green-600">
                      {metrics.presentToday || 0}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">On Leave</p>
                    <p className="text-xl font-bold text-blue-600">
                      {(metrics.totalEmployees || 0) - (metrics.presentToday || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Pending Requests
                </CardTitle>
                <CardDescription>
                  Requests awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-300">Leave Requests</p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Require approval</p>
                    </div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {metrics.pendingLeaves}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300">Time Off</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Pending review</p>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {metrics.pendingTimeoffs}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-700 dark:text-purple-300">Overtime</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Need approval</p>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {metrics.pendingOvertimeRequests}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
}