import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { logAuditEvent } from '@/src/services/auditService';
import type { GpsVerificationResult } from '@/src/types';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function AttendanceGpsScreen() {
  const { selectedStore } = useAttendanceFlow();

  const {
    gpsState,
    startWatching,
    stopWatching,
    verifyAgainstStore,
  } = useGpsVerification();

  const [verification, setVerification] =
    useState<GpsVerificationResult | null>(null);

  const hasLoggedRejectionRef = useRef(false);

  /*
   * -------------------------------------------------------
   * ATTENDANCE STARTED
   * -------------------------------------------------------
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
   * -------------------------------------------------------
   * START LIVE GPS MONITORING
   * -------------------------------------------------------
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
   * -------------------------------------------------------
   * VERIFY GPS AGAINST SELECTED STORE
   * -------------------------------------------------------
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

    const result = verifyAgainstStore(
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
   * -------------------------------------------------------
   * CONTINUE TO CAMERA
   * -------------------------------------------------------
   *
   * New flow:
   *
   * SELECT STORE
   *      ↓
   * GPS VERIFICATION
   *      ↓
   * FRESH CAMERA PHOTO
   *
   * Attendance is NOT submitted from this screen.
   */

  const handleProceedToCamera = async () => {
    /*
     * No store selected.
     */
    if (!selectedStore) {
      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
        [
          {
            text: 'Select Store',
            onPress: () =>
              router.replace('/(sales)/stores'),
          },
        ]
      );

      return;
    }

    /*
     * GPS has not been received yet.
     */
    if (!verification) {
      Alert.alert(
        'Waiting for GPS',
        'Please wait while we get your current location. Make sure location services are enabled.'
      );

      return;
    }

    /*
     * User is outside the store radius.
     */
    if (!verification.isWithinRadius) {
      if (
        !hasLoggedRejectionRef.current
      ) {
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
          'Move closer to the store and wait for the GPS verification to update.'
      );

      return;
    }

    /*
     * GPS VERIFIED.
     *
     * Now move to the camera screen.
     *
     * The camera screen is responsible for:
     *
     * 1. Opening the device camera
     * 2. Taking a fresh photo
     * 3. Preventing gallery selection
     * 4. Submitting attendance
     */

    router.push('/(sales)/attendance/camera');
  };

  /*
   * -------------------------------------------------------
   * SELECT STORE
   * -------------------------------------------------------
   */

  const handleSelectStore = () => {
    router.replace('/(sales)/stores');
  };

  return (
    <ScreenContainer
      title="GPS Verification"
      subtitle={
        selectedStore
          ? `${selectedStore.name} • ${selectedStore.radius_meters}m radius`
          : 'Select a store to continue'
      }
    >
      {/* ===================================================
          SELECTED STORE
      =================================================== */}

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

            <Text style={styles.storeCode}>
              {selectedStore.store_code}
            </Text>
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

      {/* ===================================================
          GPS INFORMATION
      =================================================== */}

      <View style={styles.infoBox}>
        <View style={styles.watchingRow}>
          <View
            style={[
              styles.watchingDot,
              gpsState.isWatching &&
                styles.watchingDotActive,
            ]}
          />

          <Text style={styles.watchingLabel}>
            {gpsState.isWatching
              ? 'GPS active — updating location'
              : 'GPS not monitoring'}
          </Text>
        </View>

        {/* Latitude */}

        <View style={styles.dataRow}>
          <Text style={styles.label}>
            Latitude
          </Text>

          <Text style={styles.value}>
            {gpsState.latitude != null
              ? gpsState.latitude.toFixed(6)
              : 'Waiting...'}
          </Text>
        </View>

        {/* Longitude */}

        <View style={styles.dataRow}>
          <Text style={styles.label}>
            Longitude
          </Text>

          <Text style={styles.value}>
            {gpsState.longitude != null
              ? gpsState.longitude.toFixed(6)
              : 'Waiting...'}
          </Text>
        </View>

        {/* Accuracy */}

        <View style={styles.dataRow}>
          <Text style={styles.label}>
            GPS Accuracy
          </Text>

          <Text style={styles.value}>
            {gpsState.accuracy != null
              ? `${gpsState.accuracy.toFixed(1)}m`
              : 'Waiting...'}
          </Text>
        </View>

        {/* Last Updated */}

        {gpsState.lastUpdatedAt ? (
          <View style={styles.dataRow}>
            <Text style={styles.label}>
              Last Updated
            </Text>

            <Text style={styles.valueSmall}>
              {new Date(
                gpsState.lastUpdatedAt
              ).toLocaleTimeString('id-ID')}
            </Text>
          </View>
        ) : null}

        {/* =================================================
            VERIFICATION RESULT
        ================================================== */}

        {verification ? (
          <View
            style={[
              styles.verificationBox,
              verification.isWithinRadius
                ? styles.verificationSuccess
                : styles.verificationFailed,
            ]}
          >
            <Text
              style={[
                styles.verificationIcon,
                verification.isWithinRadius
                  ? styles.successText
                  : styles.failedText,
              ]}
            >
              {verification.isWithinRadius
                ? '✓'
                : '✕'}
            </Text>

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
                Distance:{' '}
                {verification.distanceMeters.toFixed(
                  1
                )}
                m
              </Text>

              <Text
                style={
                  styles.verificationLimit
                }
              >
                Allowed:{' '}
                {selectedStore?.radius_meters ??
                  '—'}
                m
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={styles.waitingBox}
          >
            <ActivityIndicatorSmall />

            <View>
              <Text
                style={
                  styles.waitingTitle
                }
              >
                Checking Location
              </Text>

              <Text
                style={
                  styles.waitingText
                }
              >
                Waiting for a GPS fix...
              </Text>
            </View>
          </View>
        )}

        {/* GPS error */}

        {gpsState.error ? (
          <View
            style={styles.errorBox}
          >
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

      {/* ===================================================
          NEXT STEP
      =================================================== */}

      <View style={styles.nextStepCard}>
        <View style={styles.nextStepIcon}>
          <Text style={styles.nextStepEmoji}>
            📷
          </Text>
        </View>

        <View style={styles.nextStepContent}>
          <Text style={styles.nextStepLabel}>
            NEXT STEP
          </Text>

          <Text style={styles.nextStepTitle}>
            Take Fresh Attendance Photo
          </Text>

          <Text style={styles.nextStepText}>
            Your camera will open after your
            location is verified.
          </Text>
        </View>
      </View>

      {/* ===================================================
          CONTINUE BUTTON
      =================================================== */}

      <PrimaryButton
        title={
          gpsState.isLoading &&
          !gpsState.isWatching
            ? 'Getting GPS...'
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

      {/* ===================================================
          CHANGE STORE
      =================================================== */}

      <PrimaryButton
        title="Change Store"
        variant="secondary"
        onPress={handleSelectStore}
        style={styles.button}
      />

      {/* ===================================================
          FLOW INDICATOR
      =================================================== */}

      <View style={styles.flow}>
        <FlowStep
          number="1"
          title="Store"
          completed={!!selectedStore}
        />

        <View style={styles.flowLine} />

        <FlowStep
          number="2"
          title="GPS"
          completed={
            !!verification?.isWithinRadius
          }
          active={
            !verification?.isWithinRadius
          }
        />

        <View style={styles.flowLine} />

        <FlowStep
          number="3"
          title="Camera"
          active={
            !!verification?.isWithinRadius
          }
        />
      </View>
    </ScreenContainer>
  );
}

/*
 * =========================================================
 * SMALL GPS LOADING INDICATOR
 * =========================================================
 */

function ActivityIndicatorSmall() {
  return (
    <View style={styles.loadingCircle}>
      <Text style={styles.loadingCircleText}>
        •
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * FLOW STEP
 * =========================================================
 */

function FlowStep({
  number,
  title,
  completed = false,
  active = false,
}: {
  number: string;
  title: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.flowStep}>
      <View
        style={[
          styles.flowCircle,
          completed &&
            styles.flowCircleCompleted,
          active &&
            !completed &&
            styles.flowCircleActive,
        ]}
      >
        <Text
          style={[
            styles.flowNumber,
            (completed || active) &&
              styles.flowNumberActive,
          ]}
        >
          {completed ? '✓' : number}
        </Text>
      </View>

      <Text
        style={[
          styles.flowTitle,
          (completed || active) &&
            styles.flowTitleActive,
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
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
    marginBottom: 12,
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

  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

  label: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  valueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  verificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 22,
    fontWeight: '900',
    marginRight: 11,
  },

  verificationContent: {
    flex: 1,
  },

  verificationTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  verificationDistance: {
    marginTop: 3,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },

  verificationLimit: {
    marginTop: 2,
    fontSize: 10,
    color: '#94a3b8',
  },

  successText: {
    color: '#15803d',
  },

  failedText: {
    color: '#b91c1c',
  },

  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },

  loadingCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  loadingCircleText: {
    fontSize: 24,
    color: '#2563eb',
    lineHeight: 25,
  },

  waitingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1d4ed8',
  },

  waitingText: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },

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

  button: {
    marginBottom: 10,
  },

  flow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },

  flowStep: {
    alignItems: 'center',
    width: 55,
  },

  flowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flowCircleCompleted: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },

  flowCircleActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },

  flowNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },

  flowNumberActive: {
    color: '#2563eb',
  },

  flowTitle: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },

  flowTitleActive: {
    color: '#2563eb',
  },

  flowLine: {
    width: 35,
    height: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 15,
  },
});