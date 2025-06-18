import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Plus, Clock, MapPin, Edit, Trash2, CheckCircle, Circle, Filter, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { Routine } from "@shared/schema";
import { format, addDays, startOfDay, parseISO } from "date-fns";

export default function PersonalRoutine() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get routines for the next 14 days
  const { data: routines = [], isLoading: routinesLoading } = useQuery<Routine[]>({
    queryKey: ['/api/routines'],
    enabled: !!user,
  });

  // Get upcoming routines (today and tomorrow)
  const { data: upcomingRoutines = [] } = useQuery<Routine[]>({
    queryKey: ['/api/routines/upcoming'],
    enabled: !!user,
  });

  // Delete routine mutation
  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/routines/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Routine deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routines/upcoming'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete routine",
        variant: "destructive",
      });
    },
  });

  // Toggle completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      const response = await apiRequest(`/api/routines/${id}`, 'PUT', { isCompleted });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routines/upcoming'] });
    },
  });

  const handleEdit = (routine: Routine) => {
    navigate(`/add-routine?id=${routine.id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this routine?")) {
      deleteRoutineMutation.mutate(id);
    }
  };

  const toggleCompletion = (routine: Routine) => {
    toggleCompletionMutation.mutate({
      id: routine.id,
      isCompleted: !routine.isCompleted
    });
  };

  // Filter routines
  const filteredRoutines = routines.filter(routine => {
    const categoryMatch = categoryFilter === "all" || routine.category === categoryFilter;
    const dateMatch = selectedDate === "all" || format(new Date(routine.date), 'yyyy-MM-dd') === selectedDate;
    return categoryMatch && dateMatch;
  });

  // Group routines by date
  const groupedRoutines = filteredRoutines.reduce((groups: { [key: string]: Routine[] }, routine) => {
    const date = format(new Date(routine.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(routine);
    return groups;
  }, {});

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      personal: "bg-blue-50 text-blue-700 border-blue-200",
      work: "bg-green-50 text-green-700 border-green-200",
      health: "bg-red-50 text-red-700 border-red-200",
      meeting: "bg-purple-50 text-purple-700 border-purple-200",
      break: "bg-orange-50 text-orange-700 border-orange-200"
    };
    return (
      <Badge variant="outline" className={colors[category as keyof typeof colors] || ""}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Personal Routine</h1>
          <p className="text-muted-foreground mt-2">
            Plan and manage your daily activities for the next 14 days. Past routines are automatically cleaned up from the database.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            Calendar
          </Button>
          
          <Button 
            className="primary-bg hover:bg-primary-600"
            onClick={() => navigate('/add-routine')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Routine
          </Button>
        </div>
      </div>

      {/* Upcoming Routines Quick View */}
      {upcomingRoutines.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <span>Upcoming Routines</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingRoutines.slice(0, 3).map((routine) => (
                <div key={routine.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCompletion(routine)}
                      className="p-1 h-6 w-6"
                    >
                      {routine.isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <div>
                      <span className={`font-medium ${routine.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {routine.title}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(routine.date), 'MMM d')} • {formatTime(routine.startTime)} - {formatTime(routine.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getCategoryBadge(routine.category)}
                    {getPriorityBadge(routine.priority)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {Array.from({ length: 14 }, (_, i) => {
                    const date = addDays(new Date(), i);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return (
                      <SelectItem key={dateStr} value={dateStr}>
                        {format(date, 'EEEE, MMM d, yyyy')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routines List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>
              Your Routines 
              {filteredRoutines.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredRoutines.length} {filteredRoutines.length === 1 ? 'routine' : 'routines'})
                </span>
              )}
            </span>
          </CardTitle>
          <CardDescription>
            Manage your daily activities and tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routinesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading routines...</p>
            </div>
          ) : Object.keys(groupedRoutines).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No routines found</h3>
              <p className="text-muted-foreground">
                Create your first routine to start organizing your daily activities.
              </p>
              <Button 
                className="mt-4 primary-bg hover:bg-primary-600"
                onClick={() => navigate('/add-routine')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Routine
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRoutines)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, dateRoutines]) => (
                  <div key={date} className="space-y-3">
                    <h3 className="text-lg font-semibold sticky top-0 bg-background py-2 border-b">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="space-y-3">
                      {dateRoutines
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((routine) => (
                          <div key={routine.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCompletion(routine)}
                                  className="mt-1 p-1 h-6 w-6"
                                >
                                  {routine.isCompleted ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className={`font-semibold ${routine.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                      {routine.title}
                                    </h4>
                                    {getCategoryBadge(routine.category)}
                                    {getPriorityBadge(routine.priority)}
                                  </div>
                                  {routine.description && (
                                    <p className="text-muted-foreground mb-2">{routine.description}</p>
                                  )}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                    <div>
                                      <p className="font-medium text-foreground flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Time</span>
                                      </p>
                                      <p>{formatTime(routine.startTime)} - {formatTime(routine.endTime)}</p>
                                    </div>
                                    {routine.location && (
                                      <div>
                                        <p className="font-medium text-foreground flex items-center space-x-1">
                                          <MapPin className="h-3 w-3" />
                                          <span>Location</span>
                                        </p>
                                        <p>{routine.location}</p>
                                      </div>
                                    )}
                                    {routine.notes && (
                                      <div>
                                        <p className="font-medium text-foreground">Notes</p>
                                        <p className="truncate">{routine.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(routine)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(routine.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
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