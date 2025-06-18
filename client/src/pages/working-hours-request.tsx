import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertOvertimeRequestSchema, type InsertOvertimeRequest } from "@shared/schema";
import { 
  Clock, 
  Plus, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  User, 
  FileText,
  Timer,
  Briefcase,
  Coffee,
  Calculator
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

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

export default function WorkingHoursRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const form = useForm<WorkingHoursRequestData>({
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

  const { data: overtimeRequests = [], isLoading } = useQuery({
    queryKey: ['/api/overtime-requests'],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['/api/holidays'],
  });

  // Filter user's requests
  const userRequests = (overtimeRequests as any[]).filter(
    (request: any) => request.userId === user?.id
  );

  const createOvertimeRequest = useMutation({
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
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit working hours request",
        variant: "destructive" 
      });
    },
  });

  const calculateHours = () => {
    const startTime = form.watch("startTime");
    const endTime = form.watch("endTime");
    
    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startTotal = startHour + startMin / 60;
      const endTotal = endHour + endMin / 60;
      
      let hours = endTotal - startTotal;
      if (hours < 0) hours += 24; // Handle overnight shifts
      
      form.setValue("estimatedHours", Number(hours.toFixed(2)));
    }
  };

  // Check if selected date is weekend or holiday
  const checkSpecialDay = (dateString: string) => {
    if (!dateString) return;
    
    const selectedDate = new Date(dateString);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    
    const isHoliday = (holidays as any[]).some((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === selectedDate.toDateString();
    });
    
    form.setValue("isWeekend", isWeekend);
    form.setValue("isHoliday", isHoliday);
  };

  useEffect(() => {
    calculateHours();
  }, [form.watch("startTime"), form.watch("endTime")]);

  useEffect(() => {
    const requestedDate = form.watch("requestedDate");
    if (requestedDate) {
      checkSpecialDay(requestedDate);
    }
  }, [form.watch("requestedDate"), holidays]);

  const onSubmit = (data: WorkingHoursRequestData) => {
    createOvertimeRequest.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 dark:text-green-400';
      case 'rejected': return 'text-red-600 dark:text-red-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'approved' ? 'default' : 
                   status === 'rejected' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getTotalPendingHours = () => {
    return userRequests
      .filter((req: any) => req.status === 'pending')
      .reduce((total: number, req: any) => total + (req.estimatedHours || 0), 0);
  };

  const getTotalApprovedHours = () => {
    return userRequests
      .filter((req: any) => req.status === 'approved')
      .reduce((total: number, req: any) => total + (req.actualHoursWorked || req.estimatedHours || 0), 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Working Hours Request</h1>
          <p className="text-muted-foreground mt-2">
            Request additional working hours to earn Time Off In Lieu (TOIL) hours for future use.
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="flex items-center space-x-2 primary-bg hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Hours</p>
                <p className="text-2xl font-bold">{getTotalPendingHours()}</p>
                <p className="text-xs text-muted-foreground">awaiting approval</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Hours</p>
                <p className="text-2xl font-bold">{getTotalApprovedHours()}</p>
                <p className="text-xs text-muted-foreground">this year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">TOIL Earned</p>
                <p className="text-2xl font-bold">{getTotalApprovedHours()}</p>
                <p className="text-xs text-muted-foreground">hours available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{userRequests.length}</p>
                <p className="text-xs text-muted-foreground">submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Submit Working Hours Request</span>
            </CardTitle>
            <CardDescription>
              Request approval for additional working hours. Approved hours will be converted to TOIL (1:1 ratio).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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

                  <div className="flex items-center space-x-2 pt-6">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                          Automatically calculated from start/end times
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Additional Hours</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Explain why you need to work additional hours (e.g., project deadline, urgent client requirements, system maintenance)..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                        • Approved overtime hours are converted to TOIL hours (1:1 ratio)
                        • Weekend and holiday work may receive bonus TOIL hours
                        • TOIL hours expire 21 days after being earned
                        • Use TOIL hours for time off instead of regular leave days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOvertimeRequest.isPending}
                    className="primary-bg hover:bg-primary-600"
                  >
                    {createOvertimeRequest.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Working Hours Requests</CardTitle>
          <CardDescription>
            Track your submitted requests and their approval status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading requests...</p>
            </div>
          ) : userRequests.length > 0 ? (
            <div className="space-y-4">
              {userRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                      </span>
                      <h4 className="font-medium">
                        {format(new Date(request.requestedDate), 'MMM dd, yyyy')}
                      </h4>
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
                        <span className="font-medium">Time:</span> {request.startTime} - {request.endTime} 
                        ({request.estimatedHours} hours)
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </p>
                      {request.status === 'approved' && request.toilHoursAwarded && (
                        <p className="text-green-600 dark:text-green-400">
                          <span className="font-medium">TOIL Hours Earned:</span> {request.toilHoursAwarded}
                        </p>
                      )}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <p className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Submitted: {format(new Date(request.createdAt), 'MMM dd')}</p>
                    {request.processedAt && (
                      <p>Processed: {format(new Date(request.processedAt), 'MMM dd')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No working hours requests submitted yet</p>
              <p className="text-sm text-muted-foreground">Submit your first request to start earning TOIL hours</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}