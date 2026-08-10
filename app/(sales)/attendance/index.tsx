import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { logAuditEvent } from '@/src/services/auditService';
import type { GpsVerificationResult } from '@/src/types';

/**
 * GPS verification prototype — preserved from initial development.
 * Client-side check is for UX only; backend performs final validation.
 */
export default function AttendanceGpsScreen() {
  const { selectedStore } = useAttendanceFlow();
  const { gpsState, getCurrentPosition, verifyAgainstStore } =
    useGpsVerification();
  const [verification, setVerification] = useState<GpsVerificationResult | null>(
    null
  );

  useEffect(() => {
    if (selectedStore) {
      logAuditEvent({
        action: 'ATTENDANCE_STARTED',
        storeId: selectedStore.id,
      }).catch(() => undefined);
    }
  }, [selectedStore]);

  const handleStartAttendance = async () => {
    if (!selectedStore) {
      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
        [{ text: 'Select Store', onPress: () => router.push('/(sales)/stores') }]
      );
      return;
    }

    const reading = await getCurrentPosition();
    if (!reading) {
      return;
    }

    const result = verifyAgainstStore(
      selectedStore,
      reading.latitude,
      reading.longitude,
      reading.accuracy
    );

    setVerification(result);

    if (!result.isWithinRadius) {
      await logAuditEvent({
        action: 'GPS_REJECTED',
        storeId: selectedStore.id,
        metadata: {
          distance_meters: result.distanceMeters,
          radius_meters: selectedStore.radius_meters,
        },
      });
      Alert.alert(
        'Location Too Far',
        `You are ${result.distanceMeters.toFixed(1)}m from the store. ` +
          `Maximum allowed: ${selectedStore.radius_meters}m.`
      );
    }
  };

  const handleProceedToCamera = () => {
    if (!verification?.isWithinRadius) {
      Alert.alert('GPS Not Valid', 'You must be within the store radius.');
      return;
    }
    router.push('/(sales)/attendance/camera');
  };

  return (
    <ScreenContainer
      title="GPS Verification"
      subtitle={
        selectedStore
          ? `${selectedStore.name} (${selectedStore.radius_meters}m radius)`
          : 'No store selected — use dev mode or select a store'
      }
    >
      <View style={styles.infoBox}>
        <Text style={styles.label}>Latitude</Text>
        <Text style={styles.value}>
          {gpsState.latitude?.toFixed(6) ?? '—'}
        </Text>

        <Text style={styles.label}>Longitude</Text>
        <Text style={styles.value}>
          {gpsState.longitude?.toFixed(6) ?? '—'}
        </Text>

        <Text style={styles.label}>GPS Accuracy</Text>
        <Text style={styles.value}>
          {gpsState.accuracy != null
            ? `${gpsState.accuracy.toFixed(1)}m`
            : '—'}
        </Text>

        {verification ? (
          <>
            <Text style={styles.label}>Distance to Store</Text>
            <Text style={styles.value}>
              {verification.distanceMeters.toFixed(1)}m
            </Text>

            <Text style={styles.label}>Within Radius?</Text>
            <Text
              style={[
                styles.status,
                verification.isWithinRadius
                  ? styles.statusOk
                  : styles.statusFail,
              ]}
            >
              {verification.isWithinRadius ? 'YES' : 'NO'}
            </Text>
          </>
        ) : null}

        {gpsState.error ? (
          <Text style={styles.error}>{gpsState.error}</Text>
        ) : null}
      </View>

      <PrimaryButton
        title={gpsState.isLoading ? 'Getting GPS...' : 'Start Attendance'}
        loading={gpsState.isLoading}
        onPress={handleStartAttendance}
        style={styles.button}
      />

      {verification?.isWithinRadius ? (
        <PrimaryButton
          title="Continue to Camera"
          onPress={handleProceedToCamera}
        />
      ) : null}

      {!selectedStore ? (
        <PrimaryButton
          title="Select Store"
          variant="secondary"
          onPress={() => router.push('/(sales)/stores')}
          style={styles.button}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    fontFamily: 'SpaceMono',
  },
  status: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statusOk: {
    color: '#16a34a',
  },
  statusFail: {
    color: '#dc2626',
  },
  error: {
    color: '#dc2626',
    marginTop: 12,
  },
  button: {
    marginBottom: 12,
  },
});
