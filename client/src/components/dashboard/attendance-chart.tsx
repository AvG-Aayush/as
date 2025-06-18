import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Calendar, Users, UserCheck, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Attendance } from "@shared/schema";

export interface AttendanceChartRef {
  refreshData: () => Promise<void>;
}

const AttendanceChart = forwardRef<AttendanceChartRef>((props, ref) => {
  const [timeRange, setTimeRange] = useState("7");
  const [persistedData, setPersistedData] = useState<any>(null);

  // Get attendance data - only fetch when explicitly requested
  const { data: attendanceData, isLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['/api/admin/employees-attendance', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));
      
      params.append('startDate', startDate.toISOString().split('T')[0]);
      params.append('endDate', endDate.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/admin/employees-attendance?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch attendance data');
      }
      return response.json();
    },
    enabled: false, // Only fetch when explicitly requested
    staleTime: 10 * 60 * 1000, // Keep data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 300,
  });

  // Persist attendance data when it's fetched
  useEffect(() => {
    if (attendanceData) {
      setPersistedData(attendanceData);
    }
  }, [attendanceData]);

  // Get total employee count - fetch manually when needed
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: false, // Only fetch when explicitly requested
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 300,
  });

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshData: async () => {
      await Promise.all([refetchAttendance(), refetchUsers()]);
    }
  }), [refetchAttendance, refetchUsers]);

  // Process real attendance data for chart visualization
  const processAttendanceData = (data: any[]) => {
    // Get total number of employees (excluding admin)
    const totalEmployees = usersData ? usersData.filter((user: any) => user.role === 'employee').length : 5;
    
    console.log('Processing attendance data:', { 
      dataLength: data?.length, 
      totalEmployees, 
      hasUsersData: !!usersData,
      timeRange 
    });
    
    if (!data || data.length === 0) {
      // Return data showing 0% attendance for all days
      const chartData = [];
      for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        chartData.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attendance: 0,
          present: 0,
          total: totalEmployees,
          rate: 0
        });
      }
      return chartData;
    }

    // Group attendance by date and count unique users per day
    const attendanceByDate = data.reduce((acc: any, record: any) => {
      const date = new Date(record.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { presentUserIds: new Set() };
      }
      
      // Count as present if they have a check-in or status is present/completed
      if (record.checkIn || record.status === 'present' || record.status === 'completed') {
        acc[date].presentUserIds.add(record.userId);
      }
      
      return acc;
    }, {});

    // Create chart data for the selected time range
    const chartData = [];
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = attendanceByDate[dateStr] || { presentUserIds: new Set() };
      
      const presentUsers = dayData.presentUserIds.size;
      const attendanceRate = totalEmployees > 0 ? Math.round((presentUsers / totalEmployees) * 100) : 0;
      
      chartData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: attendanceRate,
        present: presentUsers,
        total: totalEmployees,
        rate: attendanceRate
      });
    }

    return chartData;
  };

  // Create permanent chart data using persisted data
  const chartData = processAttendanceData(persistedData || []);
  
  // Ensure we always have chart data to display
  const finalChartData = chartData.length > 0 ? chartData : (() => {
    const fallbackData = [];
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      fallbackData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: 0,
        present: 0,
        total: 0,
        rate: 0
      });
    }
    return fallbackData;
  })();
  
  const averageAttendance = finalChartData.length > 0 
    ? finalChartData.reduce((sum, item) => sum + item.rate, 0) / finalChartData.length 
    : 0;

  // Calculate dynamic trend
  const calculateTrend = () => {
    if (finalChartData.length < 2) return { value: '0.0', direction: 'neutral', icon: TrendingUp };
    
    const recentData = finalChartData.slice(-Math.min(3, finalChartData.length));
    const olderData = finalChartData.slice(0, Math.min(3, finalChartData.length));
    
    const recentAvg = recentData.reduce((sum, day) => sum + day.rate, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, day) => sum + day.rate, 0) / olderData.length;
    
    const difference = recentAvg - olderAvg;
    
    return {
      value: Math.abs(difference).toFixed(1),
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral',
      icon: difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : TrendingUp
    };
  };

  const trend = calculateTrend();

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${data.day} - ${data.date}`}</p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-flex items-center">
              <Users className="h-3 w-3 mr-1" />
              Present: {data.present}/{data.total}
            </span>
          </p>
          <p className="text-sm font-medium" style={{ color: payload[0].color }}>
            Attendance: {data.attendance}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Color function for bars based on attendance rate
  const getBarColor = (rate: number) => {
    if (rate >= 90) return "hsl(142, 76%, 36%)"; // Green
    if (rate >= 80) return "hsl(47, 96%, 53%)"; // Yellow
    if (rate >= 60) return "hsl(25, 95%, 53%)"; // Orange
    return "hsl(0, 84%, 60%)"; // Red
  };

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Attendance Trends</span>
            </CardTitle>
            <CardDescription>
              Employee attendance patterns over time
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                refetchAttendance();
                refetchUsers();
              }}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!persistedData && !isLoading ? (
          <div className="h-80 bg-muted/30 rounded-lg flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Click "Refresh" to load real-time attendance trends</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-80 bg-muted rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading attendance data...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart Area */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={finalChartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                    {finalChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.attendance)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-sm font-medium text-muted-foreground">Average Attendance</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(averageAttendance)}%
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm font-medium text-muted-foreground">Highest Day</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {finalChartData.length > 0 ? Math.max(...finalChartData.map(d => d.rate)) : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <trend.icon className={`h-5 w-5 mr-2 ${
                    trend.direction === 'up' ? 'text-green-600' : 
                    trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                  <p className="text-sm font-medium text-muted-foreground">Trend</p>
                </div>
                <p className={`text-2xl font-bold ${
                  trend.direction === 'up' ? 'text-green-600' : 
                  trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.value}%
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }}></div>
                <span className="text-sm text-muted-foreground">Excellent (90%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(47, 96%, 53%)" }}></div>
                <span className="text-sm text-muted-foreground">Good (80-89%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(25, 95%, 53%)" }}></div>
                <span className="text-sm text-muted-foreground">Fair (60-79%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 84%, 60%)" }}></div>
                <span className="text-sm text-muted-foreground">Low (&lt;60%)</span>
              </div>
            </div>

            {/* Data Summary */}
            {finalChartData.length > 0 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                Showing attendance data for the last {timeRange} days
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AttendanceChart.displayName = "AttendanceChart";

export default AttendanceChart;
