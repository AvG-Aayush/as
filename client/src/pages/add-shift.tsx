import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "wouter";
import { Clock, ArrowLeft, User, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { insertShiftSchema } from "@shared/schema";
import type { Shift, User as UserType } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const shiftFormSchema = insertShiftSchema.extend({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
}).omit({
  createdBy: true,
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

export default function AddShift() {
  const [, navigate] = useLocation();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [shiftId, setShiftId] = useState<number | null>(null);

  // Check if we're editing an existing shift from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setShiftId(parseInt(id));
      setIsEditing(true);
    }
  }, []);

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      userId: 0,
      title: "",
      startTime: "",
      endTime: "",
      location: "",
      notes: "",
      status: "scheduled",
    },
  });

  // Get all employees for shift assignment
  const { data: employees } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin' || user?.role === 'hr',
  });

  // Get existing shift data if editing
  const { data: existingShift } = useQuery<Shift>({
    queryKey: ['/api/shifts', shiftId],
    enabled: !!shiftId,
  });

  // Populate form with existing shift data
  useEffect(() => {
    if (existingShift) {
      form.reset({
        userId: existingShift.userId,
        title: existingShift.title,
        startTime: new Date(existingShift.startTime).toISOString().slice(0, 16),
        endTime: new Date(existingShift.endTime).toISOString().slice(0, 16),
        location: existingShift.location || "",
        notes: existingShift.notes || "",
        status: existingShift.status,
      });
    }
  }, [existingShift, form]);

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const shiftData = {
        ...data,
        userId: Number(data.userId),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        createdBy: user!.id,
      };
      const response = await apiRequest('POST', '/api/shifts', shiftData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/user'] });
      navigate('/shift-scheduling');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shift",
        variant: "destructive",
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const shiftData = {
        ...data,
        userId: Number(data.userId),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      };
      const response = await apiRequest(`/api/shifts/${shiftId}`, 'PUT', shiftData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/user'] });
      navigate('/shift-scheduling');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shift",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ShiftFormData) => {
    if (isEditing) {
      updateShiftMutation.mutate(data);
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const selectedEmployee = employees?.find(emp => emp.id === Number(form.watch('userId')));

  const canManageShifts = user?.role === 'admin' || user?.role === 'hr';

  if (!canManageShifts) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to create or edit shifts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/shift-scheduling')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shifts
        </Button>
        <div>
          <h1 className="text-3xl font-bold charcoal-text">
            {isEditing ? 'Edit Shift' : 'Create New Shift'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update the shift details and assignment' : 'Assign a new shift to an employee with specific time and location'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Shift Details</span>
          </CardTitle>
          <CardDescription>
            Fill in the shift information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Employee</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {employee.fullName?.charAt(0) || employee.username.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{employee.fullName || employee.username}</span>
                              {employee.department && (
                                <span className="text-muted-foreground">- {employee.department}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedEmployee && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedEmployee.fullName?.charAt(0) || selectedEmployee.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedEmployee.fullName || selectedEmployee.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.department} • {selectedEmployee.role}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Morning Shift, Evening Shift, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
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
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Office, warehouse, remote, etc." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional instructions or notes..." 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/shift-scheduling')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                  className="primary-bg hover:bg-primary-600"
                >
                  {isEditing ? 'Update Shift' : 'Create Shift'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}