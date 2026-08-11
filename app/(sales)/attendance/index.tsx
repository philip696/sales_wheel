import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { logAuditEvent } from '@/src/services/auditService';
import type { GpsVerificationResult } from '@/src/types';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

/**
 * GPS verification prototype — preserved from initial development.
 * Client-side check is for UX only; backend performs final validation.
 *
 * Location is monitored continuously (re-read every 5s) rather than as a
 * single snapshot, so "within radius" reflects the user's live position
 * for as long as this screen is open.
 */
export default function AttendanceGpsScreen() {
  const { selectedStore } = useAttendanceFlow();
  const { gpsState, startWatching, stopWatching, verifyAgainstStore } =
    useGpsVerification();
  const [verification, setVerification] = useState<GpsVerificationResult | null>(
    null
  );
  const hasLoggedRejectionRef = useRef(false);

  useEffect(() => {
    if (selectedStore) {
      logAuditEvent({
        action: 'ATTENDANCE_STARTED',
        storeId: selectedStore.id,
      }).catch(() => undefined);
    }
  }, [selectedStore]);

  // Start live monitoring as soon as a store is selected, and stop it when
  // this screen goes away (navigating on, or the store selection changes).
  useEffect(() => {
    if (!selectedStore) {
      return;
    }

    hasLoggedRejectionRef.current = false;
    startWatching();

    return () => {
      stopWatching();
    };
  }, [selectedStore, startWatching, stopWatching]);

  // Recompute the radius check on every fresh GPS reading, not just once.
  useEffect(() => {
    if (!selectedStore || gpsState.latitude == null || gpsState.longitude == null) {
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

  const handleProceedToCamera = async () => {
    if (!selectedStore) {
      Alert.alert(
        'No Store Selected',
        'Please select a store first.',
        [{ text: 'Select Store', onPress: () => router.push('/(sales)/stores') }]
      );
      return;
    }

    if (!verification?.isWithinRadius) {
      if (selectedStore && verification && !hasLoggedRejectionRef.current) {
        hasLoggedRejectionRef.current = true;
        await logAuditEvent({
          action: 'GPS_REJECTED',
          storeId: selectedStore.id,
          metadata: {
            distance_meters: verification.distanceMeters,
            radius_meters: selectedStore.radius_meters,
          },
        });
      }
      Alert.alert(
        'Location Too Far',
        verification
          ? `You are ${verification.distanceMeters.toFixed(1)}m from the store. ` +
            `Maximum allowed: ${selectedStore.radius_meters}m. Location is checked ` +
            `every 5 seconds — move closer and this will update automatically.`
          : 'Waiting for a GPS fix. Make sure location services are enabled.'
      );
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
        <View style={styles.watchingRow}>
          <View
            style={[
              styles.watchingDot,
              gpsState.isWatching && styles.watchingDotActive,
            ]}
          />
          <Text style={styles.watchingLabel}>
            {gpsState.isWatching
              ? 'Live — refreshing every 5s'
              : 'Not monitoring'}
          </Text>
        </View>

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

        {gpsState.lastUpdatedAt ? (
          <>
            <Text style={styles.label}>Last Updated</Text>
            <Text style={styles.value}>
              {new Date(gpsState.lastUpdatedAt).toLocaleTimeString()}
            </Text>
          </>
        ) : null}

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
        title={
          gpsState.isLoading && !gpsState.isWatching
            ? 'Getting GPS...'
            : 'Continue to Camera'
        }
        loading={gpsState.isLoading && !gpsState.isWatching}
        onPress={handleProceedToCamera}
        style={styles.button}
      />

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
  watchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  watchingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginRight: 8,
  },
  watchingDotActive: {
    backgroundColor: '#16a34a',
  },
  watchingLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
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