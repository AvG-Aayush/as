import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Timer, 
  TrendingUp, 
  Briefcase,
  Calculator,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { leaveRequestSchema, toilLeaveRequestSchema } from "@shared/schema";
import type { LeaveRequestFormData, ToilRequestFormData } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

// Working hours request schema
const workingHoursRequestSchema = z.object({
  userId: z.number(),
  requestedDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  estimatedHours: z.number().min(0.5, "Minimum 0.5 hours").max(16, "Maximum 16 hours"),
  reason: z.string().min(10, "Please provide a detailed reason (minimum 10 characters)"),
  workDescription: z.string().min(20, "Please provide detailed work description (minimum 20 characters)"),
  isWeekend: z.boolean().default(false),
  isHoliday: z.boolean().default(false),
  status: z.string().default("pending"),
});

type WorkingHoursRequestData = z.infer<typeof workingHoursRequestSchema>;

export default function RequestForms() {
  const [activeTab, setActiveTab] = useState("leave");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const leaveForm = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: "annual",
      startDate: "",
      endDate: "",
      reason: "",
      status: "pending",
    },
  });

  const toilForm = useForm<ToilRequestFormData>({
    resolver: zodResolver(toilLeaveRequestSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      toilHoursUsed: 1,
    },
  });

  const workingHoursForm = useForm<WorkingHoursRequestData>({
    resolver: zodResolver(workingHoursRequestSchema),
    defaultValues: {
      userId: user?.id || 0,
      requestedDate: "",
      startTime: "09:00",
      endTime: "17:00",
      estimatedHours: 8,
      reason: "",
      workDescription: "",
      isWeekend: false,
      isHoliday: false,
      status: "pending",
    },
  });

  // Data queries
  const { data: userLeaveRequests = [], isLoading: userRequestsLoading } = useQuery({
    queryKey: ['/api/leave-requests/user', user?.id],
    enabled: !!user,
  });

  const { data: toilBalance, isLoading: toilLoading } = useQuery({
    queryKey: ['/api/toil/balance', user?.id],
    enabled: !!user,
  });

  const { data: overtimeRequests = [], isLoading: overtimeLoading } = useQuery({
    queryKey: ['/api/overtime-requests'],
    enabled: !!user,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['/api/holidays'],
  });

  // Filter user's overtime requests
  const userOvertimeRequests = Array.isArray(overtimeRequests) 
    ? overtimeRequests.filter((request: any) => request.userId === user?.id)
    : [];

  // Mutations
  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const requestData = {
        ...data,
        userId: user?.id,
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
      leaveForm.reset();
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

  const createToilRequestMutation = useMutation({
    mutationFn: async (data: ToilRequestFormData) => {
      const calculatedDays = data.toilHoursUsed / 8;
      const requestData = {
        userId: user?.id,
        type: "toil",
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        days: Math.max(0.125, calculatedDays),
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

  const createOvertimeRequestMutation = useMutation({
    mutationFn: async (data: WorkingHoursRequestData) => {
      const requestData = {
        ...data,
        requestedDate: new Date(data.requestedDate).toISOString(),
      };
      return apiRequest('POST', '/api/overtime-requests', requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/toil/balance', user?.id] });
      toast({ 
        title: "Success", 
        description: "Working hours request submitted successfully. You'll earn TOIL hours once approved." 
      });
      workingHoursForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit working hours request",
        variant: "destructive" 
      });
    },
  });

  // Form handlers
  const onLeaveSubmit = (data: LeaveRequestFormData) => {
    createLeaveRequestMutation.mutate(data);
  };

  const onToilSubmit = (data: ToilRequestFormData) => {
    createToilRequestMutation.mutate(data);
  };

  const onWorkingHoursSubmit = (data: WorkingHoursRequestData) => {
    createOvertimeRequestMutation.mutate(data);
  };

  // Helper functions
  const calculateHours = () => {
    const startTime = workingHoursForm.watch("startTime");
    const endTime = workingHoursForm.watch("endTime");
    
    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startTotal = startHour + startMin / 60;
      const endTotal = endHour + endMin / 60;
      
      let hours = endTotal - startTotal;
      if (hours < 0) hours += 24;
      
      workingHoursForm.setValue("estimatedHours", Number(hours.toFixed(2)));
    }
  };

  const checkSpecialDay = (dateString: string) => {
    if (!dateString) return;
    
    const selectedDate = new Date(dateString);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const isHoliday = Array.isArray(holidays) && holidays.some((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === selectedDate.toDateString();
    });
    
    workingHoursForm.setValue("isWeekend", isWeekend);
    workingHoursForm.setValue("isHoliday", isHoliday);
  };

  const calculateRemainingLeaves = () => {
    const currentYear = new Date().getFullYear();
    const approvedLeaves = Array.isArray(userLeaveRequests) 
      ? userLeaveRequests.filter((request: any) => 
          request.status === 'approved' && 
          new Date(request.startDate).getFullYear() === currentYear
        )
      : [];

    const usedAnnualLeaves = approvedLeaves
      .filter((req: any) => req.type === 'annual')
      .reduce((total: number, req: any) => {
        const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    const usedCasualLeaves = approvedLeaves
      .filter((req: any) => req.type === 'casual')
      .reduce((total: number, req: any) => {
        const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    return {
      annualRemaining: Math.max(0, 20 - usedAnnualLeaves),
      casualRemaining: Math.max(0, 2 - usedCasualLeaves),
      annualUsed: usedAnnualLeaves,
      casualUsed: usedCasualLeaves
    };
  };

  const getTotalToilHours = () => {
    return (toilBalance as any)?.balance || 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'approved' ? 'default' : 
                   status === 'rejected' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  useEffect(() => {
    calculateHours();
  }, [workingHoursForm.watch("startTime"), workingHoursForm.watch("endTime")]);

  useEffect(() => {
    const requestedDate = workingHoursForm.watch("requestedDate");
    if (requestedDate) {
      checkSpecialDay(requestedDate);
    }
  }, [workingHoursForm.watch("requestedDate"), holidays]);

  const leaveBalances = calculateRemainingLeaves();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold charcoal-text">Request Forms</h1>
        <p className="text-muted-foreground mt-2">
          Submit leave requests, use TOIL hours, and request additional working hours.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Annual Leave</p>
                <p className="text-2xl font-bold">{leaveBalances.annualRemaining}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Casual Leave</p>
                <p className="text-2xl font-bold">{leaveBalances.casualRemaining}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">TOIL Hours</p>
                <p className="text-2xl font-bold">{getTotalToilHours()}</p>
                <p className="text-xs text-muted-foreground">hours available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {(Array.isArray(userLeaveRequests) ? userLeaveRequests.filter((req: any) => req.status === 'pending').length : 0) + 
                    userOvertimeRequests.filter((req: any) => req.status === 'pending').length}
                </p>
                <p className="text-xs text-muted-foreground">requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Forms Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Leave Request</span>
          </TabsTrigger>
          <TabsTrigger value="toil" className="flex items-center space-x-2">
            <Timer className="h-4 w-4" />
            <span>Use TOIL Hours</span>
          </TabsTrigger>
          <TabsTrigger value="working-hours" className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4" />
            <span>Working Hours Request</span>
          </TabsTrigger>
        </TabsList>

        {/* Leave Request Tab */}
        <TabsContent value="leave" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Submit Leave Request</span>
              </CardTitle>
              <CardDescription>
                Request time off for vacation, sick leave, or personal matters. Your request will be reviewed by HR.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...leaveForm}>
                <form onSubmit={leaveForm.handleSubmit(onLeaveSubmit)} className="space-y-4">
                  <FormField
                    control={leaveForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="annual">Annual Leave</SelectItem>
                            <SelectItem value="casual">Casual Leave</SelectItem>
                            <SelectItem value="sick">Sick Leave</SelectItem>
                            <SelectItem value="emergency">Emergency Leave</SelectItem>
                            <SelectItem value="maternity">Maternity Leave</SelectItem>
                            <SelectItem value="paternity">Paternity Leave</SelectItem>
                            <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaveForm.control}
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
                      control={leaveForm.control}
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
                    control={leaveForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
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
                      type="submit" 
                      disabled={createLeaveRequestMutation.isPending}
                      className="primary-bg hover:bg-primary-600"
                    >
                      {createLeaveRequestMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOIL Request Tab */}
        <TabsContent value="toil" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span>Use TOIL Hours for Leave</span>
              </CardTitle>
              <CardDescription>
                Use your earned TOIL (Time Off In Lieu) hours for time off. 8 hours = 1 day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...toilForm}>
                <form onSubmit={toilForm.handleSubmit(onToilSubmit)} className="space-y-4">
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
                            max={getTotalToilHours()}
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
                        <FormLabel>Reason (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Provide details about your TOIL usage..."
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
                      type="submit" 
                      disabled={createToilRequestMutation.isPending || getTotalToilHours() === 0}
                      className="primary-bg hover:bg-primary-600"
                    >
                      {createToilRequestMutation.isPending ? 'Submitting...' : 'Submit TOIL Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Hours Request Tab */}
        <TabsContent value="working-hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Request Additional Working Hours</span>
              </CardTitle>
              <CardDescription>
                Request approval for additional working hours. Approved hours will be converted to TOIL (1:1 ratio).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...workingHoursForm}>
                <form onSubmit={workingHoursForm.handleSubmit(onWorkingHoursSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={workingHoursForm.control}
                      name="requestedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center space-x-4 pt-6">
                      <FormField
                        control={workingHoursForm.control}
                        name="isWeekend"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Weekend Work</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={workingHoursForm.control}
                        name="isHoliday"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Holiday Work</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={workingHoursForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workingHoursForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workingHoursForm.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Hours</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Calculator className="h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="number" 
                                step="0.5"
                                min="0.5"
                                max="16"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                readOnly
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Automatically calculated
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={workingHoursForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Additional Hours</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Explain why you need to work additional hours (e.g., project deadline, urgent client requirements)..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workingHoursForm.control}
                    name="workDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Provide detailed description of the work to be performed during these additional hours..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-200">TOIL Information</p>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          Approved overtime hours are converted to TOIL hours (1:1 ratio). 
                          Weekend and holiday work may receive bonus TOIL hours. 
                          TOIL hours expire 21 days after being earned.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="submit" 
                      disabled={createOvertimeRequestMutation.isPending}
                      className="primary-bg hover:bg-primary-600"
                    >
                      {createOvertimeRequestMutation.isPending ? 'Submitting...' : 'Submit Working Hours Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>
            View your recent requests and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userRequestsLoading || overtimeLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading requests...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leave Requests */}
              {Array.isArray(userLeaveRequests) && userLeaveRequests.slice(0, 3).map((request: any) => (
                <div key={`leave-${request.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(request.status)}
                      <h4 className="font-medium">
                        {request.isToilRequest ? 'TOIL Leave Request' : `${request.type?.replace('_', ' ')} Leave`}
                      </h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="mt-1">{request.reason}</p>
                      {request.toilHoursUsed && (
                        <p className="text-purple-600 dark:text-purple-400">
                          TOIL Hours Used: {request.toilHoursUsed}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Overtime Requests */}
              {userOvertimeRequests.slice(0, 3).map((request: any) => (
                <div key={`overtime-${request.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(request.status)}
                      <h4 className="font-medium">Working Hours Request</h4>
                      {getStatusBadge(request.status)}
                      {request.isWeekend && (
                        <Badge variant="outline" className="text-blue-600">Weekend</Badge>
                      )}
                      {request.isHoliday && (
                        <Badge variant="outline" className="text-purple-600">Holiday</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-1">
                        {format(new Date(request.requestedDate), 'MMM dd, yyyy')} - 
                        {request.startTime} to {request.endTime} ({request.estimatedHours} hours)
                      </p>
                      <p>{request.reason}</p>
                      {request.status === 'approved' && request.toilHoursAwarded && (
                        <p className="text-green-600 dark:text-green-400">
                          TOIL Hours Earned: {request.toilHoursAwarded}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!Array.isArray(userLeaveRequests) || userLeaveRequests.length === 0) && userOvertimeRequests.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No requests submitted yet</p>
                  <p className="text-sm text-muted-foreground">Submit your first request using the forms above</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}