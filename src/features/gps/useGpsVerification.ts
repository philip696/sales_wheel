import type { GpsState } from '@/src/features/gps/gpsTypes';
import type { GpsVerificationResult, Store } from '@/src/types';
import { calculateDistanceMeters, isWithinRadius } from '@/src/utils/distance';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

const initialState: GpsState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isLoading: false,
  isWatching: false,
  lastUpdatedAt: null,
  error: null,
  permissionStatus: 'undetermined',
};

// How often the device's location is re-read while a store radius is being
// actively monitored. This is a client-side UX signal only — the backend
// re-validates distance/accuracy independently when attendance is submitted,
// so a stale or spoofed client reading here cannot itself grant attendance.
const WATCH_INTERVAL_MS = 5000;

export function useGpsVerification() {
  const [gpsState, setGpsState] = useState<GpsState>(initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

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

  const readPosition = useCallback(async (showLoading: boolean) => {
    // Skip overlapping reads — if a 5s tick fires while the previous read is
    // still in flight (slow GPS fix, background throttling, etc.), don't
    // stack up requests.
    if (isFetchingRef.current) {
      return null;
    }
    isFetchingRef.current = true;

    if (showLoading) {
      setGpsState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const reading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString(),
      };

      setGpsState((prev) => ({
        ...prev,
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        lastUpdatedAt: reading.timestamp,
        isLoading: false,
        error: null,
        permissionStatus: 'granted',
      }));

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
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGpsState((prev) => (prev.isWatching ? { ...prev, isWatching: false } : prev));
  }, []);

  /**
   * Starts continuously re-reading the device's location every
   * WATCH_INTERVAL_MS (5s), so the radius check reflects live position
   * instead of a single reading taken when the screen opened. Safe to call
   * repeatedly — it's a no-op if already watching.
   */
  const startWatching = useCallback(async (): Promise<boolean> => {
    if (intervalRef.current) {
      return true;
    }

    const granted = await requestPermission();
    if (!granted) {
      return false;
    }

    setGpsState((prev) => ({ ...prev, isWatching: true }));

    // Take an immediate reading, then keep polling on the interval.
    await readPosition(true);
    intervalRef.current = setInterval(() => {
      readPosition(false);
    }, WATCH_INTERVAL_MS);

    return true;
  }, [readPosition, requestPermission]);

  // One-shot read, kept for call sites that just need a single fix (e.g.
  // outside the continuous-monitoring flow) rather than ongoing polling.
  const getCurrentPosition = useCallback(() => readPosition(true), [readPosition]);

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

  // Always stop the interval when the owning component unmounts, regardless
  // of whether stopWatching() was explicitly called.
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    gpsState,
    requestPermission,
    getCurrentPosition,
    startWatching,
    stopWatching,
    verifyAgainstStore,
  };
}