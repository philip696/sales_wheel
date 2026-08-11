import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AttendanceResultScreen() {
  const { lastSubmission, selectedStore, resetFlow } = useAttendanceFlow();

  if (!lastSubmission) {
    return (
      <ScreenContainer
        title="Attendance Result"
        subtitle="No recent submission found"
      >
        <View style={styles.placeholder}>
          <Text style={styles.text}>
            There's no attendance submission to show. Start a new attendance
            check-in from the home screen.
          </Text>
        </View>
        <PrimaryButton
          title="Back to Home"
          onPress={() => {
            resetFlow();
            router.replace('/(sales)');
          }}
        />
      </ScreenContainer>
    );
  }

  const isApproved = lastSubmission.status === 'approved';
  const isPending = lastSubmission.status === 'pending';

  return (
    <ScreenContainer
      title="Attendance Result"
      subtitle={selectedStore?.name ?? undefined}
    >
      <View
        style={[
          styles.resultBox,
          isApproved
            ? styles.resultApproved
            : isPending
              ? styles.resultPending
              : styles.resultRejected,
        ]}
      >
        <Text style={styles.statusText}>
          {isApproved ? 'Approved' : isPending ? 'Pending Review' : 'Rejected'}
        </Text>

        <Text style={styles.label}>Distance from Store</Text>
        <Text style={styles.value}>
          {lastSubmission.distanceMeters.toFixed(1)}m
        </Text>

        {lastSubmission.rejectionReason ? (
          <>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{lastSubmission.rejectionReason}</Text>
          </>
        ) : null}

        <Text style={styles.footnote}>
          {isApproved
            ? 'Attendance approved — you can spin for a reward.'
            : isPending
              ? 'Your attendance is awaiting review.'
              : 'This attendance was not approved. You can start over.'}
        </Text>
      </View>

      {isApproved ? (
        <PrimaryButton
          title="Go to Spin Wheel"
          onPress={() => router.push('/(sales)/spin')}
          style={styles.button}
        />
      ) : null}

      <PrimaryButton
        title="Back to Home"
        variant="secondary"
        onPress={() => {
          resetFlow();
          router.replace('/(sales)');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resultBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultApproved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  resultPending: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
  },
  resultRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  footnote: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  text: {
    color: '#64748b',
    lineHeight: 22,
  },
  button: {
    marginBottom: 12,
  },
});