import { supabase } from '@/src/lib/supabase';
import type {
  Attendance,
  SubmitAttendancePayload,
  SubmitAttendanceResult,
} from '@/src/types';

const ATTENDANCE_PHOTOS_BUCKET = 'attendance-photos';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildPhotoPath(
  salesId: string,
  storeId: string,
  attendanceId: string
): string {
  const timestamp = Date.now();
  return `${salesId}/${storeId}/${attendanceId}-${timestamp}.jpg`;
}

async function uploadAttendancePhoto(
  salesId: string,
  storeId: string,
  attendanceId: string,
  photoUri: string
): Promise<string> {
  const photoPath = buildPhotoPath(salesId, storeId, attendanceId);

  const response = await fetch(photoUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .upload(photoPath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  return photoPath;
}

/**
 * Submits attendance evidence to the backend for server-side validation.
 * The mobile app never decides final approval status.
 */
export async function submitAttendance(
  payload: SubmitAttendancePayload
): Promise<SubmitAttendanceResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const tempAttendanceId = generateUuid();
  const photoPath = await uploadAttendancePhoto(
    user.id,
    payload.storeId,
    tempAttendanceId,
    payload.photoUri
  );

  const { data, error } = await supabase.rpc('submit_attendance', {
    p_store_id: payload.storeId,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_gps_accuracy: payload.gpsAccuracy,
    p_client_captured_at: payload.clientCapturedAt,
    p_photo_path: photoPath,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];
  if (!result) {
    throw new Error('No attendance result returned from server');
  }

  return {
    attendanceId: result.attendance_id,
    status: result.status,
    distanceMeters: result.distance_meters,
    rejectionReason: result.rejection_reason,
  };
}

export async function getMyAttendanceHistory(
  limit = 20
): Promise<Attendance[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('sales_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function getAttendancePhotoUrl(photoPath: string): string {
  const { data } = supabase.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .getPublicUrl(photoPath);

  return data.publicUrl;
}
