import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2, Calendar, Users, BarChart3, Navigation, Smartphone, Wifi, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn?: string;
  checkOut?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInLocation?: string;
  checkInAddress?: string;
  checkInAccuracy?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutLocation?: string;
  checkOutAddress?: string;
  checkOutAccuracy?: number;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  workingHours: number;
  overtimeHours: number;
  breakDuration: number;
  checkInNotes?: string;
  checkOutNotes?: string;
  isGpsVerified: boolean;
  isLocationValid: boolean;
  date: string;
  createdAt: string;
}

interface WorkLocation {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  isRemoteAllowed: boolean;
}

export default function AttendanceSystem() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current location
  const getCurrentLocation = (): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=en`
            );
            const data = await response.json();
            location.address = data.displayName || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
          } catch (error) {
            location.address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
          }

          resolve(location);
        },
        (error) => {
          let message = "Failed to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  };

  // Get device information
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const cookieEnabled = navigator.cookieEnabled;
    const onLine = navigator.onLine;
    
    return {
      userAgent,
      platform,
      language,
      cookieEnabled,
      onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  };

  // Get today's attendance
  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery<AttendanceRecord>({
    queryKey: ['/api/attendance/today'],
    enabled: !!user,
  });

  // Get work locations
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ['/api/work-locations'],
    enabled: !!user,
  });

  // Get attendance history
  const { data: attendanceHistory = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/history', user?.id],
    enabled: !!user,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/attendance/checkin', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in Successful",
        description: "Your attendance has been recorded with GPS location"
      });
      setIsCheckingIn(false);
      setCheckInNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to record check-in",
        variant: "destructive"
      });
      setIsCheckingIn(false);
    }
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/attendance/checkout/${todayAttendance?.id}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Check-out Successful",
        description: "Your work hours have been calculated"
      });
      setIsCheckingOut(false);
      setCheckOutNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out Failed",
        description: error.message || "Failed to record check-out",
        variant: "destructive"
      });
      setIsCheckingOut(false);
    }
  });

  // Handle check-in
  const handleCheckIn = async () => {
    if (!user) return;
    
    setIsCheckingIn(true);
    setLocationError(null);

    try {
      // Get GPS location
      const location = await getCurrentLocation();
      setGpsLocation(location);

      // Get device info
      const deviceInfo = getDeviceInfo();

      // Validate location against work locations
      const validLocation = workLocations.find(wl => {
        const distance = calculateDistance(
          location.latitude, 
          location.longitude, 
          wl.latitude, 
          wl.longitude
        );
        return distance <= wl.radius && wl.isActive;
      });

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
        checkInNotes: checkInNotes || null,
        isGpsVerified: true,
        isLocationValid: !!validLocation,
        requiresApproval: !validLocation && !workLocations.some(wl => wl.isRemoteAllowed)
      };

      await checkInMutation.mutateAsync(checkInData);
      
    } catch (error: any) {
      setLocationError(error.message);
      
      // Allow manual check-in without GPS
      const deviceInfo = getDeviceInfo();
      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLocation: "Manual Check-in",
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        checkInNotes: checkInNotes || null,
        isGpsVerified: false,
        isLocationValid: false,
        requiresApproval: true
      };

      await checkInMutation.mutateAsync(checkInData);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!user || !todayAttendance) return;
    
    setIsCheckingOut(true);
    
    try {
      // Get GPS location for check-out
      const location = await getCurrentLocation();
      
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutLocation: "Check-out Location",
        checkOutAddress: location.address,
        checkOutAccuracy: location.accuracy,
        checkOutNotes: checkOutNotes || null
      };

      await checkOutMutation.mutateAsync(checkOutData);
      
    } catch (error: any) {
      // Allow manual check-out without GPS
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLocation: "Manual Check-out",
        checkOutNotes: checkOutNotes || null
      };

      await checkOutMutation.mutateAsync(checkOutData);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Format time
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm:ss');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Get attendance status badge
  const getStatusBadge = (status: string, isLocationValid: boolean, requiresApproval: boolean) => {
    if (requiresApproval) {
      return <Badge variant="outline" className="text-orange-600">Pending Approval</Badge>;
    }
    
    if (!isLocationValid) {
      return <Badge variant="outline" className="text-red-600">Invalid Location</Badge>;
    }

    switch (status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>;
      case "remote":
        return <Badge className="bg-blue-500">Remote</Badge>;
      case "late":
        return <Badge className="bg-yellow-500">Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">High-Tech Attendance System</h1>
          <p className="text-muted-foreground">GPS-enabled manual check-in/check-out with comprehensive tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <Navigation className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-muted-foreground">GPS Tracking Active</span>
        </div>
      </div>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checkin">Check-in/Out</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
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
                          {formatTime(todayAttendance.checkIn)} at {todayAttendance.checkInLocation}
                        </p>
                        {todayAttendance.checkInAddress && (
                          <p className="text-xs text-muted-foreground">
                            📍 {todayAttendance.checkInAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(todayAttendance.status, todayAttendance.isLocationValid, todayAttendance.requiresApproval)}
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
                            {formatTime(todayAttendance.checkOut)} at {todayAttendance.checkOutLocation}
                          </p>
                          <p className="text-xs text-green-600 font-medium">
                            Working Hours: {todayAttendance.workingHours.toFixed(2)}h
                            {todayAttendance.overtimeHours > 0 && (
                              <span className="text-orange-600 ml-2">
                                (Overtime: {todayAttendance.overtimeHours.toFixed(2)}h)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border-2 border-dashed rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="font-medium">Ready to Check Out</p>
                            <p className="text-sm text-muted-foreground">
                              Working for {formatDistanceToNow(new Date(todayAttendance.checkIn!))}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="checkOutNotes">Check-out Notes (Optional)</Label>
                        <Textarea
                          id="checkOutNotes"
                          placeholder="Add any notes about your work day..."
                          value={checkOutNotes}
                          onChange={(e) => setCheckOutNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button
                          onClick={handleCheckOut}
                          disabled={isCheckingOut}
                          className="w-full"
                          size="lg"
                        >
                          {isCheckingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking Out...
                            </>
                          ) : (
                            <>
                              <Clock className="mr-2 h-4 w-4" />
                              Check Out
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Ready to Start Your Day</h3>
                    <p className="text-muted-foreground mb-6">
                      Check in with GPS location tracking and device verification
                    </p>
                  </div>

                  {locationError && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {locationError}. You can still check in manually, but it will require approval.
                      </AlertDescription>
                    </Alert>
                  )}

                  {gpsLocation && (
                    <Alert>
                      <Navigation className="h-4 w-4" />
                      <AlertDescription>
                        GPS location acquired: {gpsLocation.address} (±{gpsLocation.accuracy.toFixed(0)}m accuracy)
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="checkInNotes">Check-in Notes (Optional)</Label>
                    <Textarea
                      id="checkInNotes"
                      placeholder="Add any notes about your arrival..."
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                      className="w-full"
                      size="lg"
                    >
                      {isCheckingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Check In with GPS
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device & Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Information</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLocationDetails(!showLocationDetails)}
                >
                  {showLocationDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {showLocationDetails && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Device Info</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {navigator.platform} - {navigator.language}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Connection</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {navigator.onLine ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                {gpsLocation && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">GPS Coordinates</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records with detailed tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceHistory.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatDate(record.date)}</span>
                        {getStatusBadge(record.status, record.isLocationValid, record.requiresApproval)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {record.workingHours.toFixed(2)}h worked
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-green-600">Check-in</p>
                        <p>{record.checkIn ? formatTime(record.checkIn) : 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          📍 {record.checkInLocation || 'Unknown'}
                        </p>
                        {record.isGpsVerified && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <Navigation className="h-3 w-3 mr-1" />
                            GPS Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium text-blue-600">Check-out</p>
                        <p>{record.checkOut ? formatTime(record.checkOut) : 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          📍 {record.checkOutLocation || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {(record.checkInNotes || record.checkOutNotes) && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                        {record.checkInNotes && (
                          <p className="text-xs text-muted-foreground">
                            Check-in: {record.checkInNotes}
                          </p>
                        )}
                        {record.checkOutNotes && (
                          <p className="text-xs text-muted-foreground">
                            Check-out: {record.checkOutNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {attendanceHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No attendance records found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Analytics</CardTitle>
              <CardDescription>Your attendance patterns and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceHistory.filter(r => r.status === 'present').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Days Present</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendanceHistory.reduce((sum, r) => sum + r.workingHours, 0).toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {attendanceHistory.filter(r => r.isGpsVerified).length}
                    </div>
                    <div className="text-sm text-muted-foreground">GPS Verified</div>
                  </div>
                </div>

                {/* Location Compliance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Location Compliance</span>
                    <span className="text-sm text-muted-foreground">
                      {attendanceHistory.length > 0 ? 
                        Math.round((attendanceHistory.filter(r => r.isLocationValid).length / attendanceHistory.length) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={attendanceHistory.length > 0 ? 
                      (attendanceHistory.filter(r => r.isLocationValid).length / attendanceHistory.length) * 100 : 0
                    } 
                    className="h-2" 
                  />
                </div>

                {/* GPS Verification Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">GPS Verification Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {attendanceHistory.length > 0 ? 
                        Math.round((attendanceHistory.filter(r => r.isGpsVerified).length / attendanceHistory.length) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={attendanceHistory.length > 0 ? 
                      (attendanceHistory.filter(r => r.isGpsVerified).length / attendanceHistory.length) * 100 : 0
                    } 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Work Locations</CardTitle>
              <CardDescription>Authorized work locations for GPS verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workLocations.map((location) => (
                  <div key={location.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{location.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        {location.isActive && (
                          <Badge className="bg-green-500">Active</Badge>
                        )}
                        {location.isRemoteAllowed && (
                          <Badge variant="outline">Remote OK</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                      <span>📏 {location.radius}m radius</span>
                    </div>
                  </div>
                ))}
                
                {workLocations.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No work locations configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}