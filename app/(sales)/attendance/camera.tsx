import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { logAuditEvent } from '@/src/services/auditService';
import { detectFace } from '@/src/services/faceDetectionService';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
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

const MIN_ZOOM = 0;
const MAX_ZOOM = 1;

export default function AttendanceCameraScreen() {
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const {
    selectedStore,
    setPhotoUri,
    resetFlow,
  } = useAttendanceFlow();

  const [capturing, setCapturing] =
    useState(false);

  const [checkingFace, setCheckingFace] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState('');

  const [statusIsError, setStatusIsError] =
    useState(false);

  const [retryCount, setRetryCount] =
    useState(0);

  /*
   * ============================================================
   * CAMERA
   * ============================================================
   */

  const [facing, setFacing] =
    useState<'front' | 'back'>('back');

  const [zoom, setZoom] =
    useState(0);

  /*
   * ============================================================
   * STORE CHECK
   * ============================================================
   */

  useEffect(() => {
    if (!selectedStore) {
      Alert.alert(
        'No Store',
        'Select a store first.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace(
                '/(sales)/stores'
              ),
          },
        ]
      );
    }
  }, [selectedStore]);

  /*
   * ============================================================
   * BACK TO PREVIOUS PAGE
   * ============================================================
   *
   * This does NOT reset the attendance flow.
   *
   * Camera:
   * GPS Verification → Camera
   *
   * Pressing back:
   * Camera → GPS Verification
   *
   * The selected store and attendance state remain intact.
   */

  const handleBack = () => {
    if (
      capturing ||
      checkingFace
    ) {
      return;
    }

    router.back();
  };

  /*
   * ============================================================
   * CANCEL ENTIRE ATTENDANCE
   * ============================================================
   *
   * This is only used when the user is on the
   * camera permission screen.
   */

  const handleCancelAttendance = () => {
    if (
      capturing ||
      checkingFace
    ) {
      return;
    }

    resetFlow();

    router.replace('/(sales)');
  };

  /*
   * ============================================================
   * FLIP CAMERA
   * ============================================================
   */

  const handleFlipCamera = () => {
    if (
      capturing ||
      checkingFace
    ) {
      return;
    }

    setFacing((current) =>
      current === 'back'
        ? 'front'
        : 'back'
    );

    /*
     * Reset zoom when switching cameras.
     */
    setZoom(0);
  };

  /*
   * ============================================================
   * ZOOM
   * ============================================================
   */

  const zoomSteps = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

  const increaseZoom = () => {
    if (
      capturing ||
      checkingFace
    ) {
      return;
    }

    setZoom((current) => {
      const currentIndex =
        zoomSteps.findIndex(
          (value) =>
            Math.abs(
              value - current
            ) < 0.01
        );

      if (
        currentIndex === -1
      ) {
        return 0.25;
      }

      const nextIndex =
        Math.min(
          currentIndex + 1,
          zoomSteps.length - 1
        );

      return zoomSteps[nextIndex];
    });
  };

  const decreaseZoom = () => {
    if (
      capturing ||
      checkingFace
    ) {
      return;
    }

    setZoom((current) => {
      const currentIndex =
        zoomSteps.findIndex(
          (value) =>
            Math.abs(
              value - current
            ) < 0.01
        );

      if (
        currentIndex === -1
      ) {
        return 0;
      }

      const previousIndex =
        Math.max(
          currentIndex - 1,
          0
        );

      return zoomSteps[
        previousIndex
      ];
    });
  };

  /*
   * ============================================================
   * CAMERA PERMISSION LOADING
   * ============================================================
   */

  if (!permission) {
    return (
      <View style={styles.container}>
        <View
          style={
            styles.permissionLoading
          }
        >
          <ActivityIndicator
            size="large"
            color="#ffffff"
          />

          <Text
            style={
              styles.permissionLoadingText
            }
          >
            Checking camera permission...
          </Text>
        </View>
      </View>
    );
  }

  /*
   * ============================================================
   * CAMERA PERMISSION NOT GRANTED
   * ============================================================
   */

  if (!permission.granted) {
    return (
      <View
        style={
          styles.permissionContainer
        }
      >
        <Pressable
          style={({ pressed }) => [
            styles.permissionCancelButton,
            pressed &&
              styles.cancelButtonPressed,
          ]}
          onPress={
            handleCancelAttendance
          }
          hitSlop={10}
        >
          <Text
            style={
              styles.permissionCancelText
            }
          >
            ✕
          </Text>
        </Pressable>

        <Text
          style={styles.permissionIcon}
        >
          📷
        </Text>

        <Text
          style={
            styles.permissionTitle
          }
        >
          Camera Permission Required
        </Text>

        <Text
          style={styles.message}
        >
          Camera access is required to
          take a fresh attendance photo.
        </Text>

        <Pressable
          style={
            styles.permissionButton
          }
          onPress={
            requestPermission
          }
        >
          <Text
            style={
              styles.buttonText
            }
          >
            GRANT CAMERA PERMISSION
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.permissionBackButton
          }
          onPress={
            handleCancelAttendance
          }
        >
          <Text
            style={
              styles.permissionBackText
            }
          >
            CANCEL ATTENDANCE
          </Text>
        </Pressable>
      </View>
    );
  }

  const busy =
    capturing ||
    checkingFace;

  /*
   * ============================================================
   * CAPTURE PHOTO
   * ============================================================
   */

  const handleCapture =
    async () => {
      if (
        !cameraRef.current ||
        busy
      ) {
        return;
      }

      setCapturing(true);
      setStatusIsError(false);
      setStatusMessage('');

      try {
        const photo =
          await cameraRef.current.takePictureAsync(
            {
              quality: 0.8,
              skipProcessing: false,
            }
          );

        if (!photo?.uri) {
          throw new Error(
            'Failed to capture photo'
          );
        }

        setCapturing(false);
        setCheckingFace(true);
        setStatusIsError(false);
        setStatusMessage(
          'Checking for a face...'
        );

        /*
         * ======================================================
         * FACE DETECTION
         * ======================================================
         */

        let detection;

        try {
          detection =
            await detectFace(
              photo.uri
            );
        } catch (
          detectionError
        ) {
          console.error(
            'FACE DETECTION SERVICE UNAVAILABLE:',
            detectionError
          );

          setStatusIsError(true);
          setStatusMessage(
            'Could not check the photo for a face. Check your connection and try again.'
          );

          try {
            await logAuditEvent({
              action:
                'FACE_NOT_DETECTED',
              storeId:
                selectedStore?.id,
              metadata: {
                reason:
                  'service_error',
                error:
                  detectionError instanceof
                  Error
                    ? detectionError.message
                    : String(
                        detectionError
                      ),
              },
            });
          } catch (
            auditError
          ) {
            console.warn(
              'Failed to write face detection audit:',
              auditError
            );
          }

          return;
        }

        /*
         * ======================================================
         * NO FACE
         * ======================================================
         */

        if (!detection.hasFace) {
          setRetryCount(
            (count) =>
              count + 1
          );

          setStatusIsError(true);
          setStatusMessage(
            detection.message
          );

          try {
            await logAuditEvent({
              action:
                'FACE_NOT_DETECTED',
              storeId:
                selectedStore?.id,
              metadata: {
                reason:
                  'no_face',
                message:
                  detection.message,
              },
            });
          } catch (
            auditError
          ) {
            console.warn(
              'Failed to write face detection audit:',
              auditError
            );
          }

          return;
        }

        /*
         * ======================================================
         * FACE DETECTED
         * ======================================================
         */

        try {
          await logAuditEvent({
            action:
              'FACE_DETECTED',
            storeId:
              selectedStore?.id,
          });
        } catch (
          auditError
        ) {
          console.warn(
            'Failed to write face detected audit:',
            auditError
          );
        }

        /*
         * ======================================================
         * SAVE PHOTO
         * ======================================================
         */

        setPhotoUri(
          photo.uri
        );

        try {
          await logAuditEvent({
            action:
              'CAMERA_CAPTURED',
            storeId:
              selectedStore?.id,
          });
        } catch (
          auditError
        ) {
          console.warn(
            'Failed to write camera audit:',
            auditError
          );
        }

        /*
         * ======================================================
         * GO TO PREVIEW
         * ======================================================
         */

        router.push(
          '/(sales)/attendance/preview'
        );
      } catch (error) {
        console.error(
          'CAMERA CAPTURE ERROR:',
          error
        );

        Alert.alert(
          'Capture Failed',
          error instanceof Error
            ? error.message
            : 'Unable to capture the photo. Please try again.'
        );
      } finally {
        setCapturing(false);
        setCheckingFace(false);
      }
    };

  /*
   * ============================================================
   * MAIN CAMERA UI
   * ============================================================
   */

  return (
    <View
      style={styles.container}
    >
      {/* ========================================================
          CAMERA
      ========================================================= */}

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        zoom={zoom}
      />

      {/* ========================================================
          TOP BAR
      ========================================================= */}

      <View
        style={styles.topBar}
      >
        {/* BACK */}

        <Pressable
          style={({ pressed }) => [
            styles.topButton,
            pressed &&
              styles.topButtonPressed,
          ]}
          onPress={handleBack}
          disabled={busy}
          hitSlop={10}
        >
          <Text
            style={styles.topButtonText}
          >
            ‹
          </Text>
        </Pressable>

        <View
          style={
            styles.topBarRight
          }
        >
          {/* FLIP */}

          <Pressable
            style={({ pressed }) => [
              styles.topButton,
              pressed &&
                styles.topButtonPressed,
            ]}
            onPress={
              handleFlipCamera
            }
            disabled={busy}
            hitSlop={10}
          >
            <Text
              style={
                styles.topButtonText
              }
            >
              🔄
            </Text>
          </Pressable>

          {/* CAMERA LABEL */}

          <View
            style={
              styles.cameraBadge
            }
          >
            <Text
              style={
                styles.cameraBadgeText
              }
            >
              {facing === 'front'
                ? 'FRONT'
                : 'BACK'}
            </Text>
          </View>
        </View>
      </View>

      {/* ========================================================
          ZOOM CONTROL
      ========================================================= */}

      <View
        style={styles.zoomControls}
      >
        <Pressable
          style={({ pressed }) => [
            styles.zoomButton,
            pressed &&
              styles.zoomButtonPressed,
            zoom <= MIN_ZOOM &&
              styles.zoomButtonDisabled,
          ]}
          onPress={
            decreaseZoom
          }
          disabled={
            busy ||
            zoom <= MIN_ZOOM
          }
        >
          <Text
            style={
              styles.zoomButtonText
            }
          >
            −
          </Text>
        </Pressable>

        <View
          style={styles.zoomIndicator}
        >
          <Text
            style={
              styles.zoomIndicatorText
            }
          >
            {`Zoom ${Math.round(
              zoom * 100
            )}%`}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.zoomButton,
            pressed &&
              styles.zoomButtonPressed,
            zoom >= MAX_ZOOM &&
              styles.zoomButtonDisabled,
          ]}
          onPress={
            increaseZoom
          }
          disabled={
            busy ||
            zoom >= MAX_ZOOM
          }
        >
          <Text
            style={
              styles.zoomButtonText
            }
          >
            +
          </Text>
        </Pressable>
      </View>

      {/* ========================================================
          FACE GUIDE
      ========================================================= */}

      <View
        pointerEvents="none"
        style={
          styles.guideContainer
        }
      >
        <View
          style={styles.faceGuide}
        >
          <Text
            style={styles.guideText}
          >
            Position your face inside
            the frame
          </Text>
        </View>
      </View>

      {/* ========================================================
          CONTROLS
      ========================================================= */}

      <View
        style={styles.controls}
      >
        {/* STATUS */}

        {statusMessage ? (
          <View
            style={styles.statusRow}
          >
            {checkingFace ? (
              <ActivityIndicator
                size="small"
                color="#ffffff"
                style={
                  styles.statusSpinner
                }
              />
            ) : null}

            <Text
              style={[
                styles.statusText,
                statusIsError &&
                  styles.statusTextError,
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}

        {/* RETRY HINT */}

        {retryCount > 0 &&
        !checkingFace ? (
          <Text
            style={styles.retryHint}
          >
            No face detected yet. Make sure
            your face is centered and well lit,
            then try again.
          </Text>
        ) : null}

        {/* SHUTTER */}

        <Pressable
          style={({ pressed }) => [
            styles.captureButton,
            busy &&
              styles.capturing,
            pressed &&
              !busy &&
              styles.capturePressed,
          ]}
          onPress={
            handleCapture
          }
          disabled={busy}
        >
          {checkingFace ? (
            <ActivityIndicator
              color="#000000"
              size="small"
            />
          ) : (
            <View
              style={
                styles.captureInner
              }
            />
          )}
        </Pressable>

        <Text
          style={styles.hint}
        >
          Take a fresh photo — no gallery
          selection
        </Text>

        {/* BACK TO GPS */}

        <Pressable
          style={({ pressed }) => [
            styles.cancelTextButton,
            pressed &&
              styles.cancelTextButtonPressed,
          ]}
          onPress={handleBack}
          disabled={busy}
        >
          <Text
            style={
              styles.cancelText
            }
          >
            BACK
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * ============================================================
   * CONTAINER
   * ============================================================
   */

  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  /*
   * ============================================================
   * TOP BAR
   * ============================================================
   */

  topBar: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  topButtonPressed: {
    opacity: 0.6,
  },

  topButtonText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 36,
  },

  cameraBadge: {
    backgroundColor:
      'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  cameraBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  /*
   * ============================================================
   * ZOOM
   * ============================================================
   */

  zoomControls: {
    position: 'absolute',
    top: 110,
    left: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  zoomButtonPressed: {
    opacity: 0.6,
  },

  zoomButtonDisabled: {
    opacity: 0.35,
  },

  zoomButtonText: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 25,
  },

  zoomIndicator: {
    minWidth: 78,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 10,
  },

  zoomIndicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  /*
   * ============================================================
   * FACE GUIDE
   * ============================================================
   */

  guideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 230,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  faceGuide: {
    width: 220,
    height: 290,
    borderWidth: 2,
    borderColor:
      'rgba(255,255,255,0.75)',
    borderRadius: 110,
    alignItems: 'center',
    justifyContent:
      'flex-end',
    paddingBottom: 15,
  },

  guideText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor:
      'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  /*
   * ============================================================
   * CONTROLS
   * ============================================================
   */

  controls: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: 'center',
    backgroundColor: '#111111',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 10,
    minHeight: 20,
  },

  statusSpinner: {
    marginRight: 8,
  },

  statusText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },

  statusTextError: {
    color: '#f87171',
  },

  retryHint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    maxWidth: 340,
  },

  /*
   * ============================================================
   * SHUTTER
   * ============================================================
   */

  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      'transparent',
  },

  capturePressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  capturing: {
    opacity: 0.5,
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor:
      '#ffffff',
  },

  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },

  /*
   * ============================================================
   * BACK BUTTON
   * ============================================================
   */

  cancelTextButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },

  cancelTextButtonPressed: {
    opacity: 0.6,
  },

  cancelText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /*
   * ============================================================
   * PERMISSION SCREEN
   * ============================================================
   */

  permissionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 24,
  },

  permissionCancelButton: {
    position: 'absolute',
    top: 55,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  permissionCancelText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  permissionIcon: {
    fontSize: 52,
    marginBottom: 16,
  },

  permissionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },

  message: {
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  permissionButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  permissionBackButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },

  permissionBackText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },

  permissionLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor: '#000000',
  },

  permissionLoadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 12,
  },
});