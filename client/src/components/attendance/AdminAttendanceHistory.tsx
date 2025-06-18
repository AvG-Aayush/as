import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Calendar, Clock, MapPin, User, Download, FileText, FileSpreadsheet, 
  Filter, Search, Edit3, Save, X, RefreshCw, Eye, CheckCircle, 
  XCircle, AlertCircle, Settings, Users, Building
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import type { Attendance, User as UserType } from "@shared/schema";

interface AttendanceRecord extends Attendance {
  user: UserType;
}

interface EditingRecord {
  id: number;
  checkIn?: string;
  checkOut?: string;
  status: string;
  adminNotes?: string;
  workingHours?: number;
  overtimeHours?: number;
  isLocationValid?: boolean;
  requiresApproval?: boolean;
}

export default function AdminAttendanceHistory() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has access to this section
  const hasAccess = ['admin', 'hr'].includes(user?.role || '');
  const canEdit = user?.role === 'admin';

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
              <p className="text-muted-foreground">Only HR managers and administrators can access attendance history.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get all users for filtering
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Get attendance records with auto-refresh
  const { data: attendanceRecords, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/employees-attendance', { 
      userId: selectedUserId, 
      startDate, 
      endDate, 
      status: statusFilter,
      department: departmentFilter 
    }],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Update attendance record mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<EditingRecord> }) => {
      const response = await fetch(`/api/attendance/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error('Failed to update record');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      setEditingRecord(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees-attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance record",
        variant: "destructive",
      });
    },
  });

  // Bulk operations mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: number[]; updates: Partial<EditingRecord> }) => {
      const response = await fetch('/api/attendance/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to bulk update records');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedRecords.length} records updated successfully`,
      });
      setSelectedRecords([]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees-attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update records",
        variant: "destructive",
      });
    },
  });

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refetch]);

  // Filter records
  const filteredRecords = Array.isArray(attendanceRecords) ? attendanceRecords.filter((record: AttendanceRecord) => {
    const matchesSearch = searchTerm === "" || 
      record.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.user?.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = selectedUserId === "all" || record.userId?.toString() === selectedUserId;
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || record.user?.department === departmentFilter;
    
    return matchesSearch && matchesUser && matchesStatus && matchesDepartment;
  }) : [];

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ["Date", "Employee", "Department", "Check In", "Check Out", "Working Hours", "Overtime", "Status", "Location", "Notes"].join(","),
      ...filteredRecords.map((record: AttendanceRecord) => [
        format(new Date(record.date), 'yyyy-MM-dd'),
        record.user.fullName,
        record.user.department || "N/A",
        record.checkIn ? format(new Date(record.checkIn), 'HH:mm:ss') : "N/A",
        record.checkOut ? format(new Date(record.checkOut), 'HH:mm:ss') : "N/A",
        record.workingHours?.toFixed(2) || "0",
        record.overtimeHours?.toFixed(2) || "0",
        record.status,
        record.checkInLocation || "N/A",
        record.adminNotes || record.checkInNotes || "N/A"
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance History Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .status-present { color: green; }
            .status-absent { color: red; }
            .status-late { color: orange; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance History Report</h1>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
            <p>Total Records: ${filteredRecords.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map((record: AttendanceRecord) => `
                <tr>
                  <td>${format(new Date(record.date), 'yyyy-MM-dd')}</td>
                  <td>${record.user.fullName}</td>
                  <td>${record.user.department || 'N/A'}</td>
                  <td>${record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : 'N/A'}</td>
                  <td>${record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : 'N/A'}</td>
                  <td>${record.workingHours?.toFixed(2) || '0'}h</td>
                  <td class="status-${record.status}">${record.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord({
      id: record.id,
      checkIn: record.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : "",
      checkOut: record.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : "",
      status: record.status,
      adminNotes: record.adminNotes || "",
      workingHours: record.workingHours || 0,
      overtimeHours: record.overtimeHours || 0,
      isLocationValid: record.isLocationValid || false,
      requiresApproval: record.requiresApproval || false,
    });
  };

  const handleSave = () => {
    if (!editingRecord) return;
    
    const updates: any = {
      status: editingRecord.status,
      adminNotes: editingRecord.adminNotes,
      workingHours: editingRecord.workingHours,
      overtimeHours: editingRecord.overtimeHours,
      isLocationValid: editingRecord.isLocationValid,
      requiresApproval: editingRecord.requiresApproval,
    };

    if (editingRecord.checkIn) {
      updates.checkIn = new Date(editingRecord.checkIn).toISOString();
    }
    if (editingRecord.checkOut) {
      updates.checkOut = new Date(editingRecord.checkOut).toISOString();
    }

    updateAttendanceMutation.mutate({
      id: editingRecord.id,
      updates
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "bg-green-100 text-green-800",
      absent: "bg-red-100 text-red-800",
      late: "bg-yellow-100 text-yellow-800",
      remote: "bg-blue-100 text-blue-800",
      break: "bg-purple-100 text-purple-800",
      holiday: "bg-gray-100 text-gray-800",
      incomplete: "bg-orange-100 text-orange-800"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const uniqueDepartments = Array.isArray(users) ? 
    users.map((u: UserType) => u.department).filter(Boolean).filter((dept, index, arr) => arr.indexOf(dept) === index) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive attendance tracking and management system
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            disabled={!filteredRecords?.length}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            onClick={exportToPDF}
            variant="outline"
            disabled={!filteredRecords?.length}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Auto-refresh controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Real-time Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <Label htmlFor="auto-refresh">Auto-refresh</Label>
            </div>
            
            {autoRefresh && (
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                variant="outline"
                size="sm"
              >
                {viewMode === "table" ? "Card View" : "Table View"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {Array.isArray(users) && users.map((user: UserType) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map((dept: string | null) => dept && (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} records
          {selectedRecords.length > 0 && (
            <span className="ml-2 font-medium">
              ({selectedRecords.length} selected)
            </span>
          )}
        </div>
        
        {selectedRecords.length > 0 && canEdit && (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Bulk approve
                bulkUpdateMutation.mutate({
                  ids: selectedRecords,
                  updates: { requiresApproval: false }
                });
              }}
            >
              Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRecords([])}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : viewMode === "table" ? (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEdit && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedRecords.length === filteredRecords.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords(filteredRecords.map(r => r.id));
                            } else {
                              setSelectedRecords([]);
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: AttendanceRecord) => (
                    <TableRow key={record.id}>
                      {canEdit && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecords([...selectedRecords, record.id]);
                              } else {
                                setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                              }
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{record.user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>{record.user.department || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.checkIn ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span>{format(new Date(record.checkIn), 'HH:mm')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-red-600" />
                            <span>{format(new Date(record.checkOut), 'HH:mm')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{record.workingHours?.toFixed(2) || '0'}h</span>
                          {(record.overtimeHours || 0) > 0 && (
                            <div className="text-xs text-orange-600">
                              +{(record.overtimeHours || 0).toFixed(2)}h OT
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.checkInLocation ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{record.checkInLocation}</span>
                            {!record.isLocationValid && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Attendance Details</DialogTitle>
                                <DialogDescription>
                                  Complete information for {record.user.fullName} on {format(new Date(record.date), 'PPP')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4 py-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Basic Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><strong>Employee:</strong> {record.user.fullName}</p>
                                    <p><strong>Department:</strong> {record.user.department || 'N/A'}</p>
                                    <p><strong>Status:</strong> {getStatusBadge(record.status)}</p>
                                    <p><strong>Working Hours:</strong> {record.workingHours?.toFixed(2) || '0'}h</p>
                                    <p><strong>Overtime:</strong> {record.overtimeHours?.toFixed(2) || '0'}h</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Location & Device</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><strong>Check-in Location:</strong> {record.checkInLocation || 'N/A'}</p>
                                    <p><strong>Check-out Location:</strong> {record.checkOutLocation || 'N/A'}</p>
                                    <p><strong>IP Address:</strong> {record.ipAddress || 'N/A'}</p>
                                    <p><strong>Device:</strong> {record.deviceInfo || 'N/A'}</p>
                                  </div>
                                </div>
                                {(record.checkInNotes || record.checkOutNotes || record.adminNotes) && (
                                  <div className="col-span-2">
                                    <h4 className="font-semibold mb-2">Notes</h4>
                                    <div className="space-y-2 text-sm">
                                      {record.checkInNotes && (
                                        <p><strong>Check-in Notes:</strong> {record.checkInNotes}</p>
                                      )}
                                      {record.checkOutNotes && (
                                        <p><strong>Check-out Notes:</strong> {record.checkOutNotes}</p>
                                      )}
                                      {record.adminNotes && (
                                        <p><strong>Admin Notes:</strong> {record.adminNotes}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            // Card view
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecords.map((record: AttendanceRecord) => (
                  <Card key={record.id} className="relative">
                    {canEdit && (
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords([...selectedRecords, record.id]);
                            } else {
                              setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                            }
                          }}
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{record.user.fullName}</CardTitle>
                        {getStatusBadge(record.status)}
                      </div>
                      <CardDescription>
                        {format(new Date(record.date), 'PPP')} • {record.user.department || 'No Department'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-600">Check In</p>
                            <p className="text-sm">
                              {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-600">Check Out</p>
                            <p className="text-sm">
                              {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium">Working Hours</p>
                          <p className="text-sm">
                            {record.workingHours?.toFixed(2) || '0'}h
                            {(record.overtimeHours || 0) > 0 && (
                              <span className="text-orange-600 ml-2">
                                (+{(record.overtimeHours || 0).toFixed(2)}h OT)
                              </span>
                            )}
                          </p>
                        </div>
                        
                        {record.checkInLocation && (
                          <div>
                            <p className="text-sm font-medium">Location</p>
                            <p className="text-sm flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {record.checkInLocation}
                              {!record.isLocationValid && (
                                <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                              )}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Attendance Details</DialogTitle>
                              </DialogHeader>
                              {/* Same detail content as table view */}
                            </DialogContent>
                          </Dialog>
                          
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
              <DialogDescription>
                Make changes to the attendance record. All changes will be logged.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="edit-checkin">Check In</Label>
                <Input
                  id="edit-checkin"
                  type="datetime-local"
                  value={editingRecord.checkIn}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    checkIn: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-checkout">Check Out</Label>
                <Input
                  id="edit-checkout"
                  type="datetime-local"
                  value={editingRecord.checkOut}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    checkOut: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(value) => setEditingRecord({
                    ...editingRecord,
                    status: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-working-hours">Working Hours</Label>
                <Input
                  id="edit-working-hours"
                  type="number"
                  step="0.1"
                  value={editingRecord.workingHours}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    workingHours: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-overtime">Overtime Hours</Label>
                <Input
                  id="edit-overtime"
                  type="number"
                  step="0.1"
                  value={editingRecord.overtimeHours}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    overtimeHours: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-location-valid"
                  checked={editingRecord.isLocationValid}
                  onCheckedChange={(checked) => setEditingRecord({
                    ...editingRecord,
                    isLocationValid: checked
                  })}
                />
                <Label htmlFor="edit-location-valid">Location Valid</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-requires-approval"
                  checked={editingRecord.requiresApproval}
                  onCheckedChange={(checked) => setEditingRecord({
                    ...editingRecord,
                    requiresApproval: checked
                  })}
                />
                <Label htmlFor="edit-requires-approval">Requires Approval</Label>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-admin-notes">Admin Notes</Label>
                <Textarea
                  id="edit-admin-notes"
                  value={editingRecord.adminNotes}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    adminNotes: e.target.value
                  })}
                  placeholder="Add administrative notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingRecord(null)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateAttendanceMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateAttendanceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}