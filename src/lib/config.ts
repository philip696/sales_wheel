const supabaseUrl = 'https://cwvvjlnufkvcminnoxfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dnZqbG51Zmt2Y21pbm5veGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDUzNDUsImV4cCI6MjEwMTkyMTM0NX0.ld5F5UhjAQs7HSe_MZ7GzcOYoju6VtiGNC_PW5ZF4fU';

/**
 * Base URL of the standalone face-service (see /face-service in the
 * repo root — ported from the supplied face_match.py). Only the
 * detection endpoint is active today; /verify-faces is a stubbed,
 * commented-out placeholder in that service until the face-matching
 * phase is built (see faceDetectionService.ts).
 *
 * Defaults to a local dev URL. Override via EXPO_PUBLIC_FACE_API_URL
 * in .env for a device/simulator that isn't localhost, or once the
 * service has a real deployment.
 */
const faceApiBaseUrl =
  process.env.EXPO_PUBLIC_FACE_API_URL ?? 'http://localhost:8000';

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  faceApi: {
    baseUrl: faceApiBaseUrl,
    detectUrl: `${faceApiBaseUrl}/detect-face`,
    // Not implemented server-side yet — see verifyFace() stub in
    // faceDetectionService.ts and face-service/app.py.
    verifyUrl: `${faceApiBaseUrl}/verify-faces`,
  },
  isSupabaseConfigured: true,
} as const;