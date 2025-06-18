import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarCheck, Plus, Clock, User, MapPin, Edit, Trash2, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { Shift, User as UserType } from "@shared/schema";
import { format } from "date-fns";

// Utility functions
const formatDateTime = (dateTime: any) => {
  try {
    const date = new Date(dateTime);
    return format(date, 'MMM d, yyyy - h:mm a');
  } catch {
    return 'Invalid date';
  }
};

const formatDateTimeLocal = (dateTime: any) => {
  try {
    const date = new Date(dateTime);
    return format(date, 'MMM d, h:mm a');
  } catch {
    return 'Invalid date';
  }
};

const calculateShiftDuration = (startTime: any, endTime: any) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  } catch {
    return 'Invalid duration';
  }
};

export default function ShiftScheduling() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all employees for shift assignment
  const { data: employees } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin' || user?.role === 'hr',
  });

  // Get shifts data
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
    enabled: !!user,
  });

  // Get user's own shifts if not admin/hr
  const { data: userShifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/shifts/user', user?.id],
    enabled: !!user && user.role !== 'admin' && user.role !== 'hr',
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/shifts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shift",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (shift: Shift) => {
    navigate(`/add-shift?id=${shift.id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(id);
    }
  };

  const canManageShifts = user?.role === 'admin' || user?.role === 'hr';
  const displayShifts = canManageShifts ? shifts : userShifts;

  // Filter shifts
  const filteredShifts = displayShifts.filter(shift => {
    const employeeMatch = selectedEmployee === "all" || shift.userId.toString() === selectedEmployee;
    const statusMatch = statusFilter === "all" || shift.status === statusFilter;
    return employeeMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Shift Scheduling</h1>
          <p className="text-muted-foreground mt-2">
            {canManageShifts 
              ? "Create and manage employee work schedules and assignments."
              : "View your assigned work schedules and shift details."
            }
          </p>
        </div>
        
        {canManageShifts && (
          <Button 
            className="primary-bg hover:bg-primary-600"
            onClick={() => navigate('/add-shift')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Shift
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canManageShifts && (
              <div>
                <label className="block text-sm font-medium mb-2">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees?.map((employee: UserType) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.fullName || employee.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarCheck className="h-5 w-5" />
            <span>
              {canManageShifts ? "All Shifts" : "My Shifts"} 
              {filteredShifts.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredShifts.length} {filteredShifts.length === 1 ? 'shift' : 'shifts'})
                </span>
              )}
            </span>
          </CardTitle>
          <CardDescription>
            {canManageShifts 
              ? "Manage employee work schedules and assignments"
              : "Your assigned shifts and schedule details"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading shifts...</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No shifts found</h3>
              <p className="text-muted-foreground">
                {canManageShifts 
                  ? "Create your first shift to get started with scheduling."
                  : "No shifts have been assigned to you yet."
                }
              </p>
              {canManageShifts && (
                <Button 
                  className="mt-4 primary-bg hover:bg-primary-600"
                  onClick={() => navigate('/add-shift')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Shift
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShifts.map((shift) => {
                const employee = employees?.find(emp => emp.id === shift.userId);
                
                return (
                  <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {canManageShifts && employee && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {employee.fullName?.charAt(0) || employee.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">{shift.title}</h3>
                            {canManageShifts && employee && (
                              <p className="text-sm text-muted-foreground">
                                {employee.fullName || employee.username} • {employee.department || 'No Department'}
                              </p>
                            )}
                          </div>
                          <div className="ml-auto">
                            {getStatusBadge(shift.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Schedule</p>
                            <p>{formatDateTimeLocal(shift.startTime)}</p>
                            <p>{formatDateTimeLocal(shift.endTime)}</p>
                            <p className="font-medium text-blue-600">
                              {calculateShiftDuration(shift.startTime, shift.endTime)}
                            </p>
                          </div>
                          {shift.location && (
                            <div>
                              <p className="font-medium text-foreground flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>Location</span>
                              </p>
                              <p>{shift.location}</p>
                            </div>
                          )}
                          {shift.notes && (
                            <div>
                              <p className="font-medium text-foreground">Notes</p>
                              <p className="truncate">{shift.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {canManageShifts && (
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(shift.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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