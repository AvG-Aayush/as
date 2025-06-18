import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Filter, Timer, TrendingUp, Target, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { insertLeaveRequestSchema, insertTimeoffSchema } from "@shared/schema";
import type { LeaveRequest, ToilBalance, Timeoff } from "@shared/schema";
import { z } from "zod";

interface Assignment {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedTo: number;
  assignedBy: number;
  createdAt: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  department: string | null;
  createdAt: string;
  createdBy: number;
  createdByName?: string;
}

const leaveRequestSchema = insertLeaveRequestSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

const toilRequestSchema = insertTimeoffSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  toilHoursUsed: z.number().min(0.5, "Minimum 0.5 hours required").max(8, "Maximum 8 hours per day"),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
type ToilRequestFormData = z.infer<typeof toilRequestSchema>;

export default function LeaveManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isToilDialogOpen, setIsToilDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get assignments and announcements for Updates section
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/assignments'],
    enabled: !!user,
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['/api/announcements'],
    enabled: !!user,
  });

  // Filter assignments for current user
  const userAssignments = assignments.filter((assignment: Assignment) => 
    assignment.assignedTo === user?.id
  );

  // Complete assignment mutation
  const completeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest('PATCH', `/api/assignments/${assignmentId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({
        title: "Assignment completed",
        description: "Assignment has been marked as completed successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete assignment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCompleteAssignment = (assignmentId: number) => {
    completeAssignmentMutation.mutate(assignmentId);
  };

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';  
      case 'medium': return 'default';
      case 'low': return 'secondary';
      case 'urgent': return 'destructive';
      case 'normal': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'overdue': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAssignmentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: "",
      startDate: "",
      endDate: "",
      reason: "",
      status: "pending",
    },
  });

  const toilForm = useForm<ToilRequestFormData>({
    resolver: zodResolver(toilRequestSchema),
    defaultValues: {
      type: "toil",
      startDate: "",
      endDate: "",
      days: 0,
      reason: undefined,
      status: "pending",
      isToilRequest: true,
      toilHoursUsed: 0,
    },
  });

  // Get user's leave requests
  const { data: userLeaveRequests = [], isLoading: userRequestsLoading } = useQuery({
    queryKey: ['/api/leave-requests/user', user?.id],
    enabled: !!user,
  });

  // Get pending leave requests (for HR/Admin)
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/leave-requests/pending'],
    enabled: user?.role === 'admin' || user?.role === 'hr',
  });

  // Get user's timeoff requests (TOIL included)
  const { data: userTimeoffs = [], isLoading: timeoffsLoading } = useQuery({
    queryKey: ['/api/timeoffs/user', user?.id],
    enabled: !!user,
  });

  // Get TOIL balance
  const { data: toilBalance = [], isLoading: toilBalanceLoading } = useQuery({
    queryKey: ['/api/toil/balance', user?.id],
    enabled: !!user,
  });



  // Create leave request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const requestData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      return apiRequest('POST', '/api/leave-requests', requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request submitted successfully!",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    },
  });

  // Create TOIL request mutation
  const createToilRequestMutation = useMutation({
    mutationFn: async (data: ToilRequestFormData) => {
      const totalHours = data.toilHoursUsed;
      const daysDuration = Math.ceil(totalHours / 8); // Calculate days based on hours
      
      const requestData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        days: daysDuration,
        type: "toil",
        isToilRequest: true,
      };
      return apiRequest('POST', '/api/timeoffs', requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "TOIL request submitted successfully!",
      });
      toilForm.reset();
      setIsToilDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/timeoffs/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/toil/balance', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit TOIL request",
        variant: "destructive",
      });
    },
  });

  // Approve/Reject leave request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/leave-requests/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeaveRequestFormData) => {
    createRequestMutation.mutate(data);
  };

  const onToilSubmit = (data: ToilRequestFormData) => {
    createToilRequestMutation.mutate(data);
  };

  const handleApproveReject = (id: number, status: 'approved' | 'rejected') => {
    updateRequestMutation.mutate({ id, status });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getTotalToilHours = () => {
    if (!Array.isArray(toilBalance)) return 0;
    return toilBalance.reduce((total: number, balance: any) => total + (balance.hoursRemaining || 0), 0);
  };

  const getExpiringToilHours = () => {
    if (!Array.isArray(toilBalance)) return 0;
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return toilBalance.filter((balance: any) => 
      new Date(balance.expiryDate) <= threeDaysFromNow && !balance.isExpired
    ).reduce((total: number, balance: any) => total + (balance.hoursRemaining || 0), 0);
  };

  const filteredLeaveRequests = (userLeaveRequests as any[]).filter((request: any) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

  const filteredTimeoffs = (userTimeoffs as any[]).filter((request: any) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

  // Calculate remaining leave balances
  const calculateRemainingLeaves = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Filter approved leaves for current year
    const approvedLeaves = (userLeaveRequests as any[]).filter((request: any) => 
      request.status === 'approved' && 
      new Date(request.startDate).getFullYear() === currentYear
    );

    // Calculate used annual leaves
    const usedAnnualLeaves = approvedLeaves
      .filter((request: any) => request.type === 'annual')
      .reduce((total: number, request: any) => {
        return total + calculateDuration(request.startDate, request.endDate);
      }, 0);

    // Calculate used casual leaves for current month
    const usedCasualLeaves = approvedLeaves
      .filter((request: any) => 
        request.type === 'casual' && 
        new Date(request.startDate).getMonth() === currentMonth
      )
      .reduce((total: number, request: any) => {
        return total + calculateDuration(request.startDate, request.endDate);
      }, 0);

    return {
      annualRemaining: Math.max(0, 21 - usedAnnualLeaves),
      casualRemaining: Math.max(0, 3 - usedCasualLeaves),
      annualUsed: usedAnnualLeaves,
      casualUsed: usedCasualLeaves
    };
  };

  const leaveBalances = calculateRemainingLeaves();

  const getLeaveStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'approved' ? 'default' : 
                   status === 'rejected' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Updates</h1>
          <p className="text-muted-foreground mt-2">
            Stay informed with your assignments, leave requests, and company updates.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="primary-bg hover:bg-primary-600">
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
              <DialogDescription>
                Fill in the details for your leave request. Select TOIL to use your Time Off In Lieu balance.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="annual">Annual Leave ({leaveBalances.annualRemaining} days left)</SelectItem>
                            <SelectItem value="casual">Casual Leave ({leaveBalances.casualRemaining} days left this month)</SelectItem>
                            <SelectItem value="sick">Sick Leave</SelectItem>
                            <SelectItem value="personal">Personal Leave</SelectItem>
                            <SelectItem value="emergency">Emergency Leave</SelectItem>
                            <SelectItem value="toil">TOIL ({getTotalToilHours()} hours available)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief reason for leave..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRequestMutation.isPending}
                    className="primary-bg hover:bg-primary-600"
                  >
                    {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveBalances.annualRemaining}</div>
            <p className="text-xs text-muted-foreground">
              of 21 days remaining
            </p>
            <Progress value={(leaveBalances.annualUsed / 21) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casual Leave</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveBalances.casualRemaining}</div>
            <p className="text-xs text-muted-foreground">
              of 3 days remaining this month
            </p>
            <Progress value={(leaveBalances.casualUsed / 3) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOIL Balance</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalToilHours()} hours</div>
            <p className="text-xs text-muted-foreground">
              Available for use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOIL Expiring</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{getExpiringToilHours()} hours</div>
            <p className="text-xs text-muted-foreground">
              Expire within 3 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            <TabsTrigger value="toil-balance">TOIL Balance</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'hr') && (
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="my-requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
              <CardDescription>Track your submitted leave requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {userRequestsLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : filteredLeaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave requests found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLeaveRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="font-medium">{request.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {calculateDuration(request.startDate, request.endDate)} days
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Announcements</CardTitle>
              <CardDescription>Important updates and news from the organization</CardDescription>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (announcements as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No announcements available
                </div>
              ) : (
                <div className="space-y-4">
                  {(announcements as any[]).map((announcement: any) => (
                    <div key={announcement.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(announcement.createdAt)}
                          </p>
                          <p className="mt-2 text-sm">{announcement.content}</p>
                        </div>
                        <Badge variant={
                          announcement.priority === 'urgent' ? 'destructive' :
                          announcement.priority === 'high' ? 'default' : 'secondary'
                        }>
                          {announcement.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Assignments</CardTitle>
              <CardDescription>Tasks and projects assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (assignments as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments found
                </div>
              ) : (
                <div className="space-y-4">
                  {(assignments as any[]).map((assignment: any) => (
                    <div key={assignment.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{assignment.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {assignment.dueDate ? formatDate(assignment.dueDate) : 'No due date'}
                          </p>
                          <p className="mt-2 text-sm">{assignment.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Category: {assignment.category} | Priority: {assignment.priority}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={
                            assignment.status === 'completed' ? 'default' :
                            assignment.status === 'overdue' ? 'destructive' : 'secondary'
                          }>
                            {assignment.status}
                          </Badge>
                          <Badge variant="outline" className={
                            assignment.priority === 'critical' ? 'border-red-500 text-red-500' :
                            assignment.priority === 'high' ? 'border-orange-500 text-orange-500' :
                            'border-gray-500 text-gray-500'
                          }>
                            {assignment.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toil-balance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>TOIL Balance Details</CardTitle>
              <CardDescription>Detailed breakdown of your TOIL hours with expiration dates</CardDescription>
            </CardHeader>
            <CardContent>
              {toilBalanceLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (toilBalance as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No TOIL balance found
                </div>
              ) : (
                <div className="space-y-4">
                  {(toilBalance as any[]).map((balance: any) => {
                    const daysToExpiry = Math.ceil((new Date(balance.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = daysToExpiry <= 3 && daysToExpiry > 0;
                    const isExpired = balance.isExpired || daysToExpiry <= 0;
                    
                    return (
                      <div key={balance.id} className={`p-4 border rounded-lg ${isExpired ? 'bg-red-50 border-red-200' : isExpiringSoon ? 'bg-orange-50 border-orange-200' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {balance.hoursRemaining} hours remaining
                              {isExpired && <span className="text-red-500 ml-2">(EXPIRED)</span>}
                              {isExpiringSoon && <span className="text-orange-500 ml-2">(Expires in {daysToExpiry} days)</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Earned: {formatDate(balance.earnedDate)} | Expires: {formatDate(balance.expiryDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Original: {balance.hoursEarned} hours | Used: {balance.hoursUsed} hours
                            </p>
                            {balance.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{balance.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Progress 
                              value={(balance.hoursUsed / balance.hoursEarned) * 100} 
                              className="w-20 mb-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              {Math.round((balance.hoursUsed / balance.hoursEarned) * 100)}% used
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(user?.role === 'admin' || user?.role === 'hr') && (
          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Review and approve/reject leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (pendingRequests as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingRequests as any[]).map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.user?.profilePicture} />
                            <AvatarFallback>{request.user?.fullName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.user?.fullName}</p>
                            <p className="text-sm text-muted-foreground">{request.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Duration: {calculateDuration(request.startDate, request.endDate)} days
                            </p>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproveReject(request.id, 'approved')}
                            disabled={updateRequestMutation.isPending}
                            size="sm"
                            className="primary-bg hover:bg-primary-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleApproveReject(request.id, 'rejected')}
                            disabled={updateRequestMutation.isPending}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}