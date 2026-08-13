import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useAuth } from '@/src/features/auth/useAuth';

export default function SalesHomeScreen() {
  const { profile, signOut } = useAuth();

  const {
    selectedStore,
    lastSubmission,
    spinCompleted,
  } = useAttendanceFlow();

  return (
    <ScreenContainer
      title={`Hello, ${profile?.name ?? 'Sales'}`}
      subtitle="Manage your store visits and rewards"
    >
      {/* ===================================================== */}
      {/* WELCOME */}
      {/* ===================================================== */}

      <View style={styles.welcomeCard}>
        <View style={styles.welcomeIcon}>
          <Text style={styles.welcomeEmoji}>👋</Text>
        </View>

        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>
            Ready for today's visits?
          </Text>

          <Text style={styles.welcomeText}>
            Complete your store attendance to participate
            in today's reward program.
          </Text>
        </View>
      </View>

      {/* ===================================================== */}
      {/* ATTENDANCE */}
      {/* ===================================================== */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          STORE ATTENDANCE
        </Text>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardEmoji}>📍</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              Start Attendance
            </Text>

            <Text style={styles.cardText}>
              Select your store, verify your GPS
              location, and take a fresh photo.
            </Text>
          </View>

          <PrimaryButton
            title="SELECT STORE"
            onPress={() =>
              router.push('/(sales)/stores')
            }
          />
        </View>
      </View>

      {/* ===================================================== */}
      {/* ATTENDANCE STATUS */}
      {/* ===================================================== */}

      {lastSubmission ? (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>
              CURRENT ATTENDANCE
            </Text>

            <View
              style={[
                styles.statusBadge,
                lastSubmission.status === 'approved'
                  ? styles.statusApproved
                  : lastSubmission.status === 'pending'
                    ? styles.statusPending
                    : styles.statusRejected,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {lastSubmission.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {selectedStore ? (
            <Text style={styles.statusStore}>
              📍 {selectedStore.name}
            </Text>
          ) : null}

          <Text style={styles.statusDescription}>
            {spinCompleted
              ? 'Attendance completed and reward already claimed.'
              : lastSubmission.status === 'approved'
                ? 'Attendance approved. Continue through the attendance result to access your reward.'
                : lastSubmission.status === 'pending'
                  ? 'Your attendance is waiting for admin approval.'
                  : 'Attendance was rejected. Please complete attendance again.'}
          </Text>
        </View>
      ) : null}

      {/* ===================================================== */}
      {/* REWARD COMPLETED */}
      {/* ===================================================== */}

      {spinCompleted ? (
        <View style={styles.completedCard}>
          <View style={styles.completedIcon}>
            <Text style={styles.completedEmoji}>
              🎉
            </Text>
          </View>

          <Text style={styles.completedTitle}>
            Reward Claimed
          </Text>

          <Text style={styles.completedText}>
            You have already spun the reward wheel
            for this attendance.
          </Text>

          {selectedStore ? (
            <Text style={styles.completedStore}>
              📍 {selectedStore.name}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ===================================================== */}
      {/* HISTORY */}
      {/* ===================================================== */}

      <View style={styles.historyCard}>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle}>
            📋 Visit History
          </Text>

          <Text style={styles.historyText}>
            View your previous attendance and
            rewards.
          </Text>
        </View>

        <PrimaryButton
          title="VIEW"
          variant="secondary"
          onPress={() =>
            router.push('/(sales)/history')
          }
        />
      </View>

      {/* ===================================================== */}
      {/* SIGN OUT */}
      {/* ===================================================== */}

      <PrimaryButton
        title="SIGN OUT"
        variant="danger"
        onPress={signOut}
        style={styles.signOut}
      />

      <Text style={styles.footer}>
        Store attendance and rewards are securely
        validated by the server.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /* ========================================================= */
  /* WELCOME */
  /* ========================================================= */

  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 17,
    padding: 16,
    marginBottom: 22,
  },

  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  welcomeEmoji: {
    fontSize: 23,
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e40af',
    marginBottom: 4,
  },

  welcomeText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },

  /* ========================================================= */
  /* SECTIONS */
  /* ========================================================= */

  section: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 8,
  },

  /* ========================================================= */
  /* ATTENDANCE */
  /* ========================================================= */

  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 17,
    padding: 16,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  cardEmoji: {
    fontSize: 23,
  },

  cardContent: {
    marginBottom: 13,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 5,
  },

  cardText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 17,
  },

  /* ========================================================= */
  /* CURRENT ATTENDANCE */
  /* ========================================================= */

  statusCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  statusTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  statusApproved: {
    backgroundColor: '#dcfce7',
  },

  statusPending: {
    backgroundColor: '#fef3c7',
  },

  statusRejected: {
    backgroundColor: '#fee2e2',
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#334155',
  },

  statusStore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  statusDescription: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 17,
  },

  /* ========================================================= */
  /* REWARD COMPLETED */
  /* ========================================================= */

  completedCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 17,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
  },

  completedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  completedEmoji: {
    fontSize: 25,
  },

  completedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 5,
  },

  completedText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 6,
  },

  completedStore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },

  /* ========================================================= */
  /* HISTORY */
  /* ========================================================= */

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
  },

  historyContent: {
    flex: 1,
    marginRight: 10,
  },

  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 3,
  },

  historyText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  /* ========================================================= */
  /* FOOTER */
  /* ========================================================= */

  signOut: {
    marginBottom: 12,
  },

  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 9,
    lineHeight: 14,
    marginBottom: 10,
  },
});