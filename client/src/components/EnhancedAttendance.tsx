import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Clock, MapPin, Download, Upload, Users, AlertCircle, 
  CheckCircle, Calendar as CalendarIcon, Filter 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FileUpload } from './FileUpload';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtimeHours: number;
  toilHoursEarned: number;
  status: string;
  date: string;
  isWeekendWork: boolean;
  notes: string | null;
}

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
  toilHoursEarned: number | null;
  isWeekendWork: boolean | null;
}

interface EnhancedAttendanceProps {
  userRole: string;
  currentUserId: number;
}

export function EnhancedAttendance({ userRole, currentUserId }: EnhancedAttendanceProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = ['admin', 'hr'].includes(userRole);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setCurrentLocation('Location not available');
        }
      );
    }
  }, []);

  // Today's attendance for current user
  const { data: todayAttendance } = useQuery({
    queryKey: ['/api/attendance/today', currentUserId]
  });

  // All employees attendance (admin only)
  const { data: employeesAttendance, refetch: refetchEmployeesAttendance } = useQuery<EmployeeAttendance[]>({
    queryKey: [`/api/admin/employees-attendance?date=${format(selectedDate, 'yyyy-MM-dd')}`],
    enabled: isAdmin
  });

  // Attendance report
  const { data: attendanceReport, refetch: refetchReport } = useQuery<AttendanceRecord[]>({
    queryKey: [`/api/admin/attendance/export?startDate=${dateRange.start}&endDate=${dateRange.end}`],
    enabled: isAdmin && dateRange.start && dateRange.end
  });

  const checkInMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/attendance/checkin', data),
    onSuccess: () => {
      toast({
        title: "Checked In Successfully",
        description: "Your attendance has been recorded"
      });
      setIsCheckedIn(true);
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ attendanceId, notes }: { attendanceId: number; notes?: string }) => 
      apiRequest('POST', `/api/attendance/checkout/${attendanceId}`, { notes }),
    onSuccess: () => {
      toast({
        title: "Checked Out Successfully",
        description: "Your work hours have been calculated and TOIL eligibility processed"
      });
      setIsCheckedIn(false);
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    }
  });

  const handleCheckIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkInMutation.mutate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location: currentLocation,
            deviceInfo: navigator.userAgent // Device information for tracking
          });
        },
        () => {
          checkInMutation.mutate({
            location: 'Location unavailable'
          });
        }
      );
    } else {
      checkInMutation.mutate({
        location: 'Geolocation not supported'
      });
    }
  };

  const handleCheckOut = (attendanceId: number) => {
    const notes = prompt("Add any notes for your checkout (optional):");
    checkOutMutation.mutate({ attendanceId, notes: notes || undefined });
  };

  const handleExportReport = () => {
    const csvContent = attendanceReport?.map(record => [
      record.fullName,
      record.department,
      record.date,
      record.checkIn || 'N/A',
      record.checkOut || 'N/A',
      record.workingHours || 0,
      record.overtimeHours || 0,
      record.toilHoursEarned || 0,
      record.status,
      record.isWeekendWork ? 'Yes' : 'No',
      record.notes || ''
    ].join(',')).join('\n');

    const header = 'Name,Department,Date,Check In,Check Out,Working Hours,Overtime Hours,TOIL Earned,Status,Weekend Work,Notes\n';
    const csv = header + csvContent;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Not Marked</Badge>;
    
    const statusConfig = {
      present: { color: 'bg-green-500', text: 'Present' },
      absent: { color: 'bg-red-500', text: 'Absent' },
      late: { color: 'bg-yellow-500', text: 'Late' },
      toil_work: { color: 'bg-blue-500', text: 'TOIL Work' },
      holiday: { color: 'bg-purple-500', text: 'Holiday' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { color: 'bg-gray-500', text: status };

    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
  };

  return (
    <div className="space-y-6">
      {/* Personal Check-in/out Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            {currentLocation}
          </div>

          {!isCheckedIn && !todayAttendance?.checkIn ? (
            <Button 
              onClick={handleCheckIn} 
              disabled={checkInMutation.isPending}
              className="w-full"
            >
              {checkInMutation.isPending ? "Checking In..." : "Check In"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Checked in at:</span>
                <span className="font-medium">
                  {todayAttendance?.checkIn ? 
                    format(new Date(todayAttendance.checkIn), 'HH:mm') : 
                    'Just now'}
                </span>
              </div>
              
              {!todayAttendance?.checkOut && (
                <Button 
                  onClick={() => todayAttendance?.id && handleCheckOut(todayAttendance.id)}
                  disabled={checkOutMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">All Employees</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          </TabsList>

          {/* All Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Attendance
                </CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          refetchEmployeesAttendance();
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeesAttendance?.map((employee) => (
                    <div key={employee.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{employee.fullName}</div>
                        <div className="text-sm text-gray-500">
                          {employee.department} • {employee.position}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {employee.checkIn && (
                          <div className="text-center">
                            <div className="text-sm font-medium">In: {format(new Date(employee.checkIn), 'HH:mm')}</div>
                            {employee.checkOut && (
                              <div className="text-sm text-gray-500">Out: {format(new Date(employee.checkOut), 'HH:mm')}</div>
                            )}
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className="text-sm">{employee.workingHours?.toFixed(1) || '0.0'}h</div>
                          {employee.toilHoursEarned && employee.toilHoursEarned > 0 && (
                            <div className="text-xs text-blue-600">+{employee.toilHoursEarned.toFixed(1)}h TOIL</div>
                          )}
                        </div>
                        
                        {getStatusBadge(employee.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Attendance Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button onClick={() => refetchReport()} className="w-full">
                  Generate Report
                </Button>
                
                {attendanceReport && attendanceReport.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {attendanceReport.length} records found
                      </span>
                      <Button onClick={handleExportReport} size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {attendanceReport.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div>
                              <div className="font-medium">{record.fullName}</div>
                              <div className="text-gray-500">{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                            </div>
                            <div className="text-right">
                              <div>{record.workingHours}h worked</div>
                              {record.toilHoursEarned > 0 && (
                                <div className="text-blue-600 text-xs">+{record.toilHoursEarned}h TOIL</div>
                              )}
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Operations Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Import Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  fileType="document"
                  accept=".csv,.xlsx"
                  onUploadSuccess={(file) => {
                    toast({
                      title: "Import Successful",
                      description: "Attendance data has been imported successfully"
                    });
                  }}
                />
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">CSV Format Requirements:</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Columns: Employee ID, Date, Check In Time, Check Out Time, Status, Notes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}