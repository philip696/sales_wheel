import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { logAuditEvent } from '@/src/services/auditService';
import type { GpsVerificationResult } from '@/src/types';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AttendanceGpsScreen() {
  const {
    selectedStore,
    resetFlow,
  } = useAttendanceFlow();

  const {
    gpsState,
    startWatching,
    stopWatching,
    verifyAgainstStore,
  } = useGpsVerification();

  const [
    verification,
    setVerification,
  ] = useState<GpsVerificationResult | null>(
    null
  );

  const hasLoggedRejectionRef =
    useRef(false);

  /*
   * ============================================================
   * ATTENDANCE STARTED
   * ============================================================
   */

  useEffect(() => {
    if (!selectedStore) {
      return;
    }

    logAuditEvent({
      action: 'ATTENDANCE_STARTED',
      storeId: selectedStore.id,
    }).catch(() => undefined);
  }, [selectedStore]);

  /*
   * ============================================================
   * START LIVE GPS MONITORING
   * ============================================================
   */

  useEffect(() => {
    if (!selectedStore) {
      return;
    }

    hasLoggedRejectionRef.current = false;

    startWatching();

    return () => {
      stopWatching();
    };
  }, [
    selectedStore,
    startWatching,
    stopWatching,
  ]);

  /*
   * ============================================================
   * VERIFY GPS AGAINST SELECTED STORE
   * ============================================================
   *
   * IMPORTANT:
   * GPS coordinates are still being used internally.
   *
   * They are simply NOT displayed on the screen anymore.
   */

  useEffect(() => {
    if (
      !selectedStore ||
      gpsState.latitude == null ||
      gpsState.longitude == null
    ) {
      setVerification(null);
      return;
    }

    const result =
      verifyAgainstStore(
        selectedStore,
        gpsState.latitude,
        gpsState.longitude,
        gpsState.accuracy
      );

    setVerification(result);
  }, [
    selectedStore,
    gpsState.latitude,
    gpsState.longitude,
    gpsState.accuracy,
    verifyAgainstStore,
  ]);

  /*
   * ============================================================
   * CANCEL ATTENDANCE
   * ============================================================
   */

  const handleCancelAttendance = () => {
    stopWatching();
    resetFlow();

    router.replace('/(sales)');
  };

  /*
   * ============================================================
   * CONTINUE TO CAMERA
   * ============================================================
   */

  const handleProceedToCamera = async () => {
    /*
     * ----------------------------------------------------------
     * NO STORE
     * ----------------------------------------------------------
     */

    if (!selectedStore) {
      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
        [
          {
            text: 'Select Store',
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
     * ----------------------------------------------------------
     * GPS NOT READY
     * ----------------------------------------------------------
     */

    if (!verification) {
      Alert.alert(
        'Waiting for Location',
        'Please wait while we verify your location. Make sure location services are enabled.'
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * OUTSIDE STORE RADIUS
     * ----------------------------------------------------------
     */

    if (!verification.isWithinRadius) {
      if (!hasLoggedRejectionRef.current) {
        hasLoggedRejectionRef.current = true;

        await logAuditEvent({
          action: 'GPS_REJECTED',
          storeId: selectedStore.id,
          metadata: {
            distance_meters:
              verification.distanceMeters,
            radius_meters:
              selectedStore.radius_meters,
          },
        }).catch(() => undefined);
      }

      Alert.alert(
        'Location Too Far',
        `You are ${verification.distanceMeters.toFixed(
          1
        )}m from the store.\n\n` +
          `Maximum allowed distance: ${selectedStore.radius_meters}m.\n\n` +
          'Move closer to the store and wait for the location verification to update.'
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * LOCATION VERIFIED
     * ----------------------------------------------------------
     */

    router.push(
      '/(sales)/attendance/camera'
    );
  };

  /*
   * ============================================================
   * CHANGE STORE
   * ============================================================
   */

  const handleSelectStore = () => {
    stopWatching();

    router.replace(
      '/(sales)/stores'
    );
  };

  /*
   * ============================================================
   * SCREEN
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Verify Location"
      subtitle={
        selectedStore
          ? selectedStore.name
          : 'Select a store to continue'
      }
    >
      {/* ======================================================
          TOP BAR
      ======================================================= */}

      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />

        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed &&
              styles.cancelButtonPressed,
          ]}
          onPress={
            handleCancelAttendance
          }
          hitSlop={10}
        >
          <Text
            style={styles.cancelButtonText}
          >
            ✕
          </Text>
        </Pressable>
      </View>

      {/* ======================================================
          SELECTED STORE
      ======================================================= */}

      {selectedStore ? (
        <View style={styles.storeCard}>
          <View style={styles.storeIcon}>
            <Text style={styles.storeEmoji}>
              🏪
            </Text>
          </View>

          <View style={styles.storeInfo}>
            <Text style={styles.storeLabel}>
              SELECTED STORE
            </Text>

            <Text
              style={styles.storeName}
              numberOfLines={2}
            >
              {selectedStore.name}
            </Text>

            {selectedStore.store_code ? (
              <Text
                style={styles.storeCode}
              >
                {selectedStore.store_code}
              </Text>
            ) : null}
          </View>

          <View style={styles.radiusBadge}>
            <Text style={styles.radiusText}>
              {selectedStore.radius_meters}m
            </Text>

            <Text style={styles.radiusLabel}>
              radius
            </Text>
          </View>
        </View>
      ) : null}

      {/* ======================================================
          LOCATION VERIFICATION
      ======================================================= */}

      <View style={styles.infoBox}>
        {/* ----------------------------------------------------
            GPS STATUS
        ----------------------------------------------------- */}

        <View style={styles.watchingRow}>
          <View
            style={[
              styles.watchingDot,
              gpsState.isWatching &&
                styles.watchingDotActive,
            ]}
          />

          <Text
            style={styles.watchingLabel}
          >
            {gpsState.isWatching
              ? 'Location verification active'
              : 'Location verification inactive'}
          </Text>
        </View>

        {/* ----------------------------------------------------
            VERIFICATION RESULT
        ----------------------------------------------------- */}

        {verification ? (
          <View
            style={[
              styles.verificationBox,
              verification.isWithinRadius
                ? styles.verificationSuccess
                : styles.verificationFailed,
            ]}
          >
            <View
              style={[
                styles.verificationIcon,
                verification.isWithinRadius
                  ? styles.verificationIconSuccess
                  : styles.verificationIconFailed,
              ]}
            >
              <Text
                style={[
                  styles.verificationIconText,
                  verification.isWithinRadius
                    ? styles.successText
                    : styles.failedText,
                ]}
              >
                {verification.isWithinRadius
                  ? '✓'
                  : '×'}
              </Text>
            </View>

            <View
              style={
                styles.verificationContent
              }
            >
              <Text
                style={[
                  styles.verificationTitle,
                  verification.isWithinRadius
                    ? styles.successText
                    : styles.failedText,
                ]}
              >
                {verification.isWithinRadius
                  ? 'Location Verified'
                  : 'Outside Store Radius'}
              </Text>

              <Text
                style={
                  styles.verificationDistance
                }
              >
                {verification.isWithinRadius
                  ? 'You are at the correct store location.'
                  : 'Move closer to the store to continue.'}
              </Text>

              <Text
                style={
                  styles.verificationLimit
                }
              >
                Required radius:{' '}
                {selectedStore?.radius_meters ??
                  '—'}
                m
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.waitingBox}>
            <View
              style={styles.loadingCircle}
            >
              <Text
                style={
                  styles.loadingCircleText
                }
              >
                •
              </Text>
            </View>

            <View>
              <Text
                style={styles.waitingTitle}
              >
                Checking Location
              </Text>

              <Text
                style={styles.waitingText}
              >
                Verifying that you are at the
                selected store...
              </Text>
            </View>
          </View>
        )}

        {/* ----------------------------------------------------
            GPS ERROR
        ----------------------------------------------------- */}

        {gpsState.error ? (
          <View style={styles.errorBox}>
            <Text
              style={styles.errorIcon}
            >
              ⚠️
            </Text>

            <Text
              style={styles.errorText}
            >
              {gpsState.error}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ======================================================
          NEXT STEP
      ======================================================= */}

      <View
        style={styles.nextStepCard}
      >
        <View
          style={styles.nextStepIcon}
        >
          <Text
            style={styles.nextStepEmoji}
          >
            📷
          </Text>
        </View>

        <View
          style={styles.nextStepContent}
        >
          <Text
            style={styles.nextStepLabel}
          >
            NEXT STEP
          </Text>

          <Text
            style={styles.nextStepTitle}
          >
            Take Fresh Attendance Photo
          </Text>

          <Text
            style={styles.nextStepText}
          >
            Your camera will open once your
            location has been verified.
          </Text>
        </View>
      </View>

      {/* ======================================================
          CONTINUE
      ======================================================= */}

      <PrimaryButton
        title={
          gpsState.isLoading &&
          !gpsState.isWatching
            ? 'Checking Location...'
            : verification?.isWithinRadius
              ? 'Continue to Camera'
              : 'Verify My Location'
        }
        loading={
          gpsState.isLoading &&
          !gpsState.isWatching
        }
        onPress={
          handleProceedToCamera
        }
        style={styles.button}
      />

      {/* ======================================================
          CHANGE STORE
      ======================================================= */}

      <PrimaryButton
        title="Change Store"
        variant="secondary"
        onPress={handleSelectStore}
        style={styles.button}
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
  /* =========================================================
     TOP BAR
  ========================================================= */

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  topBarSpacer: {
    flex: 1,
  },

  cancelButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonPressed: {
    opacity: 0.6,
  },

  cancelButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#64748b',
  },

  /* =========================================================
     STORE CARD
  ========================================================= */

  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },

  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  storeEmoji: {
    fontSize: 23,
  },

  storeInfo: {
    flex: 1,
    minWidth: 0,
  },

  storeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  storeName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#172554',
  },

  storeCode: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },

  radiusBadge: {
    marginLeft: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  radiusText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563eb',
  },

  radiusLabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
  },

  /* =========================================================
     LOCATION INFO
  ========================================================= */

  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  watchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  watchingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
    marginRight: 8,
  },

  watchingDotActive: {
    backgroundColor: '#16a34a',
  },

  watchingLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },

  /* =========================================================
     VERIFICATION
  ========================================================= */

  verificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },

  verificationSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },

  verificationFailed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },

  verificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  verificationIconSuccess: {
    backgroundColor: '#dcfce7',
  },

  verificationIconFailed: {
    backgroundColor: '#fee2e2',
  },

  verificationIconText: {
    fontSize: 24,
    fontWeight: '900',
  },

  verificationContent: {
    flex: 1,
  },

  verificationTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  verificationDistance: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '600',
  },

  verificationLimit: {
    marginTop: 3,
    fontSize: 10,
    color: '#94a3b8',
  },

  successText: {
    color: '#15803d',
  },

  failedText: {
    color: '#b91c1c',
  },

  /* =========================================================
     WAITING
  ========================================================= */

  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },

  loadingCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  loadingCircleText: {
    fontSize: 25,
    color: '#2563eb',
    lineHeight: 26,
  },

  waitingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1d4ed8',
  },

  waitingText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
  },

  /* =========================================================
     ERROR
  ========================================================= */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  errorIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#b91c1c',
  },

  /* =========================================================
     NEXT STEP
  ========================================================= */

  nextStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },

  nextStepIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  nextStepEmoji: {
    fontSize: 21,
  },

  nextStepContent: {
    flex: 1,
  },

  nextStepLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },

  nextStepTitle: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  nextStepText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
  },

  /* =========================================================
     BUTTON
  ========================================================= */

  button: {
    marginBottom: 10,
  },
});