import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SimpleLocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  height?: string;
  zoom?: number;
}

export default function SimpleLocationMap({ 
  latitude, 
  longitude, 
  accuracy = 50,
  address = "Current Location",
  height = "300px",
  zoom = 15
}: SimpleLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([latitude, longitude], zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    
    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add current location marker
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindPopup(`
      <div>
        <strong>Current Location</strong><br/>
        ${address}<br/>
        <small>Accuracy: ±${Math.round(accuracy)}m</small>
      </div>
    `);

    // Add accuracy circle
    L.circle([latitude, longitude], {
      color: 'blue',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      radius: accuracy
    }).addTo(map);

    // Center map on location
    map.setView([latitude, longitude], zoom);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, accuracy, address, zoom]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>{address}</span>
      </div>
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-lg border overflow-hidden"
      />
      <div className="text-xs text-muted-foreground">
        Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)} (±{Math.round(accuracy)}m)
      </div>
    </div>
  );
}