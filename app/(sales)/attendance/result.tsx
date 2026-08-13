import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';

import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

export default function AttendanceResultScreen() {
  const {
    lastSubmission,
    selectedStore,
    setApprovedAttendance,
    clearApprovedAttendance,
    resetFlow,
  } = useAttendanceFlow();

  const isApproved =
    lastSubmission?.status === 'approved';

  const isPending =
    lastSubmission?.status === 'pending';

  const isRejected =
    lastSubmission?.status === 'rejected';

  /*
   * IMPORTANT:
   *
   * Do NOT call setApprovedAttendance() directly
   * while rendering the component.
   *
   * React considers that a state update to another
   * component while AttendanceResultScreen is rendering.
   *
   * useEffect runs after rendering, which fixes:
   *
   * "Cannot update a component while rendering a
   * different component"
   */
  useEffect(() => {
    if (
      isApproved &&
      selectedStore &&
      lastSubmission?.attendanceId
    ) {
      setApprovedAttendance(
        selectedStore.id,
        lastSubmission.attendanceId
      );

      return;
    }

    /*
     * If attendance isn't approved, make sure
     * an old approved attendance isn't left active.
     */
    if (!isApproved) {
      clearApprovedAttendance();
    }
  }, [
    isApproved,
    selectedStore?.id,
    lastSubmission?.attendanceId,
    setApprovedAttendance,
    clearApprovedAttendance,
  ]);

  /*
   * No attendance submission.
   */
  if (!lastSubmission) {
    return (
      <ScreenContainer
        title="Attendance Result"
        subtitle="Attendance"
      >
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>
            📍
          </Text>

          <Text style={styles.placeholderTitle}>
            No Attendance Found
          </Text>

          <Text style={styles.text}>
            There's no attendance submission to show.
            Start a new attendance check-in from the
            home screen.
          </Text>
        </View>

        <PrimaryButton
          title="START ATTENDANCE"
          onPress={() => {
            resetFlow();
            router.replace('/(sales)/stores');
          }}
          style={styles.button}
        />

        <PrimaryButton
          title="BACK TO HOME"
          variant="secondary"
          onPress={() => {
            resetFlow();
            router.replace('/(sales)');
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Attendance Result"
      subtitle={selectedStore?.name ?? 'Attendance'}
    >
      {/* ================================================= */}
      {/* RESULT */}
      {/* ================================================= */}

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
        <Text style={styles.statusIcon}>
          {isApproved
            ? '✓'
            : isPending
              ? '⏳'
              : '✕'}
        </Text>

        <Text style={styles.statusText}>
          {isApproved
            ? 'Attendance Approved'
            : isPending
              ? 'Pending Review'
              : 'Attendance Rejected'}
        </Text>

        {/* STORE */}

        {selectedStore ? (
          <>
            <Text style={styles.label}>
              STORE
            </Text>

            <Text style={styles.value}>
              {selectedStore.name}
            </Text>

            {selectedStore.store_code ? (
              <Text style={styles.storeCode}>
                {selectedStore.store_code}
              </Text>
            ) : null}
          </>
        ) : null}

        {/* DISTANCE */}

        <Text style={styles.label}>
          DISTANCE FROM STORE
        </Text>

        <Text style={styles.value}>
          {typeof lastSubmission.distanceMeters ===
          'number'
            ? `${lastSubmission.distanceMeters.toFixed(
                1
              )}m`
            : '-'}
        </Text>

        {/* REJECTION REASON */}

        {lastSubmission.rejectionReason ? (
          <>
            <Text style={styles.label}>
              REASON
            </Text>

            <Text style={styles.value}>
              {lastSubmission.rejectionReason}
            </Text>
          </>
        ) : null}

        {/* FOOTNOTE */}

        <Text style={styles.footnote}>
          {isApproved
            ? 'Attendance approved. This store is now unlocked for the Spin Wheel.'
            : isPending
              ? 'Your attendance is awaiting review. The Spin Wheel will remain locked until an admin approves it.'
              : 'This attendance was not approved. Please complete attendance again.'}
        </Text>
      </View>

      {/* ================================================= */}
      {/* APPROVED */}
      {/* ================================================= */}

      {isApproved && selectedStore ? (
        <View style={styles.unlockedBox}>
          <Text style={styles.unlockedIcon}>
            🎡
          </Text>

          <View style={styles.unlockedContent}>
            <Text style={styles.unlockedTitle}>
              Spin Wheel Unlocked
            </Text>

            <Text style={styles.unlockedText}>
              You can now spin the reward wheel for{' '}
              <Text style={styles.unlockedStore}>
                {selectedStore.name}
              </Text>
              .
            </Text>
          </View>
        </View>
      ) : null}

      {/* ================================================= */}
      {/* APPROVED → SPIN */}
      {/* ================================================= */}

      {isApproved ? (
        <PrimaryButton
          title="SPIN FOR THIS STORE"
          onPress={() =>
            router.push('/(sales)/spin')
          }
          style={styles.button}
        />
      ) : null}

      {/* ================================================= */}
      {/* PENDING */}
      {/* ================================================= */}

      {isPending ? (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingIcon}>
            ⏳
          </Text>

          <View style={styles.pendingContent}>
            <Text style={styles.pendingTitle}>
              Waiting for Admin Approval
            </Text>

            <Text style={styles.pendingText}>
              Your attendance has been submitted
              successfully. An admin needs to review
              and approve it before you can spin the
              wheel.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ================================================= */}
      {/* REJECTED */}
      {/* ================================================= */}

      {isRejected ? (
        <View style={styles.rejectedBox}>
          <Text style={styles.rejectedIcon}>
            ⚠️
          </Text>

          <View style={styles.rejectedContent}>
            <Text style={styles.rejectedTitle}>
              Attendance Rejected
            </Text>

            <Text style={styles.rejectedText}>
              Please complete attendance again. You
              will need a new approved attendance before
              you can use the Spin Wheel.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ================================================= */}
      {/* NEW ATTENDANCE */}
      {/* ================================================= */}

      {!isApproved ? (
        <PrimaryButton
          title="START NEW ATTENDANCE"
          onPress={() => {
            clearApprovedAttendance();

            router.replace(
              '/(sales)/stores'
            );
          }}
          style={styles.button}
        />
      ) : null}

      {/* ================================================= */}
      {/* HOME */}
      {/* ================================================= */}

      <PrimaryButton
        title="BACK TO HOME"
        variant="secondary"
        onPress={() => {
          router.replace('/(sales)');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * RESULT
   */

  resultBox: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },

  resultApproved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },

  resultPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },

  resultRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },

  statusIcon: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
    color: '#111827',
  },

  statusText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 14,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  storeCode: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },

  footnote: {
    marginTop: 16,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  /*
   * APPROVED
   */

  unlockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  unlockedIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  unlockedContent: {
    flex: 1,
  },

  unlockedTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e40af',
    marginBottom: 3,
  },

  unlockedText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },

  unlockedStore: {
    fontWeight: '800',
    color: '#1e40af',
  },

  /*
   * PENDING
   */

  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  pendingIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  pendingContent: {
    flex: 1,
  },

  pendingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400e',
    marginBottom: 3,
  },

  pendingText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },

  /*
   * REJECTED
   */

  rejectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  rejectedIcon: {
    fontSize: 26,
    marginRight: 12,
  },

  rejectedContent: {
    flex: 1,
  },

  rejectedTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#991b1b',
    marginBottom: 3,
  },

  rejectedText: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 17,
  },

  /*
   * EMPTY
   */

  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  placeholderIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  placeholderTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },

  text: {
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
  },

  /*
   * BUTTON
   */

  button: {
    marginBottom: 12,
  },
});