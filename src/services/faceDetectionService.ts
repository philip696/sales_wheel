import { config } from '@/src/lib/config';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Face detection for the attendance camera flow.
 *
 * Scope of this file (current phase):
 *   - detectFace()  → "is there a face in this photo, yes or no"
 *
 * Explicitly OUT of scope for now (see the commented section at the
 * bottom of this file, and supabase/migrations/006_face_verification_draft.sql):
 *   - verifyFace()  → "does this face match the enrolled sales rep"
 *
 * Detection runs against the small companion face-service (see
 * /face-service in the repo root, ported from the provided face_match.py
 * script). We deliberately do NOT do this on-device / client-side only:
 * the same "never trust the frontend" principle used for attendance
 * approval (see attendanceService.ts) applies here — a determined user
 * could bypass a purely client-side check. The detection call below is
 * a UX gate (fail fast, let the user retake immediately); nothing about
 * server-side attendance trust changes because of it.
 */

export type FaceDetectionResult = {
  hasFace: boolean;
  /**
   * Human-readable reason when hasFace is false, or when the check
   * itself could not be completed (network/service error). Safe to
   * show directly to the user.
   */
  message: string;
};

/**
 * Downscale the photo before sending it for detection.
 *
 * We don't need attendance-quality resolution to answer "is there a
 * face here" — a small JPEG keeps the round trip fast on poor mobile
 * connections. The original, full-quality photoUri captured in
 * camera.tsx is untouched and is what eventually gets uploaded by
 * attendanceService.ts.
 */
async function buildDetectionPayload(
  photoUri: string
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 480 } }],
    {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error(
      'Could not prepare photo for face detection'
    );
  }

  return result.base64;
}

/**
 * Calls the face-service /detect-face endpoint (see /face-service,
 * ported from detect_face() in the supplied face_match.py) and reports
 * back whether at least one face was found.
 *
 * Never throws for "no face" — that's a normal, expected outcome the
 * camera screen loops on. It only throws if the check itself could not
 * be performed (service unreachable, bad response, etc.), so the
 * caller can decide how to handle an infrastructure failure separately
 * from a plain "no face" result.
 */
export async function detectFace(
  photoUri: string
): Promise<FaceDetectionResult> {
  if (!photoUri) {
    throw new Error('Photo is required for face detection');
  }

  const base64Image = await buildDetectionPayload(photoUri);

  console.log('Sending photo for face detection...', {
    endpoint: config.faceApi.detectUrl,
  });

  const response = await fetch(config.faceApi.detectUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_base64: base64Image }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');

    console.error('FACE DETECTION SERVICE ERROR:', {
      status: response.status,
      body: bodyText,
    });

    throw new Error(
      `Face detection service returned ${response.status}`
    );
  }

  const data = (await response.json()) as {
    has_face: boolean;
    message?: string;
  };

  console.log('Face detection result:', data);

  return {
    hasFace: Boolean(data.has_face),
    message:
      data.message ??
      (data.has_face
        ? 'Face detected.'
        : 'No face detected. Please try again.'),
  };
}

/* ============================================================
 * FUTURE WORK — face matching (NOT implemented yet)
 * ============================================================
 *
 * The captured attendance photo currently only needs to contain *a*
 * face (detectFace above). Confirming it's the *correct* sales rep's
 * face is a separate, bigger feature that needs:
 *
 *   1. A reference photo per sales rep, captured once at
 *      enrollment/signup and stored privately in Supabase Storage
 *      (mirrors how attendance photos are stored — see
 *      attendanceService.ts's ATTENDANCE_PHOTOS_BUCKET).
 *   2. A DB column to point at it, e.g. sales.reference_photo_path.
 *      Sketched out (commented, not applied) in
 *      supabase/migrations/006_face_verification_draft.sql.
 *   3. A companion /verify-faces endpoint on the face-service, ported
 *      from DeepFace.verify(...) in the original face_match.py — see
 *      the commented stub in face-service/app.py.
 *   4. This client function to call it:
 *
 * export type FaceVerificationResult = {
 *   verified: boolean;
 *   distance: number;
 *   threshold: number;
 *   model: string;
 * };
 *
 * export async function verifyFace(
 *   capturedPhotoUri: string,
 *   referencePhotoPath: string // Supabase Storage path, not a local uri
 * ): Promise<FaceVerificationResult> {
 *   const capturedBase64 = await buildDetectionPayload(capturedPhotoUri);
 *
 *   const response = await fetch(config.faceApi.verifyUrl, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       captured_image_base64: capturedBase64,
 *       reference_photo_path: referencePhotoPath,
 *     }),
 *   });
 *
 *   if (!response.ok) {
 *     throw new Error(`Face verification service returned ${response.status}`);
 *   }
 *
 *   return response.json();
 * }
 *
 * Where this would plug in: app/(sales)/attendance/preview.tsx,
 * right before submitAttendance() is called — reject/warn before
 * upload rather than after, same "fail fast" shape as detectFace()
 * in camera.tsx.
 * ============================================================ */