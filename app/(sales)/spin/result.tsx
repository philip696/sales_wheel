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
      subtitle="Spin completed successfully"
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>
            🎉
          </Text>

          <Text style={styles.title}>
            Congratulations!
          </Text>

          {reward ? (
            <>
              <Text style={styles.rewardLabel}>
                YOU WON
              </Text>

              <Text style={styles.rewardName}>
                {reward.name}
              </Text>

              {reward.value ? (
                <Text style={styles.rewardValue}>
                  {reward.value}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.noReward}>
              No reward information was returned.
            </Text>
          )}

          {selectedStore ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>
                STORE
              </Text>

              <Text style={styles.infoValue}>
                {selectedStore.name}
              </Text>
            </View>
          ) : null}

          {lastSpin?.spinId ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>
                SPIN ID
              </Text>

              <Text
                style={styles.spinId}
                numberOfLines={1}
              >
                {lastSpin.spinId}
              </Text>
            </View>
          ) : null}

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              ✓ SPIN COMPLETED
            </Text>
          </View>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() =>
              router.replace('/(sales)')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.homeButtonText}>
              BACK TO HOME
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
  },

  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },

  rewardLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  rewardName: {
    color: '#16a34a',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  rewardValue: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 22,
  },

  noReward: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 22,
  },

  infoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },

  infoLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
  },

  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },

  spinId: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
  },

  statusBox: {
    width: '100%',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },

  statusText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },

  homeButton: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  homeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});