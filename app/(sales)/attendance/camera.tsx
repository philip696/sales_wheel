import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { logAuditEvent } from '@/src/services/auditService';

/**
 * Camera-only capture — no gallery picker allowed in normal flow.
 */
export default function AttendanceCameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { selectedStore, setPhotoUri } = useAttendanceFlow();
  const [capturing, setCapturing] = useState(false);

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

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) {
      return;
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

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
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        <Pressable
          style={[styles.captureButton, capturing && styles.capturing]}
          onPress={handleCapture}
          disabled={capturing}
        >
          <View style={styles.captureInner} />
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
