import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { submitAttendance } from '@/src/services/attendanceService';
import { detectFace } from '@/src/services/faceDetectionService';
import { compressAttendanceImage } from '@/src/services/imageCompressionService';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  View,
} from 'react-native';

export default function AttendancePreviewScreen() {
  const {
    photoUri,
    selectedStore,
    setLastSubmission,
    setPhotoUri,
  } = useAttendanceFlow();

  const {
    requestPermission,
    getCurrentPosition,
  } = useGpsVerification();

  const [submitting, setSubmitting] = useState(false);

  if (!photoUri) {
    return (
      <ScreenContainer title="No Photo">
        <PrimaryButton
          title="Retake"
          onPress={() =>
            router.replace(
              '/(sales)/attendance/camera'
            )
          }
        />
      </ScreenContainer>
    );
  }

  const handleSubmit = async () => {
    if (!selectedStore) {
      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace('/(sales)/stores'),
          },
        ]
      );

      return;
    }

    setSubmitting(true);

    try {
      /*
       * ----------------------------------------------------------
       * 1. Compress the attendance image FIRST.
       *
       * This is now the image that will be used for both:
       * - face detection
       * - attendance upload
       * ----------------------------------------------------------
       */
      console.log('Compressing attendance image...');

      const compressedImage =
        await compressAttendanceImage(photoUri);

      console.log(
        'Attendance image compressed:',
        {
          uri: compressedImage.uri,
          width: compressedImage.width,
          height: compressedImage.height,
        }
      );

      /*
       * ----------------------------------------------------------
       * 2. Run face detection against the compressed image.
       * ----------------------------------------------------------
       */
      console.log(
        'Running face detection on compressed image...'
      );

      const faceResult = await detectFace(
        compressedImage.uri
      );

      console.log(
        'Face detection result:',
        faceResult
      );

      if (!faceResult.hasFace) {
        Alert.alert(
          'No Face Detected',
          faceResult.message ||
            'Please make sure your face is clearly visible and try again.'
        );

        return;
      }

      /*
       * ----------------------------------------------------------
       * 3. Face exists, so continue with GPS verification.
       * ----------------------------------------------------------
       */
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

      const clientCapturedAt =
        new Date().toISOString();

      /*
       * ----------------------------------------------------------
       * 4. Submit the COMPRESSED image.
       *
       * IMPORTANT:
       * Do NOT pass the original photoUri here.
       *
       * Passing compressedImage.uri means attendanceService
       * receives the already-compressed image and uploads it.
       * ----------------------------------------------------------
       */
      console.log(
        'Submitting compressed attendance image...'
      );

      const result = await submitAttendance({
        storeId: selectedStore.id,
        latitude: reading.latitude,
        longitude: reading.longitude,
        gpsAccuracy: reading.accuracy,
        clientCapturedAt,

        // THIS IS THE IMPORTANT CHANGE:
        photoUri: compressedImage.uri,
      });

      /*
       * ----------------------------------------------------------
       * 5. Save the server result.
       * ----------------------------------------------------------
       */
      setLastSubmission(result);

      /*
       * Clear local photo after successful submission.
       */
      setPhotoUri(null);

      router.replace(
        '/(sales)/attendance/result'
      );
    } catch (error) {
      console.error(
        'ATTENDANCE SUBMISSION ERROR:',
        error
      );

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
      subtitle={
        selectedStore?.name ?? 'Attendance photo'
      }
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: photoUri }}
          style={styles.image}
        />
      </View>

      <PrimaryButton
        title={
          submitting
            ? 'Checking & Submitting...'
            : 'Submit Attendance'
        }
        loading={submitting}
        disabled={submitting}
        onPress={handleSubmit}
      />

      <PrimaryButton
        title="Retake"
        variant="secondary"
        disabled={submitting}
        onPress={() =>
          router.replace(
            '/(sales)/attendance/camera'
          )
        }
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