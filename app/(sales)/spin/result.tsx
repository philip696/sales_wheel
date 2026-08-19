import { router } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

export default function SpinResultScreen() {
  const {
    selectedStore,
    lastSpin,
  } = useAttendanceFlow();

  const reward = lastSpin?.reward;

  return (
    <ScreenContainer
      title="Your Reward"
      subtitle="Your reward has been revealed"
    >
      <View style={styles.container}>
        {/* ================================================= */}
        {/* DEMO BADGE */}
        {/* ================================================= */}

        <View style={styles.demoBadge}>
          <View style={styles.demoDot} />

          <Text style={styles.demoBadgeText}>
            DEMO REWARD
          </Text>
        </View>

        {/* ================================================= */}
        {/* RESULT CARD */}
        {/* ================================================= */}

        <View style={styles.card}>
          {/* CELEBRATION */}

          <View style={styles.celebrationCircle}>
            <Text style={styles.emoji}>
              🎉
            </Text>
          </View>

          <Text style={styles.title}>
            Congratulations!
          </Text>

          <Text style={styles.subtitle}>
            You've unlocked a reward from
            today's store visit.
          </Text>

          {/* ================================================= */}
          {/* REWARD */}
          {/* ================================================= */}

          {reward ? (
            <View style={styles.rewardSection}>
              <Text style={styles.rewardLabel}>
                YOU WON
              </Text>

              <Text style={styles.rewardName}>
                {reward.name}
              </Text>

              {reward.value ? (
                <View style={styles.rewardValueBox}>
                  <Text style={styles.rewardValue}>
                    {reward.value}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.noRewardBox}>
              <Text style={styles.noReward}>
                No reward information was returned.
              </Text>
            </View>
          )}

          {/* ================================================= */}
          {/* STORE */}
          {/* ================================================= */}

          {selectedStore ? (
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Text>📍</Text>
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  STORE
                </Text>

                <Text style={styles.infoValue}>
                  {selectedStore.name}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ================================================= */}
          {/* STATUS */}
          {/* ================================================= */}

          <View style={styles.statusBox}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                REWARD CLAIMED
              </Text>

              <Text style={styles.statusDescription}>
                This visit's reward has been completed.
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* SPIN ID */}
          {/* ================================================= */}

          {lastSpin?.spinId ? (
            <View style={styles.spinIdBox}>
              <Text style={styles.spinIdLabel}>
                DEMO SPIN REFERENCE
              </Text>

              <Text
                style={styles.spinId}
                numberOfLines={1}
              >
                {lastSpin.spinId}
              </Text>
            </View>
          ) : null}

          {/* ================================================= */}
          {/* HOME */}
          {/* ================================================= */}

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() =>
              router.replace('/(sales)')
            }
            activeOpacity={0.85}
          >
            <Text style={styles.homeButtonText}>
              BACK TO HOME
            </Text>

            <Text style={styles.homeArrow}>
              →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <Text style={styles.footer}>
          Reward selection is currently running in
          demo mode.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 24,
  },

  /*
   * =========================================================
   * DEMO BADGE
   * =========================================================
   */

  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },

  demoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginRight: 6,
  },

  demoBadgeText: {
    color: '#c2410c',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /*
   * =========================================================
   * CARD
   * =========================================================
   */

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 22,
    alignItems: 'center',

    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },

  /*
   * =========================================================
   * CELEBRATION
   * =========================================================
   */

  celebrationCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emoji: {
    fontSize: 42,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 22,
  },

  /*
   * =========================================================
   * REWARD
   * =========================================================
   */

  rewardSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  rewardLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  rewardName: {
    color: '#16a34a',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  rewardValueBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },

  rewardValue: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  noRewardBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  noReward: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },

  /*
   * =========================================================
   * STORE
   * =========================================================
   */

  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },

  infoValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  statusBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  statusIconText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },

  statusDescription: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
  },

  /*
   * =========================================================
   * SPIN ID
   * =========================================================
   */

  spinIdBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },

  spinIdLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },

  spinId: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  /*
   * =========================================================
   * HOME BUTTON
   * =========================================================
   */

  homeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 15,
    paddingVertical: 16,
  },

  homeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  homeArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },

  /*
   * =========================================================
   * FOOTER
   * =========================================================
   */

  footer: {
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});