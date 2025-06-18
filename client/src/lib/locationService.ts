// Location service for reverse geocoding and location name resolution
export interface LocationData {
  latitude: number;
  longitude: number;
  locationName?: string;
  accuracy?: number;
}

export async function getLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    // Use Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data.display_name) {
      // Parse and format the location name for better readability
      const parts = data.display_name.split(',');
      
      // Try to create a meaningful short name
      if (parts.length >= 3) {
        const building = parts[0]?.trim();
        const street = parts[1]?.trim();
        const area = parts[2]?.trim();
        
        // If building has a number, combine with street
        if (building && /\d/.test(building)) {
          return `${building}, ${area}`;
        } else if (street && area) {
          return `${street}, ${area}`;
        }
      }
      
      // Fallback to first 2-3 components
      return parts.slice(0, 3).join(', ').trim();
    }
    
    throw new Error('No location name found');
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    // Return formatted coordinates as fallback
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

export async function getCurrentLocationWithName(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        try {
          const locationName = await getLocationName(latitude, longitude);
          resolve({
            latitude,
            longitude,
            locationName,
            accuracy
          });
        } catch (error) {
          // Return coordinates if geocoding fails
          resolve({
            latitude,
            longitude,
            locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            accuracy
          });
        }
      },
      (error) => {
        reject(new Error(`Location access denied: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}