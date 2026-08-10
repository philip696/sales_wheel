export type SalesStatus = 'active' | 'inactive';
export type UserRole = 'sales' | 'admin';
export type EntityStatus = 'active' | 'inactive';
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';
export type SpinStatus = 'pending' | 'completed' | 'rejected';

export type AuditAction =
  | 'LOGIN'
  | 'ATTENDANCE_STARTED'
  | 'GPS_REJECTED'
  | 'CAMERA_CAPTURED'
  | 'ATTENDANCE_SUBMITTED'
  | 'ATTENDANCE_APPROVED'
  | 'ATTENDANCE_REJECTED'
  | 'SPIN_STARTED'
  | 'SPIN_REJECTED'
  | 'SPIN_COMPLETED';

export interface Sales {
  id: string;
  sales_code: string;
  name: string;
  email: string;
  username: string | null;
  status: SalesStatus;
  role: UserRole;
  created_at: string;
}

export interface Store {
  id: string;
  store_code: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  status: EntityStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  sales_id: string;
  store_id: string;
  latitude: number;
  longitude: number;
  gps_accuracy: number | null;
  distance_meters: number | null;
  photo_path: string | null;
  client_captured_at: string;
  server_created_at: string;
  status: AttendanceStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  value: string;
  probability: number;
  status: EntityStatus;
  created_at: string;
}

export interface Spin {
  id: string;
  sales_id: string;
  store_id: string;
  attendance_id: string;
  reward_id: string | null;
  latitude: number;
  longitude: number;
  spin_date: string;
  status: SpinStatus;
  created_at: string;
}

export interface Device {
  id: string;
  sales_id: string;
  device_identifier: string;
  platform: string | null;
  app_version: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  sales_id: string | null;
  action: AuditAction;
  store_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export interface GpsVerificationResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  reading: GpsReading;
  store: Pick<Store, 'id' | 'name' | 'latitude' | 'longitude' | 'radius_meters'>;
}

export interface StoreSearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SubmitAttendancePayload {
  storeId: string;
  latitude: number;
  longitude: number;
  gpsAccuracy: number | null;
  clientCapturedAt: string;
  photoUri: string;
}

export interface SubmitAttendanceResult {
  attendanceId: string;
  status: AttendanceStatus;
  distanceMeters: number;
  rejectionReason?: string | null;
}

export interface RequestSpinPayload {
  attendanceId: string;
  storeId: string;
  latitude: number;
  longitude: number;
}

export interface RequestSpinResult {
  spinId: string;
  status: SpinStatus;
  reward?: Pick<Reward, 'id' | 'name' | 'value'> | null;
  rejectionReason?: string | null;
}
