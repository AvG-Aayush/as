import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: string;
  workingHours: number;
  overtimeHours: number;
  isLocationValid: boolean;
  requiresApproval: boolean;
  checkInNotes: string | null;
  checkOutNotes: string | null;
  date: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface WorkLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  isRemoteAllowed: boolean;
}

export function UnifiedAttendanceButton() {
  const [notes, setNotes] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get today's attendance with more frequent updates
  const { data: attendanceResponse, isLoading: isLoadingAttendance } = useQuery<AttendanceRecord | AttendanceRecord[] | null>({
    queryKey: ['/api/attendance/today'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch
  });

  // Handle both array and single object responses
  const todayAttendance = Array.isArray(attendanceResponse) 
    ? attendanceResponse[0] || null 
    : attendanceResponse;

  // Get work locations
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ['/api/work-locations'],
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/attendance/checkin', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Check-in Successful",
        description: "You have been checked in successfully",
      });
      // Immediately update the cache with the new attendance data
      queryClient.setQueryData(['/api/attendance/today'], data);
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      setNotes("");
      setIsProcessing(false);
      setLocationError(null);
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
      setIsGettingLocation(false);
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async ({ attendanceId, data }: { attendanceId: number; data: any }) => {
      const response = await apiRequest('POST', `/api/attendance/checkout/${attendanceId}`, data);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text();
    },
    onSuccess: (data) => {
      toast({
        title: "Check-out Successful",
        description: "You have been checked out successfully",
      });
      // Immediately update the cache with the updated attendance data
      queryClient.setQueryData(['/api/attendance/today'], data);
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      setNotes("");
      setIsProcessing(false);
      setLocationError(null);
    },
    onError: (error: any) => {
      toast({
        title: "Check-out Failed",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
      setIsGettingLocation(false);
    },
  });

  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = "Unable to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const validateLocation = (location: LocationData): WorkLocation | null => {
    return workLocations.find(workLocation => {
      if (!workLocation.isActive) return false;
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        workLocation.latitude,
        workLocation.longitude
      );
      
      return distance <= workLocation.radius;
    }) || null;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };

  const handleCheckIn = async () => {
    if (isProcessing || checkInMutation.isPending) return;
    
    setIsProcessing(true);
    setLocationError(null);
    setIsGettingLocation(true);

    try {
      const location = await getCurrentLocation();
      setIsGettingLocation(false);
      
      const validLocation = validateLocation(location);
      const deviceInfo = getDeviceInfo();

      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude,
        checkInLocation: validLocation?.name || "Unknown Location",
        checkInAddress: location.address,
        checkInAccuracy: location.accuracy,
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: validLocation ? "present" : "remote",
        checkInNotes: notes || null,
        isGpsVerified: true,
        isLocationValid: !!validLocation,
        requiresApproval: !validLocation && !workLocations.some(wl => wl.isRemoteAllowed)
      };

      await checkInMutation.mutateAsync(checkInData);
      
    } catch (error: any) {
      setIsGettingLocation(false);
      setLocationError(error.message);
      
      // Allow manual check-in without GPS
      const deviceInfo = getDeviceInfo();
      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLocation: "Manual Check-in",
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        checkInNotes: notes || null,
        isGpsVerified: false,
        isLocationValid: false,
        requiresApproval: true
      };

      try {
        await checkInMutation.mutateAsync(checkInData);
      } catch (submitError: any) {
        setIsProcessing(false);
        toast({
          title: "Check-in Failed",
          description: submitError.message || "Unable to process check-in",
          variant: "destructive",
        });
      }
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance?.id || isProcessing || checkOutMutation.isPending) return;
    
    setIsProcessing(true);
    setLocationError(null);
    setIsGettingLocation(true);

    try {
      const location = await getCurrentLocation();
      setIsGettingLocation(false);
      
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutLocation: "GPS Location",
        checkOutAccuracy: location.accuracy,
        checkOutNotes: notes || null,
      };

      await checkOutMutation.mutateAsync({ 
        attendanceId: todayAttendance.id, 
        data: checkOutData 
      });
      
    } catch (error: any) {
      setIsGettingLocation(false);
      setLocationError(error.message);
      
      // Allow manual check-out without GPS
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLocation: "Manual Check-out",
        checkOutNotes: notes || null,
      };

      try {
        await checkOutMutation.mutateAsync({ 
          attendanceId: todayAttendance.id, 
          data: checkOutData 
        });
      } catch (submitError: any) {
        setIsProcessing(false);
        toast({
          title: "Check-out Failed",
          description: submitError.message || "Unable to process check-out",
          variant: "destructive",
        });
      }
    }
  };

  // Determine current state with proper state management
  const getAttendanceState = () => {
    if (isLoadingAttendance) return "loading";
    
    // If no attendance record exists for today, show check-in
    if (!todayAttendance) return "not_checked_in";
    
    // Check for check-in and check-out status more carefully
    const hasCheckIn = todayAttendance.checkIn !== null && todayAttendance.checkIn !== undefined;
    const hasCheckOut = todayAttendance.checkOut !== null && todayAttendance.checkOut !== undefined;
    
    // If check-in exists but no check-out, show check-out button
    if (hasCheckIn && !hasCheckOut) return "checked_in";
    
    // If both check-in and check-out exist, show completed state
    if (hasCheckIn && hasCheckOut) return "checked_out";
    
    // Fallback to not checked in
    return "not_checked_in";
  };

  // Reset states when component mounts or attendance changes
  useEffect(() => {
    if (!checkInMutation.isPending && !checkOutMutation.isPending) {
      setIsProcessing(false);
      setIsGettingLocation(false);
    }
  }, [todayAttendance, checkInMutation.isPending, checkOutMutation.isPending]);

  const attendanceState = getAttendanceState();
  const isButtonDisabled = isProcessing || checkInMutation.isPending || checkOutMutation.isPending || isGettingLocation;

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const getStatusBadge = (status: string, isLocationValid: boolean, requiresApproval: boolean) => {
    if (requiresApproval) {
      return <Badge variant="outline" className="text-orange-600">Pending Approval</Badge>;
    }
    
    if (!isLocationValid) {
      return <Badge variant="outline" className="text-red-600">Remote Work</Badge>;
    }

    switch (status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>;
      case "remote":
        return <Badge className="bg-blue-500">Remote</Badge>;
      case "completed":
        return <Badge className="bg-gray-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingAttendance) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading attendance status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {attendanceState === "checked_in" && todayAttendance && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Checked In</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(todayAttendance.checkIn!)} at {todayAttendance.checkInLocation}
                  </p>
                </div>
              </div>
              {getStatusBadge(todayAttendance.status, todayAttendance.isLocationValid, todayAttendance.requiresApproval)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Working for {formatDistanceToNow(new Date(todayAttendance.checkIn!))}
              </span>
            </div>
          </div>
        )}

        {attendanceState === "checked_out" && todayAttendance && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <p className="font-medium">Work Completed for Today</p>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Check-in: {formatTime(todayAttendance.checkIn!)} at {todayAttendance.checkInLocation}</p>
                <p>Check-out: {formatTime(todayAttendance.checkOut!)} at {todayAttendance.checkOutLocation}</p>
                <p className="font-medium text-green-600">
                  Working Hours: {todayAttendance.workingHours.toFixed(2)}h
                  {todayAttendance.overtimeHours > 0 && (
                    <span className="text-orange-600 ml-2">
                      (Overtime: {todayAttendance.overtimeHours.toFixed(2)}h)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your attendance for today is complete. Check-in will be available tomorrow.
              </p>
            </div>
          </div>
        )}

        {/* Notes Input */}
        {attendanceState !== "checked_out" && (
          <div className="space-y-2">
            <Label htmlFor="notes">
              {attendanceState === "not_checked_in" ? "Check-in Notes" : "Check-out Notes"} (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder={`Add ${attendanceState === "not_checked_in" ? "check-in" : "check-out"} notes...`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isButtonDisabled}
              rows={2}
            />
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{locationError}</p>
          </div>
        )}

        {/* Action Button */}
        {attendanceState === "not_checked_in" && (
          <Button
            onClick={handleCheckIn}
            disabled={isButtonDisabled}
            className="w-full"
            size="lg"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Getting Location...
              </>
            ) : checkInMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking In...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Check In
              </>
            )}
          </Button>
        )}

        {attendanceState === "checked_in" && (
          <Button
            onClick={handleCheckOut}
            disabled={isButtonDisabled}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Getting Location...
              </>
            ) : checkOutMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking Out...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Check Out
              </>
            )}
          </Button>
        )}

        {/* Today's Summary */}
        <div className="text-center text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </CardContent>
    </Card>
  );
}