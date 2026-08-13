import { supabase } from '@/src/lib/supabase';
import { compressAttendanceImage } from '@/src/services/imageCompressionService';
import type {
  Attendance,
  SubmitAttendancePayload,
  SubmitAttendanceResult,
} from '@/src/types';

const ATTENDANCE_PHOTOS_BUCKET = 'attendance-photos';

/**
 * Build a unique Storage path for an attendance photo.
 *
 * We intentionally do not use an attendance ID here because
 * the database generates the actual attendance ID.
 */
function buildPhotoPath(
  salesId: string,
  storeId: string
): string {
  const timestamp = Date.now();

  return `${salesId}/${storeId}/${timestamp}.jpg`;
}

/**
 * Compress and upload an attendance photo.
 */
async function uploadAttendancePhoto(
  salesId: string,
  storeId: string,
  photoUri: string
): Promise<string> {
  if (!photoUri) {
    throw new Error('Attendance photo is required');
  }

  console.log('Compressing attendance image...');

  const compressedImage = await compressAttendanceImage(
    photoUri
  );

  console.log('Attendance image compressed:', {
    uri: compressedImage.uri,
    width: compressedImage.width,
    height: compressedImage.height,
  });

  const response = await fetch(compressedImage.uri);

  if (!response.ok) {
    throw new Error(
      `Could not read compressed attendance image: ${response.status}`
    );
  }

  const blob = await response.blob();

  console.log('Compressed image blob:', {
    type: blob.type,
    size: blob.size,
  });

  const photoPath = buildPhotoPath(
    salesId,
    storeId
  );

  console.log('Uploading attendance photo:', {
    bucket: ATTENDANCE_PHOTOS_BUCKET,
    path: photoPath,
  });

  const { error: uploadError } =
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .upload(photoPath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

  if (uploadError) {
    console.error(
      'ATTENDANCE PHOTO UPLOAD ERROR:',
      uploadError
    );

    throw new Error(
      `Photo upload failed: ${uploadError.message}`
    );
  }

  console.log(
    'Attendance photo uploaded successfully:',
    photoPath
  );

  return photoPath;
}

/**
 * Submit an attendance record.
 *
 * Flow:
 *
 * 1. Get authenticated Supabase user
 * 2. Compress the captured image
 * 3. Upload compressed image to Storage
 * 4. Call submit_attendance RPC
 * 5. Remove uploaded photo if the RPC fails
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
    throw new Error(
      'Client capture timestamp is required'
    );
  }

  /*
   * Get the authenticated Supabase user.
   *
   * DO NOT accept salesId/userId from the UI.
   * The authenticated user is the source of truth.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log('AUTH USER:', {
    id: user?.id,
    email: user?.email,
  });

  if (userError) {
    console.error(
      'AUTH USER ERROR:',
      userError
    );

    throw new Error(
      `Authentication check failed: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  console.log('Submitting attendance:', {
    userId: user.id,
    email: user.email,
    storeId: payload.storeId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    gpsAccuracy: payload.gpsAccuracy,
    clientCapturedAt: payload.clientCapturedAt,
  });

  /*
   * Upload compressed image first.
   */
  const photoPath = await uploadAttendancePhoto(
    user.id,
    payload.storeId,
    payload.photoUri
  );

  console.log('Calling submit_attendance RPC:', {
    p_store_id: payload.storeId,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_gps_accuracy: payload.gpsAccuracy,
    p_client_captured_at:
      payload.clientCapturedAt,
    p_photo_path: photoPath,
  });

  /*
   * The database function gets auth.uid() itself.
   *
   * We intentionally do NOT send user.id as a parameter.
   */
  const { data, error } = await supabase.rpc(
    'submit_attendance',
    {
      p_store_id: payload.storeId,
      p_latitude: payload.latitude,
      p_longitude: payload.longitude,
      p_gps_accuracy: payload.gpsAccuracy,
      p_client_captured_at:
        payload.clientCapturedAt,
      p_photo_path: photoPath,
    }
  );

  if (error) {
    console.error(
      'SUBMIT ATTENDANCE RPC ERROR:',
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    /*
     * The image was uploaded but the attendance
     * record failed. Remove the orphaned image.
     */
    console.log(
      'Removing orphaned attendance photo:',
      photoPath
    );

    const {
      error: cleanupError,
    } = await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .remove([photoPath]);

    if (cleanupError) {
      console.error(
        'ATTENDANCE PHOTO CLEANUP ERROR:',
        cleanupError
      );
    }

    throw new Error(
      [
        `Attendance submission failed.`,
        `Code: ${error.code ?? 'unknown'}`,
        `Message: ${error.message}`,
        error.details
          ? `Details: ${error.details}`
          : '',
        error.hint
          ? `Hint: ${error.hint}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  console.log(
    'submit_attendance RPC response:',
    data
  );

  /*
   * The RPC returns a row containing the result.
   */
  const result = Array.isArray(data)
    ? data[0]
    : data;

  if (!result) {
    console.error(
      'submit_attendance returned no result'
    );

    /*
     * Clean up the photo because the database
     * didn't give us a successful attendance result.
     */
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .remove([photoPath]);

    throw new Error(
      'No attendance result returned from server'
    );
  }

  console.log(
    'Attendance submitted successfully:',
    result
  );

  return {
    attendanceId: result.attendance_id,
    status: result.status,
    distanceMeters: result.distance_meters,
    rejectionReason:
      result.rejection_reason,
  };
}

/**
 * Get the authenticated user's attendance history.
 */
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
    .order('created_at', {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      'GET ATTENDANCE HISTORY ERROR:',
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Create a temporary signed URL for a private
 * attendance photo.
 */
export async function getAttendancePhotoUrl(
  photoPath: string,
  expiresIn = 60 * 10
): Promise<string> {
  if (!photoPath) {
    throw new Error('Photo path is required');
  }

  const { data, error } =
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .createSignedUrl(
        photoPath,
        expiresIn
      );

  if (error) {
    console.error(
      'GET ATTENDANCE PHOTO URL ERROR:',
      {
        code: error.name,
        message: error.message,
      }
    );

    throw new Error(
      `Could not create attendance photo URL: ${error.message}`
    );
  }

  return data.signedUrl;
}
/**
 * APPEND-ONLY: add these to the bottom of src/services/attendanceService.ts
 * Nothing existing in that file needs to change.
 *
 * Also add this import at the top of attendanceService.ts, alongside the
 * existing type import:
 *   import type {
 *     Attendance,
 *     SubmitAttendancePayload,
 *     SubmitAttendanceResult,
 *     AdminAttendanceRecord,   <-- add this line
 *     AttendanceStatus,        <-- add this line
 *   } from '@/src/types';
 */

/**
 * Admin-only: fetch all attendance records, optionally filtered by status,
 * enriched with the sales rep's name and the store's name for display.
 *
 * Relies on RLS already permitting admins (is_admin()) to SELECT from
 * `sales` and `stores` — same trust boundary the rest of the app uses.
 */
export async function getAllAttendance(
  status?: AttendanceStatus
): Promise<AdminAttendanceRecord[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: attendanceRows, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!attendanceRows || attendanceRows.length === 0) {
    return [];
  }

  const salesIds = [...new Set(attendanceRows.map((a) => a.sales_id))];
  const storeIds = [...new Set(attendanceRows.map((a) => a.store_id))];

  const [{ data: salesRows }, { data: storeRows }] = await Promise.all([
    supabase.from('sales').select('id, name').in('id', salesIds),
    supabase.from('stores').select('id, name').in('id', storeIds),
  ]);

  const salesMap = new Map((salesRows ?? []).map((s) => [s.id, s.name]));
  const storeMap = new Map((storeRows ?? []).map((s) => [s.id, s.name]));

  return attendanceRows.map((a) => ({
    ...a,
    salesName: salesMap.get(a.sales_id) ?? 'Unknown',
    storeName: storeMap.get(a.store_id) ?? 'Unknown',
  }));
}

/**
 * Admin-only: approve a pending attendance record.
 *
 * NOTE: there is no `approve_attendance` RPC in the current schema, so this
 * goes through a direct table update. This ONLY works if RLS already grants
 * admins (is_admin()) UPDATE on the `attendance` table — check
 * 002_rls_policies.sql. If that policy doesn't exist yet, this call will
 * appear to succeed (no error) but silently update 0 rows, per Postgres RLS
 * behavior on UPDATE.
 */
export async function approveAttendance(attendanceId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error, count } = await supabase
    .from('attendance')
    .update({ status: 'approved', rejection_reason: null })
    .eq('id', attendanceId)
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(error.message);
  }

  if (!count) {
    throw new Error(
      'No rows updated — check that RLS permits admin updates on attendance.'
    );
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    sales_id: user.id,
    action: 'ATTENDANCE_APPROVED',
    metadata: { attendance_id: attendanceId },
  });

  if (auditError) {
    // Don't fail the whole approval over a logging error — surface it,
    // but the approval itself already succeeded.
    console.warn('Audit log write failed:', auditError.message);
  }
}

/**
 * Admin-only: reject a pending attendance record with a reason.
 * Same RLS dependency as approveAttendance above.
 */
export async function rejectAttendance(
  attendanceId: string,
  reason: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('A rejection reason is required.');
  }

  const { error, count } = await supabase
    .from('attendance')
    .update({ status: 'rejected', rejection_reason: trimmedReason })
    .eq('id', attendanceId)
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(error.message);
  }

  if (!count) {
    throw new Error(
      'No rows updated — check that RLS permits admin updates on attendance.'
    );
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    sales_id: user.id,
    action: 'ATTENDANCE_REJECTED',
    metadata: { attendance_id: attendanceId, reason: trimmedReason },
  });

  if (auditError) {
    console.warn('Audit log write failed:', auditError.message);
  }
}