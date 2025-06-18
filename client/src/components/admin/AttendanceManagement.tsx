import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Settings, CheckCircle, XCircle, Clock, AlertTriangle, 
  MapPin, User, Calendar, Activity, Edit3 
} from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  workingHours: number;
  overtimeHours: number;
  status: string;
  isAutoCheckout: boolean;
  checkInNotes: string | null;
  checkOutNotes: string | null;
  adminNotes: string | null;
  date: string;
  user?: {
    id: number;
    fullName: string;
    department: string;
    position: string;
  };
}

export default function AttendanceManagement() {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState("all");
  
  const queryClient = useQueryClient();

  // Get all employees attendance for selected date
  const { data: attendanceRecords, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/admin/employees-attendance", dateFilter],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update attendance status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; adminNotes?: string }) => {
      const response = await fetch(`/api/attendance/${data.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data.status,
          adminNotes: data.adminNotes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update attendance status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Attendance status has been updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees-attendance"] });
      setSelectedRecord(null);
      setNewStatus("");
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update attendance status",
        variant: "destructive"
      });
    }
  });

  const handleStatusUpdate = () => {
    if (!selectedRecord || !newStatus) return;
    
    updateStatusMutation.mutate({
      id: selectedRecord.id,
      status: newStatus,
      adminNotes: adminNotes || undefined
    });
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.isAutoCheckout) {
      return <Badge variant="outline" className="text-orange-600">Auto Check-out</Badge>;
    }
    
    switch (record.status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>;
      case "incomplete":
        return <Badge variant="outline" className="text-red-600">Incomplete</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-500">Late</Badge>;
      case "remote":
        return <Badge className="bg-blue-500">Remote</Badge>;
      default:
        return <Badge variant="outline">{record.status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "incomplete":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "late":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Not recorded";
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const filteredRecords = attendanceRecords?.filter(record => {
    if (statusFilter === "all") return true;
    return record.status === statusFilter;
  }) || [];

  const statusCounts = attendanceRecords?.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalEmployees = attendanceRecords?.length || 0;
  const presentCount = statusCounts.present || 0;
  const absentCount = statusCounts.absent || 0;
  const incompleteCount = statusCounts.incomplete || 0;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{incompleteCount}</p>
                <p className="text-xs text-muted-foreground">Incomplete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Attendance Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="date-filter">Date</Label>
              <input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="status-filter">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Employee Attendance - {format(new Date(dateFilter), 'MMMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading attendance records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found for the selected criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{record.user?.fullName || `User ${record.userId}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.user?.department} • {record.user?.position}
                        </p>
                      </div>
                      {getStatusBadge(record)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <p>Check-in: {formatTime(record.checkIn)}</p>
                        {record.checkInLocation && (
                          <p className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.checkInLocation}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p>Check-out: {formatTime(record.checkOut)}</p>
                        {record.checkOutLocation && (
                          <p className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.checkOutLocation}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium">
                          Working Hours: {record.workingHours.toFixed(2)}h
                        </p>
                        {record.overtimeHours > 0 && (
                          <p className="text-orange-600 text-xs">
                            Overtime: {record.overtimeHours.toFixed(2)}h
                          </p>
                        )}
                      </div>
                    </div>

                    {record.isAutoCheckout && (
                      <p className="text-orange-600 text-xs mt-1">
                        Automatically checked out at midnight
                      </p>
                    )}

                    {record.adminNotes && (
                      <p className="text-red-600 text-xs mt-1 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        Admin Note: {record.adminNotes}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setNewStatus(record.status);
                            setAdminNotes(record.adminNotes || "");
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Attendance Status</DialogTitle>
                        </DialogHeader>
                        
                        {selectedRecord && (
                          <div className="space-y-4">
                            <div>
                              <p className="font-medium">{selectedRecord.user?.fullName || `User ${selectedRecord.userId}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(selectedRecord.date), 'MMMM dd, yyyy')}
                              </p>
                            </div>
                            
                            <div>
                              <Label htmlFor="new-status">New Status</Label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">Present (P)</SelectItem>
                                  <SelectItem value="absent">Absent (A)</SelectItem>
                                  <SelectItem value="incomplete">Incomplete</SelectItem>
                                  <SelectItem value="late">Late</SelectItem>
                                  <SelectItem value="remote">Remote</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                              <Textarea
                                id="admin-notes"
                                placeholder="Add administrative notes..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                className="min-h-[80px]"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleStatusUpdate}
                                disabled={!newStatus || updateStatusMutation.isPending}
                                className="flex-1"
                              >
                                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => setSelectedRecord(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}