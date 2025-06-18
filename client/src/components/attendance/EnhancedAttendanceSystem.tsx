import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2, Navigation, Calendar, Edit2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, isAfter, startOfDay, addDays } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn?: string;
  checkOut?: string;
  date: string;
  status: string;
  workingHours?: number;
  overtimeHours?: number;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInAddress?: string;
  checkOutAddress?: string;
  checkInNotes?: string;
  checkOutNotes?: string;
  isGpsVerified?: boolean;
  isLocationValid?: boolean;
  requiresApproval?: boolean;
}

export default function EnhancedAttendanceSystem() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [gpsLocation, setGpsLocation] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // Get today's attendance
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery<AttendanceRecord>({
    queryKey: ['/api/attendance/today'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get attendance history
  const { data: attendanceHistory = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/history', user?.id],
    enabled: !!user,
  });

  // Get GPS location
  const getCurrentLocation = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported on this device"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          };

          // Try to get human-readable address
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=en`
            );
            if (response.ok) {
              const data = await response.json();
              location.address = data.displayName || data.locality || location.address;
            }
          } catch (error) {
            console.warn('Geocoding failed, using coordinates');
          }

          resolve(location);
        },
        (error) => {
          let message = "Failed to get GPS location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "GPS permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "GPS position unavailable. Please try again.";
              break;
            case error.TIMEOUT:
              message = "GPS request timed out. Please try again.";
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  };

  // Check-in/Check-out mutation
  const attendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.isCheckOut) {
        return apiRequest('POST', `/api/attendance/checkout/${todayAttendance?.id}`, data);
      } else {
        return apiRequest('POST', '/api/attendance/checkin', data);
      }
    },
    onSuccess: () => {
      setIsProcessing(false);
      setCheckInNotes("");
      setCheckOutNotes("");
      refetchTodayAttendance();
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/history'] });
      
      toast({
        title: "Success",
        description: "Attendance recorded successfully"
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Failed",
        description: error.message || "Failed to record attendance",
        variant: "destructive"
      });
    }
  });

  // Admin status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { recordId: number; status: string }) => 
      apiRequest('PUT', `/api/attendance/${data.recordId}/status`, { status: data.status }),
    onSuccess: () => {
      setEditingRecord(null);
      setNewStatus("");
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/history'] });
      toast({
        title: "Status Updated",
        description: "Attendance status has been updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  });

  // Handle attendance action (check-in or check-out)
  const handleAttendanceAction = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setLocationError(null);

    const isCheckOut = todayAttendance && todayAttendance.checkIn && !todayAttendance.checkOut;
    
    try {
      // Try to get GPS location
      const location = await getCurrentLocation();
      setGpsLocation(location);
      
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const attendanceData = {
        isCheckOut,
        [isCheckOut ? 'checkOut' : 'checkIn']: new Date().toISOString(),
        [isCheckOut ? 'checkOutLatitude' : 'checkInLatitude']: location.latitude,
        [isCheckOut ? 'checkOutLongitude' : 'checkInLongitude']: location.longitude,
        [isCheckOut ? 'checkOutLocation' : 'checkInLocation']: "GPS Location",
        [isCheckOut ? 'checkOutAddress' : 'checkInAddress']: location.address,
        [isCheckOut ? 'checkOutAccuracy' : 'checkInAccuracy']: location.accuracy,
        [isCheckOut ? 'checkOutNotes' : 'checkInNotes']: isCheckOut ? checkOutNotes : checkInNotes,
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        isGpsVerified: true,
        isLocationValid: true,
        requiresApproval: false
      };

      await attendanceMutation.mutateAsync(attendanceData);
      
    } catch (error: any) {
      // GPS failed, fall back to manual entry
      setLocationError(error.message);
      
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const attendanceData = {
        isCheckOut,
        [isCheckOut ? 'checkOut' : 'checkIn']: new Date().toISOString(),
        [isCheckOut ? 'checkOutLocation' : 'checkInLocation']: "Manual Entry",
        [isCheckOut ? 'checkOutAddress' : 'checkInAddress']: "Manual entry - GPS unavailable",
        [isCheckOut ? 'checkOutNotes' : 'checkInNotes']: `${isCheckOut ? checkOutNotes : checkInNotes} [GPS failed: ${error.message}]`,
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        isGpsVerified: false,
        isLocationValid: false,
        requiresApproval: true
      };

      await attendanceMutation.mutateAsync(attendanceData);
    }
  };

  // Determine button state and text
  const getButtonState = () => {
    if (!todayAttendance || !todayAttendance.checkIn) {
      return { text: "Check In", action: "checkin", disabled: false };
    }
    
    if (todayAttendance.checkIn && !todayAttendance.checkOut) {
      return { text: "Check Out", action: "checkout", disabled: false };
    }
    
    // Already checked out today - button should be disabled until next day
    const nextDay = addDays(startOfDay(new Date()), 1);
    const now = new Date();
    
    if (isAfter(now, nextDay)) {
      return { text: "Check In", action: "checkin", disabled: false };
    }
    
    return { text: "Completed for Today", action: "completed", disabled: true };
  };

  const buttonState = getButtonState();

  // Auto-calculate work hours at midnight for unchecked-out employees
  useEffect(() => {
    const checkMidnightReset = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      if (now >= midnight) {
        // Trigger a refetch to get updated attendance status
        refetchTodayAttendance();
      }
    };

    const interval = setInterval(checkMidnightReset, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [refetchTodayAttendance]);

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance System</h1>
          <p className="text-muted-foreground">GPS-enabled attendance tracking with automatic state management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Navigation className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-muted-foreground">GPS Tracking Active</span>
        </div>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Status</CardTitle>
              <CardDescription>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {todayAttendance && todayAttendance.checkIn ? (
                <div className="space-y-4">
                  {/* Check-in Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Checked In</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(todayAttendance.checkIn)} at {todayAttendance.checkInLocation || 'Unknown'}
                        </p>
                        {todayAttendance.checkInAddress && (
                          <p className="text-xs text-muted-foreground">
                            📍 {todayAttendance.checkInAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className="bg-green-500">Present</Badge>
                      {todayAttendance.isGpsVerified && (
                        <Badge variant="outline" className="text-xs">
                          <Navigation className="h-3 w-3 mr-1" />
                          GPS Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Check-out Status */}
                  {todayAttendance.checkOut ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Checked Out</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(todayAttendance.checkOut)} at {todayAttendance.checkOutLocation || 'Unknown'}
                          </p>
                          <p className="text-xs text-green-600 font-medium">
                            Working Hours: {(todayAttendance.workingHours || 0).toFixed(2)}h
                            {(todayAttendance.overtimeHours || 0) > 0 && (
                              <span className="text-blue-600 ml-2">
                                (Overtime: {todayAttendance.overtimeHours?.toFixed(2)}h)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500">Completed</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 border border-dashed rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">Check-out Pending</p>
                          <p className="text-sm text-muted-foreground">
                            Working since {formatDistanceToNow(new Date(todayAttendance.checkIn), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-orange-600">In Progress</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No check-in recorded for today</p>
                </div>
              )}

              {/* Location Error Alert */}
              {locationError && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    GPS Error: {locationError}. Proceeding with manual entry (requires approval).
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Button and Notes */}
              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="notes">
                    {buttonState.action === 'checkout' ? 'Check-out Notes (Optional)' : 'Check-in Notes (Optional)'}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={`Add any notes for your ${buttonState.action}...`}
                    value={buttonState.action === 'checkout' ? checkOutNotes : checkInNotes}
                    onChange={(e) => buttonState.action === 'checkout' ? setCheckOutNotes(e.target.value) : setCheckInNotes(e.target.value)}
                    rows={2}
                    disabled={buttonState.disabled}
                  />
                </div>

                <Button
                  onClick={handleAttendanceAction}
                  disabled={isProcessing || buttonState.disabled}
                  size="lg"
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      {buttonState.text}
                    </>
                  )}
                </Button>

                {buttonState.disabled && (
                  <p className="text-center text-sm text-muted-foreground">
                    Check-in will be available again tomorrow at midnight
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {attendanceHistory.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          record.status === 'present' ? 'bg-green-500' : 
                          record.status === 'absent' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium">{formatDate(record.date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.checkIn ? formatTime(record.checkIn) : 'N/A'} - 
                            {record.checkOut ? formatTime(record.checkOut) : ' In Progress'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingRecord === record.id ? (
                          <div className="flex items-center space-x-2">
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              onClick={() => updateStatusMutation.mutate({ recordId: record.id, status: newStatus })}
                              disabled={!newStatus}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingRecord(null);
                                setNewStatus("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                            {isAdmin && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingRecord(record.id);
                                  setNewStatus(record.status);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No attendance records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}