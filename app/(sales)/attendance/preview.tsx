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

  const [submitting, setSubmitting] =
    useState(false);

  /*
   * ============================================================
   * NO PHOTO
   * ============================================================
   */

  if (!photoUri) {
    console.log(
      '⚠️ ATTENDANCE PREVIEW: No photo URI'
    );

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

  /*
   * ============================================================
   * SUBMIT ATTENDANCE
   * ============================================================
   */

  const handleSubmit = async () => {
    console.log('');
    console.log(
      '================================================'
    );
    console.log(
      '🚀 ATTENDANCE SUBMISSION STARTED'
    );
    console.log(
      '================================================'
    );

    /*
     * ============================================================
     * STORE CHECK
     * ============================================================
     */

    if (!selectedStore) {
      console.error(
        '❌ ATTENDANCE ERROR: No store selected'
      );

      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
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

      return;
    }

    /*
     * ============================================================
     * DEBUG SELECTED STORE
     * ============================================================
     */

    console.log('');
    console.log(
      '🏪 SELECTED STORE'
    );

    console.log({
      id: selectedStore.id,
      store_code:
        selectedStore.store_code,
      name:
        selectedStore.name,
      address:
        selectedStore.address,
      latitude:
        selectedStore.latitude,
      longitude:
        selectedStore.longitude,
      radius_meters:
        selectedStore.radius_meters,
      status:
        selectedStore.status,
    });

    console.log(
      '🏪 STORE ID BEING USED:',
      selectedStore.id
    );

    console.log(
      '🏪 STORE NAME:',
      selectedStore.name
    );

    /*
     * ============================================================
     * DEBUG ORIGINAL PHOTO
     * ============================================================
     */

    console.log('');
    console.log(
      '📸 ORIGINAL PHOTO'
    );

    console.log(
      'Photo URI:',
      photoUri
    );

    setSubmitting(true);

    try {
      /*
       * ============================================================
       * STEP 1 — COMPRESS IMAGE
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📦 STEP 1 — COMPRESSING ATTENDANCE IMAGE'
      );
      console.log(
        '================================================'
      );

      console.log(
        'Original image:',
        photoUri
      );

      const compressedImage =
        await compressAttendanceImage(
          photoUri
        );

      console.log(
        '✅ IMAGE COMPRESSION SUCCESSFUL'
      );

      console.log({
        uri:
          compressedImage.uri,
        width:
          compressedImage.width,
        height:
          compressedImage.height,
      });

      console.log(
        'Compressed image URI:',
        compressedImage.uri
      );

      /*
       * ============================================================
       * STEP 2 — FACE DETECTION
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '👤 STEP 2 — FACE DETECTION'
      );
      console.log(
        '================================================'
      );

      console.log(
        'Sending compressed image to face detection:'
      );

      console.log(
        compressedImage.uri
      );

      const faceResult =
        await detectFace(
          compressedImage.uri
        );

      console.log(
        '👤 FACE DETECTION RESPONSE:'
      );

      console.log({
        hasFace:
          faceResult.hasFace,
        message:
          faceResult.message,
      });

      if (!faceResult.hasFace) {
        console.error(
          '❌ FACE DETECTION FAILED'
        );

        console.error(
          'Reason:',
          faceResult.message
        );

        Alert.alert(
          'No Face Detected',
          faceResult.message ||
            'Please make sure your face is clearly visible and try again.'
        );

        return;
      }

      console.log(
        '✅ FACE DETECTED'
      );

      /*
       * ============================================================
       * STEP 3 — GPS PERMISSION
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📍 STEP 3 — REQUESTING GPS PERMISSION'
      );
      console.log(
        '================================================'
      );

      const permitted =
        await requestPermission();

      console.log(
        'GPS permission:',
        permitted
          ? 'GRANTED'
          : 'DENIED'
      );

      if (!permitted) {
        console.error(
          '❌ GPS PERMISSION DENIED'
        );

        Alert.alert(
          'Location Required',
          'Location permission is required to submit attendance.'
        );

        return;
      }

      console.log(
        '✅ GPS PERMISSION GRANTED'
      );

      /*
       * ============================================================
       * STEP 4 — GET CURRENT GPS
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📍 STEP 4 — GETTING CURRENT GPS'
      );
      console.log(
        '================================================'
      );

      console.log(
        'Requesting current device location...'
      );

      const reading =
        await getCurrentPosition();

      if (!reading) {
        console.error(
          '❌ GPS READING FAILED'
        );

        Alert.alert(
          'Location Unavailable',
          'Could not get your current location. Check that location services are enabled and try again.'
        );

        return;
      }

      console.log(
        '✅ GPS READING RECEIVED'
      );

      console.log({
        latitude:
          reading.latitude,
        longitude:
          reading.longitude,
        accuracy:
          reading.accuracy,
        timestamp:
          reading.timestamp,
      });

      /*
       * ============================================================
       * STEP 5 — COMPARE GPS WITH STORE
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📍 GPS VS STORE'
      );
      console.log(
        '================================================'
      );

      console.log(
        'STORE LOCATION:',
        {
          latitude:
            selectedStore.latitude,
          longitude:
            selectedStore.longitude,
          radius:
            selectedStore.radius_meters,
        }
      );

      console.log(
        'USER LOCATION:',
        {
          latitude:
            reading.latitude,
          longitude:
            reading.longitude,
          accuracy:
            reading.accuracy,
        }
      );

      /*
       * ============================================================
       * STEP 6 — TIMESTAMP
       * ============================================================
       */

      const clientCapturedAt =
        new Date().toISOString();

      console.log('');
      console.log(
        '🕐 CLIENT CAPTURED AT:'
      );

      console.log(
        clientCapturedAt
      );

      /*
       * ============================================================
       * STEP 7 — BUILD EXACT PAYLOAD
       * ============================================================
       */

      const attendancePayload = {
        storeId:
          selectedStore.id,

        latitude:
          reading.latitude,

        longitude:
          reading.longitude,

        gpsAccuracy:
          reading.accuracy,

        clientCapturedAt,

        photoUri:
          compressedImage.uri,
      };

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📤 EXACT PAYLOAD SENT TO submitAttendance()'
      );
      console.log(
        '================================================'
      );

      console.log(
        JSON.stringify(
          attendancePayload,
          null,
          2
        )
      );

      console.log(
        '================================================'
      );

      /*
       * ============================================================
       * INDIVIDUAL PAYLOAD VALUES
       * ============================================================
       */

      console.log('');
      console.log(
        '📤 DATABASE SUBMISSION VALUES'
      );

      console.log(
        'storeId:',
        attendancePayload.storeId
      );

      console.log(
        'latitude:',
        attendancePayload.latitude
      );

      console.log(
        'longitude:',
        attendancePayload.longitude
      );

      console.log(
        'gpsAccuracy:',
        attendancePayload.gpsAccuracy
      );

      console.log(
        'clientCapturedAt:',
        attendancePayload.clientCapturedAt
      );

      console.log(
        'photoUri:',
        attendancePayload.photoUri
      );

      /*
       * ============================================================
       * STEP 8 — SUBMIT
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '🌐 STEP 5 — CALLING submitAttendance()'
      );
      console.log(
        '================================================'
      );

      const result =
        await submitAttendance(
          attendancePayload
        );

      /*
       * ============================================================
       * STEP 9 — BACKEND RESPONSE
       * ============================================================
       */

      console.log('');
      console.log(
        '================================================'
      );
      console.log(
        '📥 ATTENDANCE BACKEND RESPONSE'
      );
      console.log(
        '================================================'
      );

      console.log(
        JSON.stringify(
          result,
          null,
          2
        )
      );

      console.log(
        '================================================'
      );

      console.log(
        '✅ ATTENDANCE SUBMISSION SUCCESSFUL'
      );

      /*
       * ============================================================
       * STEP 10 — SAVE RESULT
       * ============================================================
       */

      setLastSubmission(
        result
      );

      console.log(
        '✅ Last submission saved to AttendanceFlowContext'
      );

      /*
       * ============================================================
       * STEP 11 — CLEAR PHOTO
       * ============================================================
       */

      setPhotoUri(null);

      console.log(
        '🧹 Photo URI cleared from AttendanceFlowContext'
      );

      /*
       * ============================================================
       * STEP 12 — NAVIGATE
       * ============================================================
       */

      console.log(
        '➡️ Navigating to attendance result...'
      );

      router.replace(
        '/(sales)/attendance/result'
      );

    } catch (error) {
      /*
       * ============================================================
       * ERROR
       * ============================================================
       */

      console.error('');
      console.error(
        '================================================'
      );
      console.error(
        '❌ ATTENDANCE SUBMISSION ERROR'
      );
      console.error(
        '================================================'
      );

      console.error(
        'Raw error:',
        error
      );

      if (error instanceof Error) {
        console.error(
          'Error name:',
          error.name
        );

        console.error(
          'Error message:',
          error.message
        );

        console.error(
          'Error stack:',
          error.stack
        );
      }

      console.error(
        '================================================'
      );

      Alert.alert(
        'Submission Failed',
        error instanceof Error
          ? error.message
          : 'Could not submit attendance. Please try again.'
      );

    } finally {
      /*
       * ============================================================
       * FINISH
       * ============================================================
       */

      console.log('');
      console.log(
        '🏁 ATTENDANCE SUBMISSION FLOW FINISHED'
      );
      console.log('');

      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Preview Photo"
      subtitle={
        selectedStore?.name ??
        'Attendance photo'
      }
    >
      {/* ========================================================
          PHOTO PREVIEW
      ========================================================= */}

      <View
        style={
          styles.imageContainer
        }
      >
        <Image
          source={{
            uri: photoUri,
          }}
          style={
            styles.image
          }
        />
      </View>

      {/* ========================================================
          SUBMIT
      ========================================================= */}

      <PrimaryButton
        title={
          submitting
            ? 'Checking & Submitting...'
            : 'Submit Attendance'
        }
        loading={
          submitting
        }
        disabled={
          submitting
        }
        onPress={
          handleSubmit
        }
      />

      {/* ========================================================
          RETAKE
      ========================================================= */}

      <PrimaryButton
        title="Retake"
        variant="secondary"
        disabled={
          submitting
        }
        onPress={() =>
          router.replace(
            '/(sales)/attendance/camera'
          )
        }
        style={
          styles.button
        }
      />
    </ScreenContainer>
  );
}

/*
 * ================================================================
 * STYLES
 * ================================================================
 */

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor:
      '#f1f5f9',
  },

  image: {
    flex: 1,
    resizeMode: 'contain',
  },

  button: {
    marginTop: 12,
  },
});