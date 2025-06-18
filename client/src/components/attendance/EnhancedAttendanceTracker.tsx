import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Clock, CheckCircle, MapPin, AlertCircle, Timer, 
  Calendar, Activity, Zap, User, Settings 
} from "lucide-react";
import { format, formatDistanceToNow, isToday, startOfDay, endOfDay } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  workingHours: number;
  overtimeHours: number;
  status: string;
  isAutoCheckout: boolean;
  checkInNotes: string | null;
  checkOutNotes: string | null;
  adminNotes: string | null;
  date: string;
}

interface User {
  id: number;
  fullName: string;
  role: string;
}

export default function EnhancedAttendanceTracker() {
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const queryClient = useQueryClient();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Get today's attendance (returns single record or null)
  const { data: userTodayAttendance, refetch: refetchTodayAttendance } = useQuery<AttendanceRecord | null>({
    queryKey: ["/api/attendance/today"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get attendance history
  const { data: attendanceHistory } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/history", user?.id],
    enabled: !!user?.id,
  });

  // Check-in/Check-out mutation
  const attendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.isCheckOut) {
        const response = await apiRequest('POST', `/api/attendance/checkout/${userTodayAttendance?.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/attendance/checkin', data);
        return response.json();
      }
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setCheckInNotes("");
      setCheckOutNotes("");
      refetchTodayAttendance();
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/history'] });
      
      if (data.workingSummary) {
        // Handle checkout success with detailed summary
        const { totalHours, overtimeHours, toilEarned, isWeekendWork } = data.workingSummary;
        toast({
          title: "Check-out Successful",
          description: `Work completed: ${totalHours}h${overtimeHours > 0 ? ` (${overtimeHours}h overtime)` : ''}${toilEarned > 0 ? ` | TOIL earned: ${toilEarned}h` : ''}${isWeekendWork ? ' | Weekend work' : ''}`
        });
      } else if (data.workingHours) {
        // Fallback for older response format
        toast({
          title: "Check-out Successful",
          description: `Work completed: ${data.workingHours}h${data.overtimeHours > 0 ? ` (${data.overtimeHours}h overtime)` : ''}`
        });
      } else {
        // Check-in success
        toast({
          title: "Check-in Successful",
          description: data.message || "Your attendance has been recorded"
        });
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      
      // Handle specific error cases
      if (error.response?.data?.canCheckOut) {
        toast({
          title: "Already Checked In",
          description: "You can now check out when ready",
          variant: "default"
        });
      } else {
        toast({
          title: "Attendance Error",
          description: error.response?.data?.error || error.message || "Failed to record attendance",
          variant: "destructive"
        });
      }
    }
  });

  const handleCheckIn = async () => {
    setIsProcessing(true);
    
    try {
      // Get GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLatitude: position.coords.latitude,
        checkInLongitude: position.coords.longitude,
        checkInLocation: "GPS Location",
        checkInAccuracy: position.coords.accuracy,
        checkInNotes: checkInNotes || null,
        isCheckOut: false
      };

      await attendanceMutation.mutateAsync(checkInData);
    } catch (error) {
      // Allow manual check-in without GPS
      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLocation: "Manual Check-in",
        checkInNotes: checkInNotes || null,
        isCheckOut: false
      };

      await attendanceMutation.mutateAsync(checkInData);
    }
  };

  const handleCheckOut = async () => {
    if (!userTodayAttendance) return;
    
    setIsProcessing(true);
    
    try {
      // Get GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLatitude: position.coords.latitude,
        checkOutLongitude: position.coords.longitude,
        checkOutLocation: "GPS Location",
        checkOutAccuracy: position.coords.accuracy,
        checkOutNotes: checkOutNotes || null,
        isCheckOut: true
      };

      await attendanceMutation.mutateAsync(checkOutData);
    } catch (error) {
      // Allow manual check-out without GPS
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLocation: "Manual Check-out",
        checkOutNotes: checkOutNotes || null,
        isCheckOut: true
      };

      await attendanceMutation.mutateAsync(checkOutData);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.isAutoCheckout) {
      return <Badge variant="outline" className="text-orange-600">Auto Check-out</Badge>;
    }
    
    switch (record.status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>;
      case "incomplete":
        return <Badge variant="outline" className="text-red-600">Incomplete</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-500">Late</Badge>;
      case "remote":
        return <Badge className="bg-blue-500">Remote</Badge>;
      default:
        return <Badge variant="outline">{record.status}</Badge>;
    }
  };

  const canCheckIn = !userTodayAttendance?.checkIn;
  const canCheckOut = userTodayAttendance?.checkIn && !userTodayAttendance?.checkOut;

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Current Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-mono text-center py-4">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-center text-muted-foreground">
            {format(currentTime, 'EEEE, MMMM dd, yyyy')}
          </div>
        </CardContent>
      </Card>

      {/* Today's Attendance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Today's Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userTodayAttendance ? (
            <div className="space-y-4">
              {/* Check-in Status */}
              {userTodayAttendance.checkIn && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Checked In</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(userTodayAttendance.checkIn)} at {userTodayAttendance.checkInLocation}
                      </p>
                      {userTodayAttendance.checkInNotes && (
                        <p className="text-xs text-blue-600">{userTodayAttendance.checkInNotes}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(userTodayAttendance)}
                </div>
              )}

              {/* Check-out Status or Working Time */}
              {userTodayAttendance.checkOut ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Checked Out</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(userTodayAttendance.checkOut)} at {userTodayAttendance.checkOutLocation}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        Working Hours: {userTodayAttendance.workingHours.toFixed(2)}h
                        {userTodayAttendance.overtimeHours > 0 && (
                          <span className="text-orange-600 ml-2">
                            (Overtime: {userTodayAttendance.overtimeHours.toFixed(2)}h)
                          </span>
                        )}
                      </p>
                      {userTodayAttendance.isAutoCheckout && (
                        <p className="text-xs text-orange-600">
                          Automatically checked out at midnight
                        </p>
                      )}
                      {userTodayAttendance.checkOutNotes && (
                        <p className="text-xs text-blue-600">{userTodayAttendance.checkOutNotes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : userTodayAttendance.checkIn ? (
                <div className="flex items-center justify-between p-4 border-2 border-dashed rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Currently Working</p>
                      <p className="text-sm text-muted-foreground">
                        Working for {formatDistanceToNow(new Date(userTodayAttendance.checkIn))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance record for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in/Check-out Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canCheckIn && (
            <div className="space-y-3">
              <Label htmlFor="checkin-notes">Check-in Notes (Optional)</Label>
              <Textarea
                id="checkin-notes"
                placeholder="Add any notes for your check-in..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleCheckIn}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Checking In..." : "Check In"}
              </Button>
            </div>
          )}

          {canCheckOut && (
            <div className="space-y-3">
              <Label htmlFor="checkout-notes">Check-out Notes (Optional)</Label>
              <Textarea
                id="checkout-notes"
                placeholder="Add any notes for your check-out..."
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleCheckOut}
                disabled={isProcessing}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Checking Out..." : "Check Out"}
              </Button>
            </div>
          )}


        </CardContent>
      </Card>

      {/* Recent Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceHistory?.slice(0, 5).map((record) => (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{formatDate(record.date)}</p>
                    {getStatusBadge(record)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {record.checkIn && (
                      <p>Check-in: {formatTime(record.checkIn)}</p>
                    )}
                    {record.checkOut && (
                      <p>Check-out: {formatTime(record.checkOut)}</p>
                    )}
                    <p className="font-medium">
                      Working Hours: {record.workingHours.toFixed(2)}h
                      {record.overtimeHours > 0 && (
                        <span className="text-orange-600 ml-2">
                          (+{record.overtimeHours.toFixed(2)}h OT)
                        </span>
                      )}
                    </p>
                    {record.isAutoCheckout && (
                      <p className="text-orange-600 text-xs">Auto check-out at midnight</p>
                    )}
                    {record.adminNotes && (
                      <p className="text-red-600 text-xs">Admin: {record.adminNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {!attendanceHistory?.length && (
              <div className="text-center p-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No attendance history available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}