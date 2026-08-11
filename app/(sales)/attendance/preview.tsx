import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { submitAttendance } from '@/src/services/attendanceService';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';

export default function AttendancePreviewScreen() {
  const { photoUri, selectedStore, setLastSubmission, setPhotoUri } =
    useAttendanceFlow();
  const { requestPermission, getCurrentPosition } = useGpsVerification();
  const [submitting, setSubmitting] = useState(false);

  if (!photoUri) {
    return (
      <ScreenContainer title="No Photo">
        <PrimaryButton
          title="Retake"
          onPress={() => router.replace('/(sales)/attendance/camera')}
        />
      </ScreenContainer>
    );
  }

  const handleSubmit = async () => {
    if (!selectedStore) {
      Alert.alert('No Store Selected', 'Please select a store first.', [
        { text: 'OK', onPress: () => router.replace('/(sales)/stores') },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      // Every submission captures a fresh GPS fix and timestamp right now —
      // never the reading from the earlier GPS-check screen, which could be
      // stale by the time the photo was taken and reviewed.
      const permitted = await requestPermission();
      if (!permitted) {
        Alert.alert(
          'Location Required',
          'Location permission is required to submit attendance.'
        );
        return;
      }

      const reading = await getCurrentPosition();
      if (!reading) {
        Alert.alert(
          'Location Unavailable',
          'Could not get your current location. Check that location services are enabled and try again.'
        );
        return;
      }

      const result = await submitAttendance({
        storeId: selectedStore.id,
        latitude: reading.latitude,
        longitude: reading.longitude,
        gpsAccuracy: reading.accuracy,
        clientCapturedAt: new Date().toISOString(),
        photoUri,
      });

      setLastSubmission(result);
      // Photo has been uploaded and the flow is moving to the result screen —
      // clear the local photo reference so a stray back-navigation can't
      // resubmit the same capture.
      setPhotoUri(null);
      router.replace('/(sales)/attendance/result');
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error instanceof Error
          ? error.message
          : 'Could not submit attendance. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title="Preview Photo"
      subtitle={selectedStore?.name ?? 'Attendance photo'}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: photoUri }} style={styles.image} />
      </View>

      <PrimaryButton
        title={submitting ? 'Submitting...' : 'Submit Attendance'}
        loading={submitting}
        onPress={handleSubmit}
      />
      <PrimaryButton
        title="Retake"
        variant="secondary"
        disabled={submitting}
        onPress={() => router.replace('/(sales)/attendance/camera')}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  image: {
    flex: 1,
    resizeMode: 'contain',
  },
  button: {
    marginTop: 12,
  },
});