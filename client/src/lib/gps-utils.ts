export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  address: string;
}

export interface GPSError {
  code: number;
  message: string;
  canRetry: boolean;
}

export class GPSService {
  private static maxAttempts = 3;
  
  static async getCurrentLocation(enableRetry: boolean = true): Promise<GPSLocation> {
    console.log('GPS Service - Starting location request, enableRetry:', enableRetry);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('GPS Service - Geolocation not supported');
        reject(this.createError("GPS is not supported on this device", false));
        return;
      }

      // Check HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.error('GPS Service - HTTPS required');
        reject(this.createError("GPS requires HTTPS connection for security", false));
        return;
      }

      let attempts = 0;
      
      const attemptLocation = () => {
        attempts++;
        
        const options: PositionOptions = {
          enableHighAccuracy: true
        };

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const location = await this.processPosition(position);
              resolve(location);
            } catch (error) {
              reject(this.createError("Failed to process GPS data", false));
            }
          },
          (error) => {
            const gpsError = this.handlePositionError(error, attempts < this.maxAttempts && enableRetry);
            
            if (gpsError.canRetry && attempts < this.maxAttempts) {
              console.warn(`GPS attempt ${attempts} failed, retrying immediately...`);
              attemptLocation(); // Immediate retry without delay
            } else {
              reject(gpsError);
            }
          },
          options
        );
      };

      attemptLocation();
    });
  }

  private static async processPosition(position: GeolocationPosition): Promise<GPSLocation> {
    const location: GPSLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
    };

    // Enhanced reverse geocoding with fallback providers
    try {
      location.address = await this.reverseGeocode(location.latitude, location.longitude);
    } catch (error) {
      console.warn('Geocoding failed, using coordinates:', error);
      // Keep coordinate-based address as fallback
    }

    return location;
  }

  private static async reverseGeocode(lat: number, lon: number): Promise<string> {
    const providers = [
      {
        name: 'BigDataCloud',
        url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        parser: (data: any) => data.displayName || data.locality
      },
      {
        name: 'Nominatim',
        url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        parser: (data: any) => data.display_name
      }
    ];

    for (const provider of providers) {
      try {
        const response = await fetch(provider.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const address = provider.parser(data);
          if (address) {
            return address;
          }
        }
      } catch (error) {
        console.warn(`${provider.name} geocoding failed:`, error);
        continue;
      }
    }

    throw new Error('All geocoding providers failed');
  }

  private static handlePositionError(error: GeolocationPositionError, canRetry: boolean): GPSError {
    let message: string;
    let retryable = canRetry;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "GPS access denied. Please enable location permissions in your browser settings and refresh the page.";
        retryable = false;
        break;
      case error.POSITION_UNAVAILABLE:
        message = "GPS position unavailable. Please check if location services are enabled on your device.";
        break;
      case error.TIMEOUT:
        message = "GPS request timed out. This may be due to poor signal or network issues.";
        break;
      default:
        message = `GPS error: ${error.message}`;
    }

    return this.createError(message, retryable);
  }

  private static createError(message: string, canRetry: boolean): GPSError {
    return {
      code: 0,
      message,
      canRetry
    };
  }

  // Quick GPS check without geocoding for faster response
  static async getQuickLocation(): Promise<GPSLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(this.createError("GPS is not supported on this device", false));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: false, // Faster but less accurate
        timeout: 10000, // 10 seconds
        maximumAge: 120000 // 2 minutes - allow older cached position
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          };
          resolve(location);
        },
        (error) => {
          reject(this.handlePositionError(error, false));
        },
        options
      );
    });
  }

  // Check if GPS is available and permissions are granted
  static async checkGPSAvailability(): Promise<{ available: boolean; permission: string; message: string }> {
    if (!navigator.geolocation) {
      return {
        available: false,
        permission: 'unavailable',
        message: 'GPS is not supported on this device'
      };
    }

    // Check permissions if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return {
          available: true,
          permission: permission.state,
          message: permission.state === 'granted' 
            ? 'GPS is available and permissions granted'
            : permission.state === 'denied'
            ? 'GPS permissions denied'
            : 'GPS permissions not yet granted'
        };
      } catch (error) {
        return {
          available: true,
          permission: 'unknown',
          message: 'GPS available but permission status unknown'
        };
      }
    }

    return {
      available: true,
      permission: 'unknown',
      message: 'GPS available but permission status unknown'
    };
  }
}