import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Search, Plus, Edit, Trash2, Eye, Mail, Phone, MapPin, Calendar, Shield, Building2, CheckCircle, Clock, AlertCircle, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";
import { format } from "date-fns";

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<UserType | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all employees
  const { data: employees = [], isLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr'),
  });

  // Fetch employee attendance history
  const { data: attendanceHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/history', selectedEmployee?.id],
    enabled: !!selectedEmployee,
  });

  // Fetch employee leave requests
  const { data: leaveRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/timeoffs/user', selectedEmployee?.id],
    enabled: !!selectedEmployee,
  });

  // Fetch employee assignments
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['/api/assignments'],
    enabled: !!selectedEmployee,
  });

  // Filter assignments for selected employee
  const employeeAssignments = assignments.filter((assignment: any) => 
    assignment.assignedTo === selectedEmployee?.id
  );

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp: UserType) =>
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const openProfileDialog = (employee: UserType) => {
    setSelectedEmployee(employee);
    setIsProfileDialogOpen(true);
  };

  const getAssignmentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAssignmentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  // Check if user has permission to view employees
  if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only administrators and HR managers can access the employee directory.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Directory</h1>
          <p className="text-muted-foreground mt-2">
            Manage and view detailed information about all employees
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-72"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((employee: UserType) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.profilePicture || undefined} />
                      <AvatarFallback>
                        {employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{employee.fullName}</h3>
                      <p className="text-xs text-muted-foreground truncate">@{employee.username}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getRoleColor(employee.role)}`}>
                    {employee.role}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {employee.department && (
                    <div className="flex items-center text-muted-foreground">
                      <Building2 className="h-3 w-3 mr-2" />
                      <span className="truncate">{employee.department}</span>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center text-muted-foreground">
                      <User className="h-3 w-3 mr-2" />
                      <span className="truncate">{employee.position}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-3 w-3 mr-2" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center space-x-1">
                    <div className={`h-2 w-2 rounded-full ${employee.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-muted-foreground">
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openProfileDialog(employee)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredEmployees.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try adjusting your search terms.' : 'No employees have been added yet.'}
          </p>
        </div>
      )}

      {/* Employee Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedEmployee?.profilePicture || undefined} />
                <AvatarFallback>
                  {selectedEmployee?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{selectedEmployee?.fullName}</h2>
                <p className="text-sm text-muted-foreground">@{selectedEmployee?.username}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs defaultValue="profile" className="mt-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="leave">Leave</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="text-sm">{selectedEmployee.fullName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{selectedEmployee.email}</p>
                      </div>
                      {selectedEmployee.phone && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-sm">{selectedEmployee.phone}</p>
                        </div>
                      )}
                      {selectedEmployee.address && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Address</label>
                          <p className="text-sm">{selectedEmployee.address}</p>
                        </div>
                      )}
                      {selectedEmployee.dateOfBirth && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                          <p className="text-sm">{format(new Date(selectedEmployee.dateOfBirth), 'PPP')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Work Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Role</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleColor(selectedEmployee.role)}>
                            {selectedEmployee.role}
                          </Badge>
                        </div>
                      </div>
                      {selectedEmployee.department && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Department</label>
                          <p className="text-sm">{selectedEmployee.department}</p>
                        </div>
                      )}
                      {selectedEmployee.position && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Position</label>
                          <p className="text-sm">{selectedEmployee.position}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`h-2 w-2 rounded-full ${selectedEmployee.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm">{selectedEmployee.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Joined</label>
                        <p className="text-sm">{format(new Date(selectedEmployee.createdAt), 'PPP')}</p>
                      </div>
                    </CardContent>
                  </Card>


                </div>
              </TabsContent>

              <TabsContent value="attendance" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>Recent attendance records for this employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceHistory && attendanceHistory.length > 0 ? (
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {attendanceHistory.map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{format(new Date(record.date), 'PPP')}</p>
                                <p className="text-sm text-muted-foreground">{record.status}</p>
                              </div>
                              <div className="text-right">
                                {record.checkIn && (
                                  <p className="text-sm">In: {format(new Date(record.checkIn), 'HH:mm')}</p>
                                )}
                                {record.checkOut && (
                                  <p className="text-sm">Out: {format(new Date(record.checkOut), 'HH:mm')}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No attendance records found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leave" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Requests</CardTitle>
                    <CardDescription>Time off requests and approvals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaveRequests && leaveRequests.length > 0 ? (
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {leaveRequests.map((request: any) => (
                            <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{request.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(request.startDate), 'PPP')} - {format(new Date(request.endDate), 'PPP')}
                                </p>
                                {request.reason && (
                                  <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                                )}
                              </div>
                              <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {request.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No leave requests found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assignments" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignments</CardTitle>
                    <CardDescription>Tasks and projects assigned to this employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {employeeAssignments && employeeAssignments.length > 0 ? (
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {employeeAssignments.map((assignment: any) => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-start space-x-3">
                                {getAssignmentStatusIcon(assignment.status)}
                                <div>
                                  <p className="font-medium">{assignment.title}</p>
                                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Priority: {assignment.priority} • Category: {assignment.category}
                                  </p>
                                  {assignment.dueDate && (
                                    <p className="text-sm text-muted-foreground">
                                      Due: {format(new Date(assignment.dueDate), 'PPP')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge variant={getAssignmentStatusBadge(assignment.status)}>
                                {assignment.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No assignments found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}