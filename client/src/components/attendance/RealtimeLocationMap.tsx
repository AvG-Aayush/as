import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, Clock } from 'lucide-react';

// Fix default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EmployeeLocation {
  userId: number;
  fullName: string;
  department: string;
  latitude: number;
  longitude: number;
  status: string;
  lastUpdate: string;
  accuracy?: number;
  checkInTime?: string;
  workingHours?: number;
}

interface RealtimeLocationMapProps {
  employees: EmployeeLocation[];
  height?: string;
  zoom?: number;
  className?: string;
  onEmployeeSelect?: (employee: EmployeeLocation) => void;
}

export default function RealtimeLocationMap({ 
  employees, 
  height = "400px",
  zoom = 12,
  className = "",
  onEmployeeSelect
}: RealtimeLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocation | null>(null);

  // Create custom icons for different statuses
  const createCustomIcon = (status: string) => {
    const color = status === 'present' ? '#10b981' : 
                  status === 'remote' ? '#3b82f6' : 
                  status === 'break' ? '#f59e0b' : '#6b7280';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 50%;
            border: 2px solid white;
            ${status === 'present' ? 'display: block;' : 'display: none;'}
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (employees.length === 0) {
      return [37.7749, -122.4194]; // Default to San Francisco
    }
    
    const avgLat = employees.reduce((sum, emp) => sum + emp.latitude, 0) / employees.length;
    const avgLng = employees.reduce((sum, emp) => sum + emp.longitude, 0) / employees.length;
    return [avgLat, avgLng];
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map if not exists
    if (!mapInstanceRef.current) {
      try {
        const center = getMapCenter();
        const map = L.map(mapRef.current, {
          preferCanvas: true,
          zoomControl: true,
          attributionControl: true
        }).setView(center, zoom);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // Small delay to ensure map is fully initialized
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
        return;
      }
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers safely
    Object.values(markersRef.current).forEach(marker => {
      try {
        if (marker && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (error) {
        console.warn('Error removing marker:', error);
      }
    });
    markersRef.current = {};

    // Add markers for each employee
    employees.forEach(employee => {
      try {
        const marker = L.marker(
          [employee.latitude, employee.longitude],
          { icon: createCustomIcon(employee.status) }
        );

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px; font-family: system-ui;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
              ${employee.fullName}
            </div>
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
              ${employee.department}
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${
                employee.status === 'present' ? '#10b981' : 
                employee.status === 'remote' ? '#3b82f6' : 
                employee.status === 'break' ? '#f59e0b' : '#6b7280'
              };"></span>
              <span style="font-size: 12px; text-transform: capitalize;">${employee.status}</span>
            </div>
            ${employee.checkInTime ? `
              <div style="font-size: 11px; color: #6b7280;">
                Check-in: ${new Date(employee.checkInTime).toLocaleTimeString()}
              </div>
            ` : ''}
            ${employee.workingHours ? `
              <div style="font-size: 11px; color: #6b7280;">
                Working: ${employee.workingHours.toFixed(1)}h
              </div>
            ` : ''}
            ${employee.accuracy ? `
              <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
                GPS Accuracy: ${employee.accuracy.toFixed(0)}m
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        // Handle marker click
        marker.on('click', () => {
          setSelectedEmployee(employee);
          if (onEmployeeSelect) {
            onEmployeeSelect(employee);
          }
        });

        marker.addTo(map);
        markersRef.current[employee.userId] = marker;
      } catch (error) {
        console.warn('Error adding marker for employee:', employee.fullName, error);
      }
    });

    // Adjust map view to fit all markers
    if (employees.length > 0 && Object.keys(markersRef.current).length > 0) {
      try {
        const group = new L.FeatureGroup(Object.values(markersRef.current));
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.1));
        }
      } catch (error) {
        console.warn('Error fitting bounds:', error);
      }
    }
  }, [employees, zoom, onEmployeeSelect]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear markers
      Object.values(markersRef.current).forEach(marker => {
        try {
          if (marker && mapInstanceRef.current && mapInstanceRef.current.hasLayer(marker)) {
            mapInstanceRef.current.removeLayer(marker);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      });
      markersRef.current = {};

      // Remove map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (employees.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No location data available</p>
              <p className="text-sm text-muted-foreground">
                Check in with GPS enabled to see locations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Statistics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{employees.length} Active Locations</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              {employees.filter(emp => emp.status === 'present').length} Present
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">
              {employees.filter(emp => emp.status === 'remote').length} Remote
            </span>
          </div>
        </div>
        
        {/* Status Legend */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Remote</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Break</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapRef} 
            style={{ height, width: '100%', minHeight: height }}
            className="rounded-lg overflow-hidden"
          />
        </CardContent>
      </Card>

      {/* Selected Employee Details */}
      {selectedEmployee && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{selectedEmployee.fullName}</h4>
                <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
              </div>
              <div className="text-right">
                <Badge 
                  variant={selectedEmployee.status === 'present' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {selectedEmployee.status}
                </Badge>
                {selectedEmployee.checkInTime && (
                  <p className="text-xs text-muted-foreground">
                    Checked in: {new Date(selectedEmployee.checkInTime).toLocaleTimeString()}
                  </p>
                )}
                {selectedEmployee.workingHours && (
                  <p className="text-xs text-muted-foreground">
                    Working: {selectedEmployee.workingHours.toFixed(1)} hours
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Location: {selectedEmployee.latitude.toFixed(6)}, {selectedEmployee.longitude.toFixed(6)}</p>
              {selectedEmployee.accuracy && (
                <p>GPS Accuracy: {selectedEmployee.accuracy.toFixed(0)} meters</p>
              )}
              <p>Last update: {new Date(selectedEmployee.lastUpdate).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}