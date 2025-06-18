import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Activity, RefreshCw, Wifi, Navigation } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import SimpleLocationMap from "@/components/attendance/SimpleLocationMap";
import { UnifiedAttendanceButton } from "@/components/attendance/UnifiedAttendanceButton";

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
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  isGpsVerified?: boolean;
  isLocationValid?: boolean;
  requiresApproval?: boolean;
}

export default function RealtimeAttendanceTracker() {
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentWorkingTime, setCurrentWorkingTime] = useState("00:00:00");
  
  const { user } = useAuth();

  // Get today's attendance
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery<AttendanceRecord>({
    queryKey: ['/api/attendance/today'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("GPS is not supported on this device");
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

        setCurrentLocation(location);
        setLocationError(null);
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
        setLocationError(errorMessage);
      },
      options
    );
  };

  // Calculate working time
  useEffect(() => {
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      const interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkIn!);
        const now = new Date();
        const diffMs = now.getTime() - checkInTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setCurrentWorkingTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCurrentWorkingTime("00:00:00");
    }
  }, [todayAttendance]);

  // Auto-get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Attendance Tracker</h1>
          <p className="text-muted-foreground">Live GPS tracking with automatic location updates</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <Label htmlFor="auto-refresh">Auto Refresh</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendance Control */}
        <div className="lg:col-span-2 space-y-6">
          <UnifiedAttendanceButton />

          {/* Real-time Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">Currently Working</p>
                      <p className="text-sm text-muted-foreground">
                        Since {format(new Date(todayAttendance.checkIn), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-green-600">{currentWorkingTime}</p>
                    <p className="text-sm text-muted-foreground">Working Time</p>
                  </div>
                </div>
              )}

              {todayAttendance?.checkOut && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Work Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {todayAttendance.workingHours?.toFixed(2)}h worked today
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500">Completed</Badge>
                </div>
              )}

              {!todayAttendance?.checkIn && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Not Checked In</p>
                      <p className="text-sm text-muted-foreground">Ready to start your day</p>
                    </div>
                  </div>
                  <Badge variant="outline">Offline</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Display */}
          {currentLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Current Location
                </CardTitle>
                <CardDescription>Real-time GPS tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Location Detected</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{currentLocation.address}</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</div>
                    <div>Accuracy: ±{Math.round(currentLocation.accuracy)}m</div>
                    <div>Last updated: {format(new Date(), 'HH:mm:ss')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* GPS Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                GPS Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">GPS Signal</span>
                <Badge variant={currentLocation ? "default" : "destructive"}>
                  {currentLocation ? "Active" : "Searching..."}
                </Badge>
              </div>
              
              {currentLocation && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy</span>
                    <span className="text-sm font-medium">±{Math.round(currentLocation.accuracy)}m</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Location:</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {currentLocation.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                </>
              )}

              {locationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{locationError}</p>
                </div>
              )}

              <Button 
                onClick={getCurrentLocation} 
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Location
              </Button>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Server</span>
                <Badge className="bg-green-500">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Refresh</span>
                <Badge variant={autoRefresh ? "default" : "outline"}>
                  {autoRefresh ? "On" : "Off"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Update</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(), 'HH:mm:ss')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Status</span>
                <Badge variant={todayAttendance?.status === 'present' ? 'default' : 'outline'}>
                  {todayAttendance?.status || 'Not Started'}
                </Badge>
              </div>
              
              {todayAttendance?.checkIn && (
                <div className="flex justify-between">
                  <span className="text-sm">Check-in</span>
                  <span className="text-sm font-medium">
                    {format(new Date(todayAttendance.checkIn), 'HH:mm')}
                  </span>
                </div>
              )}
              
              {todayAttendance?.checkOut && (
                <div className="flex justify-between">
                  <span className="text-sm">Check-out</span>
                  <span className="text-sm font-medium">
                    {format(new Date(todayAttendance.checkOut), 'HH:mm')}
                  </span>
                </div>
              )}
              
              {todayAttendance?.workingHours !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm">Hours Worked</span>
                  <span className="text-sm font-medium">
                    {todayAttendance.workingHours.toFixed(2)}h
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}