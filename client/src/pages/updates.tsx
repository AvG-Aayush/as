import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Target, Bell, Timer, TrendingUp } from "lucide-react";
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

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  type: string;
  category: string;
  priority: string;
  location: string | null;
  isAllDay: boolean;
  createdBy: number;
}

const leaveRequestSchema = insertLeaveRequestSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

// Simplified TOIL request schema
const toilLeaveRequestSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  toilHoursUsed: z.coerce.number().min(1, "Minimum 1 hour required"),
  reason: z.string().optional(),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date", 
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
type ToilRequestFormData = z.infer<typeof toilLeaveRequestSchema>;

export default function Updates() {
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

  // Get user's leave requests
  const { data: userLeaveRequests = [], isLoading: userRequestsLoading } = useQuery({
    queryKey: ['/api/leave-requests/user', user?.id],
    enabled: !!user,
  });

  // Get TOIL balance
  const { data: toilBalance, isLoading: toilLoading } = useQuery({
    queryKey: ['/api/toil/balance', user?.id],
    enabled: !!user,
  });

  // Get TOIL leave requests (timeoffs with isToilRequest = true)
  const { data: toilRequests = [], isLoading: toilRequestsLoading } = useQuery({
    queryKey: ['/api/timeoffs/user', user?.id],
    enabled: !!user,
  });

  // Get calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/calendar-events'],
    enabled: !!user,
  });

  // Filter assignments for current user
  const userAssignments = (assignments as Assignment[]).filter((assignment: Assignment) => 
    assignment.assignedTo === user?.id
  );

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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

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

  const toilForm = useForm({
    resolver: zodResolver(toilLeaveRequestSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      toilHoursUsed: 1,
    },
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeaveRequestFormData) => {
    console.log('Leave form submitted:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Form isValid:', form.formState.isValid);
    
    if (!form.formState.isValid) {
      console.log('Form validation failed, not submitting');
      return;
    }
    
    createRequestMutation.mutate(data);
  };

  // Create TOIL leave request mutation (using TOIL hours for time off)
  const createToilRequestMutation = useMutation({
    mutationFn: async (data: ToilRequestFormData) => {
      // Calculate days from hours: 8 hours = 1 day
      const calculatedDays = data.toilHoursUsed / 8;
      const requestData = {
        userId: user?.id,
        type: "toil",
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        days: Math.max(0.125, calculatedDays), // Minimum 1 hour = 0.125 days
        reason: data.reason || `TOIL leave using ${data.toilHoursUsed} hours`,
        status: "pending",
        isToilRequest: true,
        toilHoursUsed: data.toilHoursUsed,
      };
      return apiRequest('POST', '/api/leave-requests', requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "TOIL leave request submitted successfully!",
      });
      toilForm.reset();
      setIsToilDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/toil/balance', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit TOIL leave request",
        variant: "destructive",
      });
    },
  });

  const onToilSubmit = (data: any) => {
    console.log('TOIL form submitted:', data);
    console.log('TOIL form errors:', toilForm.formState.errors);
    console.log('TOIL form isValid:', toilForm.formState.isValid);
    
    if (!toilForm.formState.isValid) {
      console.log('Form validation failed, not submitting');
      return;
    }
    
    createToilRequestMutation.mutate(data);
  };

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
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    // Calculate used casual leaves for current month
    const usedCasualLeaves = approvedLeaves
      .filter((request: any) => 
        request.type === 'casual' && 
        new Date(request.startDate).getMonth() === currentMonth
      )
      .reduce((total: number, request: any) => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    return {
      annualRemaining: Math.max(0, 20 - usedAnnualLeaves), // Assuming 20 annual leaves per year
      casualRemaining: Math.max(0, 2 - usedCasualLeaves), // Assuming 2 casual leaves per month
      annualUsed: usedAnnualLeaves,
      casualUsed: usedCasualLeaves
    };
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getTotalToilHours = () => {
    return (toilBalance as any)?.balance || 0;
  };

  const leaveBalances = calculateRemainingLeaves();

  if (assignmentsLoading || announcementsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold charcoal-text">Updates</h1>
          <p className="text-muted-foreground mt-2">
            Stay informed with your assignments, leave requests, and company updates.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Loading assignments...</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Loading announcements...</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Updates</h1>
          <p className="text-muted-foreground mt-2">
            Stay informed with your assignments, leave requests, and company updates.
          </p>
        </div>
        
        <div className="flex gap-2">
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                  </div>

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

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Provide additional details about your leave request..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRequestMutation.isPending}
                      className="primary-bg hover:bg-primary-600"
                    >
                      {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isToilDialogOpen} onOpenChange={setIsToilDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Timer className="mr-2 h-4 w-4" />
                Use TOIL Hours
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Use TOIL Hours for Leave</DialogTitle>
                <DialogDescription>
                  Submit a leave request using your available TOIL (Time Off In Lieu) hours. 8 hours = 1 day.
                </DialogDescription>
              </DialogHeader>
              <Form {...toilForm}>
                <form onSubmit={toilForm.handleSubmit(onToilSubmit)} className="space-y-4" noValidate>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={toilForm.control}
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
                      control={toilForm.control}
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

                  <FormField
                    control={toilForm.control}
                    name="toilHoursUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TOIL Hours to Use</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="1"
                            min="1"
                            max="40"
                            placeholder="Enter hours (8 = 1 day)"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground mt-1">
                          {field.value ? `${field.value} hours = ${(field.value / 8).toFixed(3)} days` : "8 hours = 1 day"}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={toilForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Describe the work you'll be doing during overtime..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsToilDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createToilRequestMutation.isPending}
                      className="primary-bg hover:bg-primary-600"
                    >
                      {createToilRequestMutation.isPending ? 'Submitting...' : 'Submit TOIL Leave Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Updates</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="toil">TOIL Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Recent Assignments</span>
                </CardTitle>
                <CardDescription>
                  Your current assignments and tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {userAssignments.slice(0, 3).map((assignment: Assignment) => (
                      <div key={assignment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`${getStatusColor(assignment.status)}`}>
                              {getStatusIcon(assignment.status)}
                            </div>
                            <h4 className="font-medium">{assignment.title}</h4>
                            <Badge variant={getPriorityColor(assignment.priority)}>
                              {assignment.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assignments found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Company Announcements</span>
                </CardTitle>
                <CardDescription>
                  Latest company updates and news
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(announcements as Announcement[]).length > 0 ? (
                  <div className="space-y-4">
                    {(announcements as Announcement[]).slice(0, 3).map((announcement: Announcement) => (
                      <div key={announcement.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <Badge variant={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No announcements found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="toil" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span>TOIL Requests</span>
              </CardTitle>
              <CardDescription>
                Your TOIL leave requests using earned overtime hours (8 hours = 1 day)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {((toilRequests as any[]).filter(req => req.isToilRequest)).length > 0 ? (
                <div className="space-y-4">
                  {(toilRequests as any[]).filter(req => req.isToilRequest).map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getLeaveStatusIcon(request.status)}
                          <h4 className="font-medium">TOIL Leave Request</h4>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <p>
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                          <p>TOIL Hours Used: {request.toilHoursUsed || 0} hours ({((request.toilHoursUsed || 0) / 8).toFixed(3)} days)</p>
                        </div>
                        {request.reason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {request.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No TOIL leave requests found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Leave Requests</span>
              </CardTitle>
              <CardDescription>
                Your leave request history and current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(userLeaveRequests as any[]).length > 0 ? (
                <div className="space-y-4">
                  {(userLeaveRequests as any[]).map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getLeaveStatusIcon(request.status)}
                          <h4 className="font-medium capitalize">{request.type} Leave</h4>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <p>
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                          <p>Duration: {calculateDuration(request.startDate, request.endDate)} days</p>
                        </div>
                        {request.reason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {request.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No leave requests found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}