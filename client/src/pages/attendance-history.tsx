import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User, Download, FileText, FileSpreadsheet, Filter, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Attendance, User as UserType } from "@shared/schema";

export default function AttendanceHistory() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeNameFilter, setEmployeeNameFilter] = useState("all");
  const { user } = useAuth();

  const canViewAll = ['admin', 'hr', 'manager'].includes(user?.role || '');

  // Get users for dropdown (only if user can view all)
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: canViewAll,
  });

  // Get attendance history with employee data for admin users
  const { data: attendance, isLoading } = useQuery({
    queryKey: canViewAll 
      ? ['/api/admin/employees-attendance', startDate, endDate, selectedUserId]
      : [`/api/attendance/history/${user?.id}`, startDate, endDate],
    queryFn: async () => {
      if (canViewAll) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (selectedUserId && selectedUserId !== 'all') params.append('userId', selectedUserId);
        
        const response = await fetch(`/api/admin/employees-attendance?${params}`);
        if (!response.ok) throw new Error('Failed to fetch attendance data');
        return response.json();
      } else {
        return fetch(`/api/attendance/history/${user?.id}`).then(res => res.json());
      }
    },
    enabled: !!user?.id,
  });

  const exportData = async (format: 'pdf' | 'excel') => {
    try {
      if (!filteredAttendance || !user) return;
      
      if (format === 'excel') {
        exportToExcel(filteredAttendance, user);
      } else {
        exportToPDF(filteredAttendance, user);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const exportToExcel = (data: Attendance[], userData: UserType) => {
    const headers = ['Date', 'Check In', 'Check Out', 'Hours Worked', 'Location', 'Status'];
    const rows = data.map(record => {
      try {
        const recordDate = record.date ? new Date(record.date) : new Date();
        const checkInDate = record.checkIn ? new Date(record.checkIn) : null;
        const checkOutDate = record.checkOut ? new Date(record.checkOut) : null;
        
        return [
          isNaN(recordDate.getTime()) ? '-' : format(recordDate, 'yyyy-MM-dd'),
          checkInDate && !isNaN(checkInDate.getTime()) ? format(checkInDate, 'HH:mm') : '-',
          checkOutDate && !isNaN(checkOutDate.getTime()) ? format(checkOutDate, 'HH:mm') : '-',
          checkInDate && checkOutDate && !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())
            ? ((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)).toFixed(2)
            : '-',
          record.checkInLocation || '-',
          record.status || 'unknown'
        ];
      } catch (error) {
        console.error('Error processing record:', record, error);
        return ['-', '-', '-', '-', '-', 'error'];
      }
    });

    const csvContent = [
      [`Attendance Report - ${userData?.fullName}`],
      [`Period: ${startDate || 'All time'} to ${endDate || 'Present'}`],
      [''],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${userData?.fullName}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = (data: Attendance[], userData: UserType) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <p><strong>Employee:</strong> ${userData?.fullName}</p>
            <p><strong>Department:</strong> ${userData?.department || 'N/A'}</p>
            <p><strong>Period:</strong> ${startDate || 'All time'} to ${endDate || 'Present'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours Worked</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(record => {
                try {
                  const recordDate = record.date ? new Date(record.date) : new Date();
                  const checkInDate = record.checkIn ? new Date(record.checkIn) : null;
                  const checkOutDate = record.checkOut ? new Date(record.checkOut) : null;
                  
                  return `
                    <tr>
                      <td>${isNaN(recordDate.getTime()) ? '-' : format(recordDate, 'yyyy-MM-dd')}</td>
                      <td>${checkInDate && !isNaN(checkInDate.getTime()) ? format(checkInDate, 'HH:mm') : '-'}</td>
                      <td>${checkOutDate && !isNaN(checkOutDate.getTime()) ? format(checkOutDate, 'HH:mm') : '-'}</td>
                      <td>${checkInDate && checkOutDate && !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())
                        ? ((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)).toFixed(2) + ' hours'
                        : '-'}</td>
                      <td>${record.checkInLocation || '-'}</td>
                      <td>${record.status || 'unknown'}</td>
                    </tr>
                  `;
                } catch (error) {
                  console.error('Error processing record for PDF:', record, error);
                  return '<tr><td colspan="6">Error processing record</td></tr>';
                }
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredAttendance = Array.isArray(attendance) ? attendance.filter((record: any) => {
    // Handle different data structures - admin view includes user info, employee view doesn't
    const employeeName = record.user?.fullName || record.fullName || user?.fullName || 'Unknown Employee';
    
    const matchesSearch = searchTerm === "" || 
      (employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (record.status || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesEmployeeFilter = employeeNameFilter === "" || employeeNameFilter === "all" ||
      employeeName === employeeNameFilter;
    
    return matchesSearch && matchesEmployeeFilter;
  }) : [];

  const getStatusBadge = (status: string) => {
    const statusColors = {
      present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      break: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const getLocationDisplay = (record: Attendance) => {
    // First priority: Show reverse geocoded address from leaflet
    if (record.checkInAddress && record.checkInAddress !== 'Manual entry - GPS unavailable' && record.checkInAddress !== 'Address not found') {
      // Clean up address formatting for better display
      const address = record.checkInAddress.replace(/,\s*$/, ''); // Remove trailing comma
      return address;
    }
    
    // Second priority: Check if we have a work location name
    if ((record as any).workLocationName) {
      return `🏢 ${(record as any).workLocationName}`;
    }
    
    // Third priority: Show coordinate-based location with accuracy info
    if (record.checkInLocation) {
      // For manual entries
      if (record.checkInLocation.includes('Manual entry')) {
        return '📝 Manual Check-in';
      }
      
      // For GPS locations with coordinates
      if (record.checkInLatitude && record.checkInLongitude) {
        const accuracy = (record as any).gpsAccuracy || 0;
        if (accuracy <= 10) {
          return `📍 GPS Location (${accuracy}m accuracy)`;
        } else if (accuracy <= 50) {
          return `📍 GPS Location (${accuracy}m accuracy)`;
        } else {
          return `📍 GPS Location (Low accuracy: ${accuracy}m)`;
        }
      }
      
      // Fallback to location string
      return record.checkInLocation;
    }
    
    // Show coordinates if available but no address
    if (record.checkInLatitude && record.checkInLongitude) {
      return `📍 ${record.checkInLatitude.toFixed(6)}, ${record.checkInLongitude.toFixed(6)}`;
    }
    
    return 'Location not recorded';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Attendance History</h1>
          <p className="text-muted-foreground mt-2">
            {canViewAll 
              ? "View and export attendance records for any employee"
              : "View and export your attendance records"
            }
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => exportData('excel')}
            variant="outline"
            disabled={!filteredAttendance?.length}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            onClick={() => exportData('pdf')}
            variant="outline"
            disabled={!filteredAttendance?.length}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {canViewAll && (
              <div>
                <label className="text-sm font-medium mb-2 block">Employee</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {Array.isArray(users) ? users.map((user: UserType) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Name</label>
              <Select value={employeeNameFilter} onValueChange={setEmployeeNameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {Array.isArray(users) ? users.map((user: UserType) => (
                    <SelectItem key={user.id} value={user.fullName}>
                      {user.fullName}
                    </SelectItem>
                  )) : null}
                  {/* Also add employees from attendance records if not admin */}
                  {!canViewAll && Array.isArray(attendance) && 
                    attendance
                      .map((record: any) => record.user?.fullName || record.fullName)
                      .filter((name, index, arr) => name && arr.indexOf(name) === index)
                      .map((name: string) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedUserId("all");
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                  setEmployeeNameFilter("all");
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Attendance Records</span>
          </CardTitle>
          <CardDescription>
            Detailed attendance tracking with check-in/check-out times
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAttendance?.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAttendance?.map((record: Attendance) => {
                const checkInDate = record.checkIn ? new Date(record.checkIn) : null;
                const checkOutDate = record.checkOut ? new Date(record.checkOut) : null;
                
                const hoursWorked = checkInDate && checkOutDate && 
                  !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())
                    ? ((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)).toFixed(2)
                    : null;

                return (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 primary-bg-50 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">
                              {(() => {
                                // Try multiple date sources - date field, checkIn date, or current date
                                const dateToUse = record.date || record.checkIn || record.createdAt;
                                if (dateToUse && !isNaN(new Date(dateToUse).getTime())) {
                                  return format(new Date(dateToUse), 'EEEE, MMMM d, yyyy');
                                }
                                return format(new Date(), 'EEEE, MMMM d, yyyy');
                              })()}
                            </h3>
                            {getStatusBadge(record.status)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p className="font-medium text-foreground flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Check In</span>
                              </p>
                              <p>{checkInDate && !isNaN(checkInDate.getTime()) ? format(checkInDate, 'h:mm a') : 'Not checked in'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Check Out</span>
                              </p>
                              <p>{checkOutDate && !isNaN(checkOutDate.getTime()) ? format(checkOutDate, 'h:mm a') : 'Not checked out'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Hours Worked</p>
                              <p>{hoursWorked ? `${hoursWorked} hours` : 'In progress'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>Location</span>
                              </p>
                              <p>{getLocationDisplay(record)}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>Employee</span>
                              </p>
                              <p>{(record as any).user?.fullName || (record as any).fullName || user?.fullName || 'Unknown Employee'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}