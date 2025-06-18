import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: string;
  onLocationSelect?: (locationName: string) => void;
  showMarker?: boolean;
  className?: string;
}

export default function LeafletMap({ 
  latitude, 
  longitude, 
  zoom = 15, 
  height = "300px",
  onLocationSelect,
  showMarker = true,
  className = ""
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([latitude, longitude], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add marker if requested
    if (showMarker) {
      const marker = L.marker([latitude, longitude]).addTo(map);
      
      // Reverse geocode to get location name
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
        .then(response => response.json())
        .then(data => {
          const locationName = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          marker.bindPopup(locationName).openPopup();
          
          if (onLocationSelect) {
            onLocationSelect(locationName);
          }
        })
        .catch(() => {
          const fallbackName = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          marker.bindPopup(fallbackName).openPopup();
          
          if (onLocationSelect) {
            onLocationSelect(fallbackName);
          }
        });
      
      markerRef.current = marker;
    }

    // Handle map clicks for location selection
    if (onLocationSelect) {
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        
        // Add new marker
        const newMarker = L.marker([lat, lng]).addTo(map);
        markerRef.current = newMarker;
        
        // Get location name
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          const locationName = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          
          newMarker.bindPopup(locationName).openPopup();
          onLocationSelect(locationName);
        } catch {
          const fallbackName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          newMarker.bindPopup(fallbackName).openPopup();
          onLocationSelect(fallbackName);
        }
      });
    }

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, zoom, showMarker, onLocationSelect]);

  return (
    <div 
      ref={mapRef} 
      style={{ height, width: '100%' }}
      className={`border rounded-lg overflow-hidden ${className}`}
    />
  );
}