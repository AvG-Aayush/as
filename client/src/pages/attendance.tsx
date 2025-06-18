import { UnifiedAttendanceButton } from "@/components/attendance/UnifiedAttendanceButton";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: string;
  workingHours: number;
  overtimeHours: number;
  isLocationValid: boolean;
  requiresApproval: boolean;
  date: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export default function AttendancePage() {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: weeklyAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/history', user?.id],
    enabled: !!user?.id,
  });

  const getWeeklyStats = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const thisWeekAttendance = weeklyAttendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= weekStart && recordDate <= weekEnd;
    });

    const totalHours = thisWeekAttendance.reduce((sum, record) => sum + record.workingHours, 0);
    const totalOvertimeHours = thisWeekAttendance.reduce((sum, record) => sum + record.overtimeHours, 0);
    const daysPresent = thisWeekAttendance.filter(record => record.checkIn).length;

    return {
      totalHours: totalHours.toFixed(1),
      totalOvertimeHours: totalOvertimeHours.toFixed(1),
      daysPresent,
      averageHours: daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : '0.0'
    };
  };

  const weeklyStats = getWeeklyStats();

  const getStatusBadge = (status: string, isLocationValid: boolean, requiresApproval: boolean) => {
    if (requiresApproval) {
      return <Badge variant="outline" className="text-orange-600">Pending</Badge>;
    }
    
    if (!isLocationValid) {
      return <Badge variant="outline" className="text-blue-600">Remote</Badge>;
    }

    switch (status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>;
      case "completed":
        return <Badge className="bg-gray-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance and working hours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendance Control */}
        <div className="lg:col-span-2">
          <UnifiedAttendanceButton />
          
          {/* Recent Attendance History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklyAttendance.slice(0, 7).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <p className="font-medium">{format(new Date(record.date), 'MMM dd, yyyy')}</p>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          {record.checkIn && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              In: {format(new Date(record.checkIn), 'HH:mm')}
                            </span>
                          )}
                          {record.checkOut && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Out: {format(new Date(record.checkOut), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        {record.checkInLocation && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {record.checkInLocation}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(record.status, record.isLocationValid, record.requiresApproval)}
                      {record.workingHours > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {record.workingHours.toFixed(1)}h
                          {record.overtimeHours > 0 && (
                            <span className="text-orange-600 ml-1">
                              (+{record.overtimeHours.toFixed(1)}h OT)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {weeklyAttendance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance records found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{weeklyStats.totalHours}</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{weeklyStats.daysPresent}</p>
                  <p className="text-sm text-muted-foreground">Days Present</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Hours/Day</span>
                  <span className="text-sm font-medium">{weeklyStats.averageHours}h</span>
                </div>
                {parseFloat(weeklyStats.totalOvertimeHours) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Overtime Hours</span>
                    <span className="text-sm font-medium text-orange-600">{weeklyStats.totalOvertimeHours}h</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>GPS location required for check-in</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Remote work may require approval</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Overtime automatically calculated</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}