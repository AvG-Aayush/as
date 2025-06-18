import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Clock, ArrowLeft, Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { format, addDays } from "date-fns";

// Simplified form schema without expiresAt field
const routineFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  category: z.enum(["personal", "work", "health", "meeting", "break"]),
  priority: z.enum(["low", "medium", "high"]),
  isCompleted: z.boolean().default(false),
  remindBefore: z.number().min(0).max(120).default(15),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
}).refine((data) => {
  const selectedDate = new Date(data.date);
  const fourteenDaysFromNow = addDays(new Date(), 14);
  return selectedDate <= fourteenDaysFromNow;
}, {
  message: "Date cannot be more than 14 days in the future",
  path: ["date"],
});

type RoutineFormData = z.infer<typeof routineFormSchema>;

export default function AddRoutine() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [routineId, setRoutineId] = useState<number | null>(null);

  // Check if we're editing an existing routine from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setRoutineId(parseInt(id));
      setIsEditing(true);
    }
  }, []);

  const form = useForm<RoutineFormData>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: "09:00",
      endTime: "10:00",
      category: "personal",
      priority: "medium",
      isCompleted: false,
      remindBefore: 15,
      isRecurring: false,
      recurringPattern: "",
      notes: "",
      location: "",
    },
  });

  // Get existing routine data if editing
  const { data: existingRoutine } = useQuery<any>({
    queryKey: ['/api/routines', routineId],
    enabled: !!routineId,
  });

  // Populate form with existing routine data
  useEffect(() => {
    if (existingRoutine?.title) {
      form.reset({
        title: existingRoutine.title,
        description: existingRoutine.description || "",
        date: format(new Date(existingRoutine.date), 'yyyy-MM-dd'),
        startTime: existingRoutine.startTime,
        endTime: existingRoutine.endTime,
        category: existingRoutine.category,
        priority: existingRoutine.priority,
        isCompleted: existingRoutine.isCompleted,
        remindBefore: existingRoutine.remindBefore || 15,
        isRecurring: existingRoutine.isRecurring,
        recurringPattern: existingRoutine.recurringPattern || "",
        notes: existingRoutine.notes || "",
        location: existingRoutine.location || "",
      });
    }
  }, [existingRoutine, form]);

  const createRoutineMutation = useMutation({
    mutationFn: async (data: RoutineFormData) => {
      const routineData = {
        ...data,
        userId: user!.id,
        date: new Date(data.date),
        expiresAt: addDays(new Date(data.date), 1),
      };
      const response = await apiRequest('POST', '/api/routines', routineData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Routine created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routines/upcoming'] });
      navigate('/personal-routine');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create routine",
        variant: "destructive",
      });
    },
  });

  const updateRoutineMutation = useMutation({
    mutationFn: async (data: RoutineFormData) => {
      const routineData = {
        ...data,
        date: new Date(data.date),
        expiresAt: addDays(new Date(data.date), 1),
      };
      const response = await apiRequest('PUT', `/api/routines/${routineId}`, routineData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Routine updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routines/upcoming'] });
      navigate('/personal-routine');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update routine",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoutineFormData) => {
    console.log('Form submitted successfully:', data);
    
    if (isEditing) {
      updateRoutineMutation.mutate(data);
    } else {
      createRoutineMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/personal-routine')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Routines
        </Button>
        <div>
          <h1 className="text-3xl font-bold charcoal-text">
            {isEditing ? 'Edit Routine' : 'Add New Routine'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update your routine details' : 'Add a new activity to your daily routine (up to 14 days ahead)'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Routine Details</span>
          </CardTitle>
          <CardDescription>
            Fill in your routine information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Morning Exercise, Study Session, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Activity description..." 
                        rows={2}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="break">Break</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Home, gym, office, etc." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remindBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remind Before (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          max="120"
                          value={field.value.toString()}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Recurring Activity</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Set this routine to repeat on a schedule
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('isRecurring') && (
                <FormField
                  control={form.control}
                  name="recurringPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurring Pattern</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="weekdays">Weekdays Only</SelectItem>
                          <SelectItem value="weekends">Weekends Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes or reminders..." 
                        rows={3}
                        {...field}
                        value={field.value || ""}
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
                  onClick={() => navigate('/personal-routine')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRoutineMutation.isPending || updateRoutineMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createRoutineMutation.isPending || updateRoutineMutation.isPending 
                    ? 'Saving...' 
                    : isEditing ? 'Update Routine' : 'Create Routine'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}