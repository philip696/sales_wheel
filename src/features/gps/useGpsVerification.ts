import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { calculateDistanceMeters, isWithinRadius } from '@/src/utils/distance';
import type { GpsVerificationResult, Store } from '@/src/types';
import type { GpsState } from '@/src/features/gps/gpsTypes';

const initialState: GpsState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isLoading: false,
  error: null,
  permissionStatus: 'undetermined',
};

export function useGpsVerification() {
  const [gpsState, setGpsState] = useState<GpsState>(initialState);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === Location.PermissionStatus.GRANTED;

    setGpsState((prev) => ({
      ...prev,
      permissionStatus: granted ? 'granted' : 'denied',
      error: granted ? null : 'Location permission denied',
    }));

    return granted;
  }, []);

  const getCurrentPosition = useCallback(async () => {
    setGpsState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const granted = await requestPermission();
      if (!granted) {
        setGpsState((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const reading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString(),
      };

      setGpsState({
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        isLoading: false,
        error: null,
        permissionStatus: 'granted',
      });

      return reading;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get GPS location';
      setGpsState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return null;
    }
  }, [requestPermission]);

  const verifyAgainstStore = useCallback(
    (
      store: Pick<
        Store,
        'id' | 'name' | 'latitude' | 'longitude' | 'radius_meters'
      >,
      userLat: number,
      userLon: number,
      accuracy: number | null
    ): GpsVerificationResult => {
      const distanceMeters = calculateDistanceMeters(
        userLat,
        userLon,
        store.latitude,
        store.longitude
      );

      return {
        isWithinRadius: isWithinRadius(
          userLat,
          userLon,
          store.latitude,
          store.longitude,
          store.radius_meters
        ),
        distanceMeters,
        reading: {
          latitude: userLat,
          longitude: userLon,
          accuracy,
          timestamp: new Date().toISOString(),
        },
        store,
      };
    },
    []
  );

  return {
    gpsState,
    requestPermission,
    getCurrentPosition,
    verifyAgainstStore,
  };
}
