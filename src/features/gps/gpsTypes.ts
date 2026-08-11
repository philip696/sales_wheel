export type GpsPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface GpsState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isLoading: boolean;
  isWatching: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
  permissionStatus: GpsPermissionStatus;
}