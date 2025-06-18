import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, User, Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeAttendance {
  userId: number;
  fullName: string;
  department: string;
  position: string;
  attendanceId: number | null;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  status: string | null;
  location?: string;
}

export default function LiveTracker() {
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { user } = useAuth();

  // Get today's attendance data for all employees (admin/hr only)
  const { data: attendanceResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/employees-attendance'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiRequest('GET', `/api/admin/employees-attendance?date=${today}`);
      return await res.json();
    },
    enabled: user?.role === 'admin' || user?.role === 'hr',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Extract the data array from the response
  const employeesAttendance = attendanceResponse?.data || [];

  // Listen for real-time attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      setLastUpdate(new Date());
      refetch();
    };

    const interval = setInterval(handleAttendanceUpdate, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusBadge = (employee: EmployeeAttendance) => {
    if (!employee.checkIn) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Absent
        </Badge>
      );
    }

    if (employee.status === 'break') {
      return (
        <Badge className="bg-yellow-500 text-white">
          <Activity className="h-3 w-3 mr-1" />
          On Break
        </Badge>
      );
    }

    if (employee.checkOut) {
      return (
        <Badge className="bg-gray-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Checked Out
        </Badge>
      );
    }

    // Check if late (assuming 9 AM start time)
    const checkInTime = new Date(employee.checkIn);
    const expectedStartTime = new Date(checkInTime);
    expectedStartTime.setHours(9, 0, 0, 0);

    if (checkInTime > expectedStartTime) {
      return (
        <Badge className="bg-orange-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Late
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-500 text-white">
        <Clock className="h-3 w-3 mr-1" />
        Present
      </Badge>
    );
  };

  const getLocationDisplay = (employee: EmployeeAttendance) => {
    if (!employee.checkIn) return 'N/A';
    
    const location = employee.location || 'Main Office';
    if (location.toLowerCase().includes('remote')) {
      return <Badge className="bg-blue-500 text-white">Remote</Badge>;
    }
    
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <MapPin className="h-3 w-3" />
        <span className="text-sm">{location}</span>
      </div>
    );
  };

  // Filter attendance records
  const filteredAttendance = employeesAttendance.filter((employee: EmployeeAttendance) => {
    const departmentMatch = departmentFilter === "all" || employee.department === departmentFilter;
    
    let statusMatch = true;
    if (statusFilter !== "all") {
      if (statusFilter === "present" && (!employee.checkIn || employee.checkOut)) {
        statusMatch = false;
      } else if (statusFilter === "absent" && employee.checkIn) {
        statusMatch = false;
      } else if (statusFilter === "break" && employee.status !== "break") {
        statusMatch = false;
      }
    }
    
    return departmentMatch && statusMatch;
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(employeesAttendance.map((emp: EmployeeAttendance) => emp.department).filter(Boolean)));

  // Calculate statistics
  const totalPresent = employeesAttendance.filter((emp: EmployeeAttendance) => emp.checkIn && !emp.checkOut).length;
  const totalAbsent = employeesAttendance.filter((emp: EmployeeAttendance) => !emp.checkIn).length;
  const totalCheckedOut = employeesAttendance.filter((emp: EmployeeAttendance) => emp.checkOut).length;
  const totalOnBreak = employeesAttendance.filter((emp: EmployeeAttendance) => emp.status === 'break').length;

  // Check if user has access
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Live tracker is only available for HR and Admin users</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">On Break</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{totalOnBreak}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-sm font-medium">Checked Out</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{totalCheckedOut}</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Live Attendance Tracking</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </CardTitle>
              <CardDescription>
                Real-time employee attendance monitoring - Last updated: {lastUpdate.toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="break">On Break</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No employees found matching the current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Check-in Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((employee: EmployeeAttendance) => {
                    const checkInTime = employee.checkIn ? new Date(employee.checkIn) : null;
                    const currentTime = new Date();
                    const duration = checkInTime && !employee.checkOut ? 
                      Math.floor((currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) : 0;

                    return (
                      <tr key={employee.userId} className="border-b border-border hover:bg-accent transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="text-sm">
                                {employee.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.fullName || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground">
                                {employee.position || 'No Position'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-foreground">{employee.department || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(employee)}
                        </td>
                        <td className="py-4 px-4 text-foreground">
                          {formatTime(employee.checkIn)}
                        </td>
                        <td className="py-4 px-4">
                          {getLocationDisplay(employee)}
                        </td>
                        <td className="py-4 px-4 text-foreground">
                          {employee.checkIn && !employee.checkOut ? 
                            `${duration}h ${Math.floor(((currentTime.getTime() - new Date(employee.checkIn).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m` 
                            : employee.checkOut && employee.checkIn ? 
                            `${Math.floor((new Date(employee.checkOut).getTime() - new Date(employee.checkIn).getTime()) / (1000 * 60 * 60))}h` 
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}