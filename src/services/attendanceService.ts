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

  /**
   * Read the local Expo image URI.
   *
   * Use ArrayBuffer instead of Blob here because this code
   * runs in React Native / Expo.
   */
  const response = await fetch(compressedImage.uri);

  if (!response.ok) {
    throw new Error(
      `Could not read compressed attendance image: ${response.status}`
    );
  }

  const imageBuffer = await response.arrayBuffer();

  if (imageBuffer.byteLength === 0) {
    throw new Error(
      'Compressed attendance image is empty'
    );
  }

  console.log('Compressed image buffer:', {
    byteLength: imageBuffer.byteLength,
  });

  /**
   * Keep the existing Storage path.
   *
   * The first folder is salesId/auth.uid(), which is required
   * by the attendance-photos Storage RLS policy.
   */
  const photoPath = buildPhotoPath(
    salesId,
    storeId
  );

  console.log('Uploading attendance photo:', {
    bucket: ATTENDANCE_PHOTOS_BUCKET,
    path: photoPath,
    size: imageBuffer.byteLength,
  });

  /**
   * Upload the actual image bytes to Supabase Storage.
   */
  const { error: uploadError } =
    await supabase.storage
      .from(ATTENDANCE_PHOTOS_BUCKET)
      .upload(photoPath, imageBuffer, {
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
 * Persist the sales rep's "did you place an order?" answer for an
 * approved attendance visit.
 *
 * Calls the confirm_attendance_order RPC (008_attendance_order_confirmation.sql)
 * rather than updating public.attendance directly -- sales reps only have
 * SELECT/INSERT RLS policies on that table, not UPDATE, and the RPC also
 * confirms the attendance belongs to the caller and is still 'approved'.
 */
export async function confirmAttendanceOrder(
  attendanceId: string,
  orderConfirmed: boolean
): Promise<Attendance> {
  const { data, error } = await supabase.rpc(
    'confirm_attendance_order',
    {
      p_attendance_id: attendanceId,
      p_order_confirmed: orderConfirmed,
    }
  );

  if (error) {
    console.error(
      'confirm_attendance_order RPC error:',
      error
    );

    throw new Error(
      `Could not save order confirmation: ${error.message}`
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error(
      'No result returned from confirm_attendance_order'
    );
  }

  return result as Attendance;
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