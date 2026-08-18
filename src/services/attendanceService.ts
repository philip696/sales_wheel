import { supabase } from '@/src/lib/supabase';
import { compressAttendanceImage } from '@/src/services/imageCompressionService';
import type {
  Attendance,
  SubmitAttendancePayload,
  SubmitAttendanceResult,
} from '@/src/types';

const ATTENDANCE_PHOTOS_BUCKET = 'attendance-photos';

function buildPhotoPath(salesId: string, storeId: string): string {
  return `${salesId}/${storeId}/${Date.now()}.jpg`;
}

async function uploadAttendancePhoto(
  salesId: string,
  storeId: string,
  photoUri: string
): Promise<string> {
  if (!photoUri) {
    throw new Error('Attendance photo is required');
  }

  const compressedImage = await compressAttendanceImage(photoUri);
  const response = await fetch(compressedImage.uri);

  if (!response.ok) {
    throw new Error(
      `Could not read compressed attendance image: ${response.status}`
    );
  }

  const blob = await response.blob();
  const photoPath = buildPhotoPath(salesId, storeId);

  const { error: uploadError } = await supabase.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .upload(photoPath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  return photoPath;
}

/**
 * Submit an attendance record.
 *
 * Valid attendance is immediately accepted by the server. There is no
 * client-side or admin approval step. Server validation still protects the
 * attendance boundary (store radius, GPS accuracy and required photo).
 */
export async function submitAttendance(
  payload: SubmitAttendancePayload
): Promise<SubmitAttendanceResult> {
  if (!payload.storeId) {
    throw new Error('Store is required');
  }

  if (!payload.photoUri) {
    throw new Error('Attendance photo is required');
  }

  if (
    typeof payload.latitude !== 'number' ||
    typeof payload.longitude !== 'number'
  ) {
    throw new Error('Valid GPS coordinates are required');
  }

  if (
    typeof payload.gpsAccuracy !== 'number' ||
    !Number.isFinite(payload.gpsAccuracy)
  ) {
    throw new Error('Valid GPS accuracy is required');
  }

  if (!payload.clientCapturedAt) {
    throw new Error('Client capture timestamp is required');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Authentication check failed: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  const photoPath = await uploadAttendancePhoto(
    user.id,
    payload.storeId,
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
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .remove([photoPath]);

    throw new Error(
      [
        'Attendance submission failed.',
        `Code: ${error.code ?? 'unknown'}`,
        `Message: ${error.message}`,
        error.details ? `Details: ${error.details}` : '',
        error.hint ? `Hint: ${error.hint}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .remove([photoPath]);

    throw new Error('No attendance result returned from server');
  }

  // The database may reject invalid submissions. Those are submission
  // failures, not a workflow state that the app should expose or wait on.
  if (result.rejection_reason) {
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .remove([photoPath]);

    throw new Error(result.rejection_reason);
  }

  // A successful attendance submission is always presented as immediately
  // accepted by the application. No pending/manual approval state exists.
  return {
    attendanceId: result.attendance_id,
    status: 'approved',
    distanceMeters: result.distance_meters,
    rejectionReason: null,
  };
}

export async function getMyAttendanceHistory(
  limit = 20
): Promise<Attendance[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Authentication check failed: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error('Not authenticated');
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

export async function getAttendancePhotoUrl(
  photoPath: string,
  expiresIn = 60 * 10
): Promise<string> {
  if (!photoPath) {
    throw new Error('Photo path is required');
  }

  const { data, error } = await supabase.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .createSignedUrl(photoPath, expiresIn);

  if (error) {
    throw new Error(
      `Could not create attendance photo URL: ${error.message}`
    );
  }

  return data.signedUrl;
}