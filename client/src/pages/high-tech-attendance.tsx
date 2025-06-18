import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2, Navigation, Smartphone, Wifi, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import { GPSService, GPSLocation } from "@/lib/gps-utils";
import { apiRequest } from "@/lib/queryClient";

export default function HighTechAttendancePage() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [isTestingGPS, setIsTestingGPS] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{ available: boolean; permission: string; message: string } | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check GPS availability on component mount
  useEffect(() => {
    const checkGPSStatus = async () => {
      const status = await GPSService.checkGPSAvailability();
      setGpsStatus(status);
    };
    checkGPSStatus();
  }, []);

  // Enhanced GPS function using the centralized service
  const getCurrentLocation = async (): Promise<GPSLocation> => {
    return GPSService.getCurrentLocation(true);
  };

  // Get device information
  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  };

  // Get today's attendance
  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance/today'],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      
      // Add authentication token
      const token = localStorage.getItem("hr-platform-session");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch('/api/attendance/today', {
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch attendance');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Get attendance history
  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['/api/attendance/history', user?.id],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      
      // Add authentication token
      const token = localStorage.getItem("hr-platform-session");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/attendance/history/${user?.id}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('CheckIn - Making API request with data:', data);
      try {
        const response = await apiRequest('POST', '/api/attendance/checkin', data);
        console.log('CheckIn - API response received:', response.status);
        return response.json();
      } catch (error) {
        console.error('CheckIn - API request failed:', error);
        throw error;
      }
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
      if (!todayAttendance?.id) {
        throw new Error('No active check-in found');
      }
      
      const response = await apiRequest('POST', `/api/attendance/checkout/${todayAttendance.id}`, data);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text();
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

  // Handle GPS check-in with enhanced timeout handling and fallback
  const handleGPSCheckIn = async () => {
    if (!user) return;
    
    setIsCheckingIn(true);
    setLocationError(null);

    try {
      // Show loading state with timeout indication
      toast({
        title: "Getting GPS Location",
        description: "Please wait while we acquire your location (up to 20 seconds)...",
        variant: "default"
      });

      // Attempt GPS location with improved service
      const location = await getCurrentLocation();
      setGpsLocation(location);

      // Clear any previous errors since GPS worked
      setLocationError(null);

      // Get device info
      const deviceInfo = getDeviceInfo();

      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude,
        checkInLocation: "GPS Location",
        checkInAddress: location.address,
        checkInAccuracy: location.accuracy,
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        checkInNotes: checkInNotes || null,
        isGpsVerified: true,
        isLocationValid: true,
        requiresApproval: false
      };

      await checkInMutation.mutateAsync(checkInData);
      
    } catch (error: any) {
      // GPS failed, show specific error and fall back to manual check-in
      setLocationError(error.message);
      
      toast({
        title: "GPS Error",
        description: `${error.message}. Proceeding with manual entry (requires approval).`,
        variant: "default"
      });

      // Proceed with manual check-in automatically
      const deviceInfo = getDeviceInfo();
      const checkInData = {
        checkIn: new Date().toISOString(),
        checkInLocation: "Manual Check-in",
        checkInAddress: "Manual entry - GPS unavailable",
        deviceInfo: JSON.stringify(deviceInfo),
        userAgent: navigator.userAgent,
        status: "present",
        checkInNotes: checkInNotes ? `${checkInNotes} [GPS Error: ${error.message}]` : `GPS Error: ${error.message}`,
        isGpsVerified: false,
        isLocationValid: false,
        requiresApproval: true
      };

      try {
        await checkInMutation.mutateAsync(checkInData);
      } catch (manualError: any) {
        setIsCheckingIn(false);
        toast({
          title: "Check-in Failed",
          description: manualError.message,
          variant: "destructive"
        });
      }
    }
  };

  // Handle manual check-in
  const handleManualCheckIn = async () => {
    if (!user) return;
    
    setIsCheckingIn(true);
    setLocationError(null);

    const deviceInfo = getDeviceInfo();
    const checkInData = {
      checkIn: new Date().toISOString(),
      checkInLocation: "Manual Check-in",
      checkInAddress: "Manual entry - no GPS",
      deviceInfo: JSON.stringify(deviceInfo),
      userAgent: navigator.userAgent,
      status: "present",
      checkInNotes: checkInNotes || null,
      isGpsVerified: false,
      isLocationValid: false,
      requiresApproval: true
    };

    try {
      await checkInMutation.mutateAsync(checkInData);
    } catch (error: any) {
      setIsCheckingIn(false);
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle GPS check-out with automatic fallback
  const handleGPSCheckOut = async () => {
    if (!user || !todayAttendance) return;
    
    setIsCheckingOut(true);
    setLocationError(null);
    
    try {
      // Attempt GPS location first
      const location = await getCurrentLocation();
      setGpsLocation(location);
      
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutLocation: "GPS Check-out",
        checkOutAddress: location.address,
        checkOutAccuracy: location.accuracy,
        checkOutNotes: checkOutNotes || null
      };

      await checkOutMutation.mutateAsync(checkOutData);
      
    } catch (error: any) {
      // GPS failed, fall back to manual check-out
      setLocationError(error.message);
      
      toast({
        title: "GPS Unavailable",
        description: "Falling back to manual check-out.",
        variant: "default"
      });

      // Proceed with manual check-out
      const checkOutData = {
        checkOut: new Date().toISOString(),
        checkOutLocation: "Manual Check-out",
        checkOutAddress: "Manual entry - GPS unavailable",
        checkOutNotes: checkOutNotes ? `${checkOutNotes} (GPS failed: ${error.message})` : `GPS failed: ${error.message}`
      };

      try {
        await checkOutMutation.mutateAsync(checkOutData);
      } catch (manualError: any) {
        setIsCheckingOut(false);
        toast({
          title: "Check-out Failed",
          description: manualError.message,
          variant: "destructive"
        });
      }
    }
  };

  // Handle manual check-out
  const handleManualCheckOut = async () => {
    if (!user || !todayAttendance) return;
    
    setIsCheckingOut(true);
    
    const checkOutData = {
      checkOut: new Date().toISOString(),
      checkOutLocation: "Manual Check-out",
      checkOutAddress: "Manual entry - no GPS",
      checkOutNotes: checkOutNotes || null
    };

    try {
      await checkOutMutation.mutateAsync(checkOutData);
    } catch (error: any) {
      setIsCheckingOut(false);
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Test GPS functionality
  const testGPS = async () => {
    setIsTestingGPS(true);
    setLocationError(null);
    setGpsLocation(null);

    try {
      const location = await getCurrentLocation();
      setGpsLocation(location);
      toast({
        title: "GPS Test Successful",
        description: `Location acquired: ${location.address}`,
      });
    } catch (error: any) {
      setLocationError(error.message);
      toast({
        title: "GPS Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingGPS(false);
    }
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
  const getStatusBadge = (status: string, isLocationValid?: boolean, requiresApproval?: boolean) => {
    if (requiresApproval) {
      return <Badge variant="outline" className="text-orange-600">Pending Approval</Badge>;
    }
    
    if (isLocationValid === false) {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checkin">Check-in/Out</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                            {formatTime(todayAttendance.checkOut)} at {todayAttendance.checkOutLocation || 'Unknown'}
                          </p>
                          <p className="text-xs text-green-600 font-medium">
                            Working Hours: {(todayAttendance.workingHours || 0).toFixed(2)}h
                            {(todayAttendance.overtimeHours || 0) > 0 && (
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
                              {todayAttendance.checkIn && `Working for ${formatDistanceToNow(new Date(todayAttendance.checkIn))}`}
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
                          onClick={handleGPSCheckOut}
                          disabled={isCheckingOut}
                          className="w-full"
                          size="lg"
                        >
                          {isCheckingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Getting GPS & Checking Out...
                            </>
                          ) : (
                            <>
                              <Navigation className="mr-2 h-4 w-4" />
                              Check Out
                            </>
                          )}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          Automatically attempts GPS location, falls back to manual if GPS fails.
                        </p>
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
                      onClick={handleGPSCheckIn}
                      disabled={isCheckingIn}
                      className="w-full"
                      size="lg"
                    >
                      {isCheckingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Getting GPS & Checking In...
                        </>
                      ) : (
                        <>
                          <Navigation className="mr-2 h-4 w-4" />
                          Check In
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Automatically attempts GPS location, falls back to manual if GPS fails.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GPS Testing & Location Info */}
          <Card>
            <CardHeader>
              <CardTitle>GPS Testing & System Information</CardTitle>
              <CardDescription>Test GPS functionality and view system details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* GPS Test Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">GPS Test</h4>
                  <Button
                    onClick={testGPS}
                    disabled={isTestingGPS}
                    variant="outline"
                    size="sm"
                  >
                    {isTestingGPS ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing GPS...
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-2 h-4 w-4" />
                        Test GPS
                      </>
                    )}
                  </Button>
                </div>
                
                {locationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      GPS Error: {locationError}
                      <br />
                      <strong>Solutions:</strong>
                      <ul className="mt-2 list-disc list-inside text-sm">
                        <li>Enable location permissions in browser settings</li>
                        <li>Check if location services are enabled on device</li>
                        <li>Try refreshing the page and allow location access</li>
                        <li>Ensure you're using HTTPS or localhost</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {gpsLocation && (
                  <div className="space-y-3">
                    <Alert>
                      <Navigation className="h-4 w-4" />
                      <AlertDescription>
                        <strong>GPS Location Successfully Acquired!</strong>
                        <div className="mt-2 space-y-1 text-sm">
                          <div><strong>Address:</strong> {gpsLocation.address}</div>
                          <div><strong>Coordinates:</strong> {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}</div>
                          <div><strong>Accuracy:</strong> ±{gpsLocation.accuracy?.toFixed(0)}m</div>
                          {gpsLocation.altitude && <div><strong>Altitude:</strong> {gpsLocation.altitude.toFixed(0)}m</div>}
                          {gpsLocation.speed && <div><strong>Speed:</strong> {gpsLocation.speed.toFixed(1)} m/s</div>}
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    {/* Simple Map View */}
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsLocation.longitude - 0.01},${gpsLocation.latitude - 0.01},${gpsLocation.longitude + 0.01},${gpsLocation.latitude + 0.01}&layer=mapnik&marker=${gpsLocation.latitude},${gpsLocation.longitude}`}
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        title="Current Location Map"
                      ></iframe>
                      <div className="p-2 bg-muted text-xs text-center">
                        <a 
                          href={`https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View in Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Device Info</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Platform:</strong> {navigator.platform}</div>
                    <div><strong>Language:</strong> {navigator.language}</div>
                    <div><strong>Screen:</strong> {screen.width}×{screen.height}</div>
                    <div><strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Connection & GPS Status</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Protocol:</strong> {location.protocol}</div>
                    <div><strong>GPS Support:</strong> {navigator.geolocation ? '✅ Available' : '❌ Not Available'}</div>
                    <div><strong>Permissions API:</strong> {navigator.permissions ? '✅ Available' : '❌ Not Available'}</div>
                    <div><strong>HTTPS:</strong> {location.protocol === 'https:' || location.hostname === 'localhost' ? '✅ Secure' : '❌ Insecure'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Helper */}
          <Card>
            <CardHeader>
              <CardTitle>GPS Permission Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Chrome/Edge:</strong> Click the location icon in the address bar, select "Always allow" for location access.
                </div>
                <div>
                  <strong>Firefox:</strong> Click the shield icon, then permissions, and allow location access.
                </div>
                <div>
                  <strong>Safari:</strong> Go to Settings → Privacy & Security → Location Services → Safari → Allow.
                </div>
                <div>
                  <strong>Mobile:</strong> Enable location services in device settings, then allow browser location access.
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <strong>Note:</strong> GPS requires location permissions and works best with a clear view of the sky. Indoor accuracy may be lower.
                </div>
              </div>
            </CardContent>
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
                {Array.isArray(attendanceHistory) && attendanceHistory.map((record: any) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatDate(record.date)}</span>
                        {getStatusBadge(record.status, record.isLocationValid, record.requiresApproval)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(record.workingHours || 0).toFixed(2)}h worked
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
                
                {!Array.isArray(attendanceHistory) || attendanceHistory.length === 0 && (
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
                      {Array.isArray(attendanceHistory) ? attendanceHistory.filter((r: any) => r.status === 'present').length : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Days Present</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Array.isArray(attendanceHistory) ? attendanceHistory.reduce((sum: number, r: any) => sum + (r.workingHours || 0), 0).toFixed(1) : 0}h
                    </div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Array.isArray(attendanceHistory) ? attendanceHistory.filter((r: any) => r.isGpsVerified).length : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">GPS Verified</div>
                  </div>
                </div>

                {/* Location Compliance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Location Compliance</span>
                    <span className="text-sm text-muted-foreground">
                      {Array.isArray(attendanceHistory) && attendanceHistory.length > 0 ? 
                        Math.round((attendanceHistory.filter((r: any) => r.isLocationValid).length / attendanceHistory.length) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={Array.isArray(attendanceHistory) && attendanceHistory.length > 0 ? 
                      (attendanceHistory.filter((r: any) => r.isLocationValid).length / attendanceHistory.length) * 100 : 0
                    } 
                    className="h-2" 
                  />
                </div>

                {/* GPS Verification Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">GPS Verification Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {Array.isArray(attendanceHistory) && attendanceHistory.length > 0 ? 
                        Math.round((attendanceHistory.filter((r: any) => r.isGpsVerified).length / attendanceHistory.length) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={Array.isArray(attendanceHistory) && attendanceHistory.length > 0 ? 
                      (attendanceHistory.filter((r: any) => r.isGpsVerified).length / attendanceHistory.length) * 100 : 0
                    } 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}