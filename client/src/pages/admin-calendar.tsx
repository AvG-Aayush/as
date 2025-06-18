import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, MapPin, Clock, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, isSaturday, addDays, startOfMonth, endOfMonth } from "date-fns";
import type { Holiday, CalendarEvent } from "@shared/schema";

export default function CalendarEvents() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("calendar");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Nepal Holidays and Events
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
  });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar-events'],
  });

  // Mutations
  const deleteHolidayMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      toast({ title: "Holiday deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete holiday", variant: "destructive" })
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calendar-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
      toast({ title: "Event deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete event", variant: "destructive" })
  });

  // Generate Nepal Saturdays as holidays for the current month
  const generateNepalSaturdays = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const saturdays = [];
    
    let current = start;
    while (current <= end) {
      if (isSaturday(current)) {
        saturdays.push(current);
      }
      current = addDays(current, 1);
    }
    return saturdays;
  };

  const nepalSaturdays = generateNepalSaturdays();

  // Get events and holidays for selected date
  const getDateItems = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayHolidays = holidays.filter(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
    const dayEvents = events.filter(e => format(new Date(e.eventDate), 'yyyy-MM-dd') === dateStr);
    const isSaturdayWeekend = isSaturday(date);
    
    return { holidays: dayHolidays, events: dayEvents, isSaturdayWeekend };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold charcoal-text">Calendar Management</h1>
        <p className="text-muted-foreground">Manage company holidays and events for Nepal</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>Company Calendar - Nepal</span>
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => navigate('/add-calendar-event')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Weekly off: Saturdays (Nepal standard) | Click on any date to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    modifiers={{
                      holiday: holidays.map(h => new Date(h.date)),
                      event: events.map(e => new Date(e.eventDate)),
                      saturday: nepalSaturdays
                    }}
                    modifiersStyles={{
                      holiday: { backgroundColor: '#fef3c7', color: '#d97706' },
                      event: { backgroundColor: '#dbeafe', color: '#2563eb' },
                      saturday: { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  
                  {(() => {
                    const { holidays: dayHolidays, events: dayEvents, isSaturdayWeekend } = getDateItems(selectedDate);
                    
                    return (
                      <div className="space-y-3">
                        {isSaturdayWeekend && (
                          <div className="p-3 bg-muted rounded-md">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">Weekend</Badge>
                              <span className="text-sm">Saturday - Weekly off day</span>
                            </div>
                          </div>
                        )}
                        
                        {dayHolidays.map((holiday) => (
                          <div key={holiday.id} className="p-3 border rounded-md bg-orange-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-orange-800">{holiday.name}</h4>
                                <p className="text-sm text-orange-600">{holiday.description}</p>
                                <Badge variant="outline" className="mt-1">
                                  {holiday.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {dayEvents.map((event) => (
                          <div key={event.id} className="p-3 border rounded-md bg-blue-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-blue-800">{event.title}</h4>
                                <p className="text-sm text-blue-600">{event.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {event.eventTime && !event.isAllDay && (
                                    <Badge variant="outline">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {event.eventTime}
                                    </Badge>
                                  )}
                                  {event.isAllDay && (
                                    <Badge variant="outline">All Day</Badge>
                                  )}
                                  {event.location && (
                                    <Badge variant="outline">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {event.location}
                                    </Badge>
                                  )}
                                  <Badge variant="outline">
                                    {event.type}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/add-calendar-event?id=${event.id}`)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteEventMutation.mutate(event.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {!isSaturdayWeekend && dayHolidays.length === 0 && dayEvents.length === 0 && (
                          <div className="p-4 text-center text-muted-foreground">
                            No events or holidays on this date
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Holiday Management</span>
                <Button onClick={() => navigate('/add-calendar-event')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Holiday
                </Button>
              </CardTitle>
              <CardDescription>
                Manage public holidays and special days for Nepal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{holiday.name}</h3>
                        <p className="text-sm text-muted-foreground">{holiday.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(new Date(holiday.date), 'MMM d, yyyy')}
                          </Badge>
                          <Badge variant="outline">{holiday.type}</Badge>
                          {holiday.isRecurring && (
                            <Badge variant="outline">Recurring</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/add-calendar-event?id=${holiday.id}&type=holiday`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Event Management</span>
                <Button onClick={() => navigate('/add-calendar-event')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </CardTitle>
              <CardDescription>
                Manage company events and announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(new Date(event.eventDate), 'MMM d, yyyy')}
                          </Badge>
                          {event.eventTime && !event.isAllDay && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {event.eventTime}
                            </Badge>
                          )}
                          {event.isAllDay && (
                            <Badge variant="outline">All Day</Badge>
                          )}
                          {event.location && (
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </Badge>
                          )}
                          <Badge variant="outline">{event.type}</Badge>
                          <Badge variant="outline">{event.category}</Badge>
                          {event.priority === 'high' && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/add-calendar-event?id=${event.id}`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEventMutation.mutate(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}