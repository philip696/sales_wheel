import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { logAuditEvent } from '@/src/services/auditService';
import { detectFace } from '@/src/services/faceDetectionService';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * Camera-only capture — no gallery picker allowed in normal flow.
 *
 * Capture flow (this phase — detection only):
 *
 *   1. Take photo
 *   2. Send it to the face-service for detection ("is there a face here")
 *   3. No face found  → show why, let the rep retake (loop back to step 1)
 *      Face found     → hand off to preview.tsx as before
 *
 * Matching the photo to a specific enrolled sales rep (face_match.py's
 * DeepFace.verify step) is NOT part of this flow yet — see the
 * commented-out section near the bottom of this file, and
 * faceDetectionService.ts for where that will plug in.
 */
export default function AttendanceCameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { selectedStore, setPhotoUri } = useAttendanceFlow();
  const [capturing, setCapturing] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!selectedStore) {
      Alert.alert('No Store', 'Select a store first.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [selectedStore]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const busy = capturing || checkingFace;

  const handleCapture = async () => {
    if (!cameraRef.current || busy) {
      return;
    }

    setCapturing(true);
    setStatusIsError(false);
    setStatusMessage('');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      setCapturing(false);
      setCheckingFace(true);
      setStatusMessage('Checking for a face...');

      // ----------------------------------------------------
      // FACE DETECTION (retry gate)
      //
      // Mirrors detect_face() in the supplied face_match.py:
      // detection only, no identity check. If nothing is found,
      // we stay on this screen and let the rep try again instead
      // of moving on to preview/submit.
      // ----------------------------------------------------
      let detection;

      try {
        detection = await detectFace(photo.uri);
      } catch (detectionError) {
        // The check itself failed (service unreachable, bad
        // response, etc.) — this is different from "no face
        // found", so it gets its own message and audit action.
        console.error(
          'FACE DETECTION SERVICE UNAVAILABLE:',
          detectionError
        );

        setStatusIsError(true);
        setStatusMessage(
          'Could not check the photo for a face. Check your connection and try again.'
        );

        await logAuditEvent({
          action: 'FACE_NOT_DETECTED',
          storeId: selectedStore?.id,
          metadata: {
            reason: 'service_error',
            error:
              detectionError instanceof Error
                ? detectionError.message
                : String(detectionError),
          },
        });

        return;
      }

      if (!detection.hasFace) {
        setRetryCount((count) => count + 1);
        setStatusIsError(true);
        setStatusMessage(detection.message);

        await logAuditEvent({
          action: 'FACE_NOT_DETECTED',
          storeId: selectedStore?.id,
          metadata: { reason: 'no_face', message: detection.message },
        });

        // Stay on the camera screen — the rep taps the shutter
        // again, which re-runs handleCapture from the top.
        return;
      }

      await logAuditEvent({
        action: 'FACE_DETECTED',
        storeId: selectedStore?.id,
      });

      // ----------------------------------------------------
      // FUTURE WORK: face matching would go here, before
      // handing off to preview — see faceDetectionService.ts.
      //
      // const verification = await verifyFace(
      //   photo.uri,
      //   enrolledReferencePhotoPath
      // );
      // if (!verification.verified) {
      //   setStatusIsError(true);
      //   setStatusMessage("This doesn't look like the enrolled sales rep. Try again.");
      //   return;
      // }
      // ----------------------------------------------------

      setPhotoUri(photo.uri);
      await logAuditEvent({
        action: 'CAMERA_CAPTURED',
        storeId: selectedStore?.id,
      });
      router.push('/(sales)/attendance/preview');
    } catch (error) {
      Alert.alert(
        'Capture Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setCapturing(false);
      setCheckingFace(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        {statusMessage ? (
          <View style={styles.statusRow}>
            {checkingFace && (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.statusSpinner}
              />
            )}
            <Text
              style={[
                styles.statusText,
                statusIsError && styles.statusTextError,
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}

        {retryCount > 0 && !checkingFace && (
          <Text style={styles.retryHint}>
            No face detected yet — make sure your face is centered and well
            lit, then try again.
          </Text>
        )}

        <Pressable
          style={[styles.captureButton, busy && styles.capturing]}
          onPress={handleCapture}
          disabled={busy}
        >
          {checkingFace ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </Pressable>
        <Text style={styles.hint}>Take a fresh photo — no gallery selection</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  controls: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#111',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusSpinner: {
    marginRight: 8,
  },
  statusText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusTextError: {
    color: '#f87171',
  },
  retryHint: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturing: {
    opacity: 0.5,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});