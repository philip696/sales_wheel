export type GpsPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface GpsState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: GpsPermissionStatus;
}
