import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

class LocationService {
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    if (!Capacitor.isNativePlatform()) {
      return this.getWebLocation();
    }

    try {
      const permissionStatus = await Geolocation.checkPermissions();

      if (permissionStatus.location !== 'granted') {
        const requestStatus = await Geolocation.requestPermissions();
        if (requestStatus.location !== 'granted') {
          console.warn('Location permission not granted');
          return null;
        }
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  private async getWebLocation(): Promise<LocationCoordinates | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
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
          console.error('Error getting web location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  formatCoordinates(coords: LocationCoordinates): string {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  }

  async getLocationString(): Promise<string> {
    const coords = await this.getCurrentLocation();
    if (!coords) {
      return '';
    }
    return this.formatCoordinates(coords);
  }
}

export const locationService = new LocationService();
