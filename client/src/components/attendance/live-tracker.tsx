import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, Users, MapPin, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";

interface EmployeeAttendance {
  id: number;
  userId: number;
  userName: string;
  department: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  checkInLocation: string | null;
  isLocationValid: boolean;
  requiresApproval: boolean;
  workingHours: number;
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
  const employeesAttendance: EmployeeAttendance[] = attendanceResponse?.data || [];

  // Listen for real-time attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      setLastUpdate(new Date());
      refetch();
    };

    return () => {
      // Cleanup
    };
  }, [refetch]);

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (checkIn: string | null, checkOut?: string | null) => {
    if (!checkIn) return '--';
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (employee: EmployeeAttendance) => {
    if (!employee.checkIn) {
      return <Badge variant="outline" className="text-red-600">Absent</Badge>;
    }
    
    if (employee.checkOut) {
      return <Badge variant="outline" className="text-gray-600">Checked Out</Badge>;
    }
    
    if (employee.status === 'break') {
      return <Badge variant="outline" className="text-yellow-600">On Break</Badge>;
    }
    
    if (employee.requiresApproval) {
      return <Badge variant="outline" className="text-orange-600">Pending</Badge>;
    }
    
    return <Badge className="bg-green-500 text-white">Present</Badge>;
  };

  const getLocationInfo = (employee: EmployeeAttendance) => {
    if (!employee.checkIn) return null;
    
    const location = employee.checkInLocation || 'Unknown';
    
    if (!employee.isLocationValid) {
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
  const departments = Array.from(new Set(employeesAttendance.map((emp: EmployeeAttendance) => emp.department).filter(Boolean))) as string[];

  // Calculate statistics
  const totalPresent = employeesAttendance.filter((emp: EmployeeAttendance) => emp.checkIn && !emp.checkOut).length;
  const totalAbsent = employeesAttendance.filter((emp: EmployeeAttendance) => !emp.checkIn).length;
  const totalCheckedOut = employeesAttendance.filter((emp: EmployeeAttendance) => emp.checkOut).length;
  const totalOnBreak = employeesAttendance.filter((emp: EmployeeAttendance) => emp.status === 'break').length;

  // Check if user has access
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to administrators and HR personnel.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Present</p>
                <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
              </div>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Break</p>
                <p className="text-2xl font-bold text-yellow-600">{totalOnBreak}</p>
              </div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checked Out</p>
                <p className="text-2xl font-bold text-gray-600">{totalCheckedOut}</p>
              </div>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Attendance Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Live Attendance Tracker</CardTitle>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Department:</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
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

          {/* Employee List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading attendance data...</span>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees match the current filters.</p>
              </div>
            ) : (
              filteredAttendance.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{employee.userName || `User ${employee.userId}`}</p>
                      <p className="text-sm text-muted-foreground">{employee.department || 'No Department'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Check-in</p>
                      <p className="font-medium">{formatTime(employee.checkIn)}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Check-out</p>
                      <p className="font-medium">{formatTime(employee.checkOut)}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(employee.checkIn, employee.checkOut)}</p>
                    </div>

                    <div className="text-center min-w-[80px]">
                      {getLocationInfo(employee)}
                    </div>

                    <div className="min-w-[100px]">
                      {getStatusBadge(employee)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}