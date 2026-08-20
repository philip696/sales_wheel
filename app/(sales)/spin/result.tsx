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
  const rewardName = reward?.name;
  const rewardValue = reward?.value;

  return (
    <ScreenContainer
      title="Your Reward"
      subtitle="Your reward has been revealed"
    >
      <View style={styles.container}>
        {/* ================================================= */}
        {/* SUCCESS BADGE */}
        {/* ================================================= */}

        <View style={styles.successBadge}>
          <View style={styles.successDot} />

          <Text style={styles.successBadgeText}>
            REWARD UNLOCKED
          </Text>
        </View>

        {/* ================================================= */}
        {/* RESULT CARD */}
        {/* ================================================= */}

        <View style={styles.card}>
          {/* ================================================= */}
          {/* CELEBRATION */}
          {/* ================================================= */}

          <View style={styles.celebrationCircle}>
            <Text style={styles.emoji}>
              🎉
            </Text>
          </View>

          <Text style={styles.title}>
            Congratulations!
          </Text>

          <Text style={styles.subtitleText}>
            You won a reward from this store visit.
          </Text>

          {/* ================================================= */}
          {/* WHAT THEY WON */}
          {/* ================================================= */}

          {reward ? (
            <View style={styles.rewardSection}>
              <Text style={styles.rewardLabel}>
                YOU WON
              </Text>

              {/* MAIN REWARD NAME */}

              <Text style={styles.rewardName}>
                {reward.name}
              </Text>

              {/* REWARD VALUE */}

              {reward.value ? (
                <View style={styles.rewardValueBox}>
                  <Text style={styles.rewardValueLabel}>
                    YOUR REWARD
                  </Text>

                  <Text style={styles.rewardValue}>
                    {reward.name}
                  </Text>
                </View>
              ) : null}

              {/* EXPLANATION */}

              <Text style={styles.rewardDescription}>
                This is the reward you received from
                today's Spin Wheel.
              </Text>
            </View>
          ) : (
            <View style={styles.noRewardBox}>
              <Text style={styles.noRewardIcon}>
                ⚠️
              </Text>

              <Text style={styles.noRewardTitle}>
                Reward Information Missing
              </Text>

              <Text style={styles.noReward}>
                No reward information was returned
                from the Spin Wheel.
              </Text>
            </View>
          )}

          {/* ================================================= */}
          {/* STORE */}
          {/* ================================================= */}

          {selectedStore ? (
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoEmoji}>
                  📍
                </Text>
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
                Your reward has been recorded for
                this store visit.
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* SPIN REFERENCE */}
          {/* ================================================= */}

          {lastSpin?.spinId ? (
            <View style={styles.spinIdBox}>
              <Text style={styles.spinIdLabel}>
                SPIN REFERENCE
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
          Your reward was selected from the active
          rewards configured by the administrator.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * =========================================================
   * CONTAINER
   * =========================================================
   */

  container: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 24,
  },

  /*
   * =========================================================
   * SUCCESS BADGE
   * =========================================================
   */

  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },

  successDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },

  successBadgeText: {
    color: '#15803d',
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emoji: {
    fontSize: 46,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitleText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
  },

  /*
   * =========================================================
   * REWARD SECTION
   * =========================================================
   */

  rewardSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#86efac',
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  rewardLabel: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },

  /*
   * =========================================================
   * MAIN WIN
   * =========================================================
   */

  rewardName: {
    color: '#166534',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },

  /*
   * =========================================================
   * VALUE
   * =========================================================
   */

  rewardValueBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    marginBottom: 12,
  },

  rewardValueLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  rewardValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  rewardDescription: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  /*
   * =========================================================
   * NO REWARD
   * =========================================================
   */

  noRewardBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },

  noRewardIcon: {
    fontSize: 25,
    marginBottom: 6,
  },

  noRewardTitle: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 5,
  },

  noReward: {
    color: '#dc2626',
    fontSize: 12,
    lineHeight: 18,
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

  infoEmoji: {
    fontSize: 18,
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