import { ScreenContainer } from '@/src/components/ScreenContainer';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const REWARDS = [
  {
    name: '10% OFF',
    icon: '🏷️',
    probability: '—',
    status: 'Active',
  },
  {
    name: 'FREE ITEM',
    icon: '🎁',
    probability: '—',
    status: 'Active',
  },
  {
    name: '5% OFF',
    icon: '💰',
    probability: '—',
    status: 'Active',
  },
  {
    name: 'TRY AGAIN',
    icon: '🔄',
    probability: '—',
    status: 'Active',
  },
];

export default function AdminRewardsScreen() {
  return (
    <ScreenContainer
      title="Reward Management"
      subtitle="Configure rewards and spin probabilities"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Spin Rewards</Text>
            <Text style={styles.headerText}>
              Manage rewards available on the sales spin wheel.
            </Text>
          </View>

          <Text style={styles.headerIcon}>🎁</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Total Chance</Text>
          </View>
        </View>

        {/* Rewards */}
        <Text style={styles.sectionTitle}>Available Rewards</Text>

        {REWARDS.map((reward) => (
          <Pressable
            key={reward.name}
            style={({ pressed }) => [
              styles.rewardCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rewardIcon}>
              <Text style={styles.emoji}>{reward.icon}</Text>
            </View>

            <View style={styles.rewardContent}>
              <Text style={styles.rewardName}>{reward.name}</Text>

              <Text style={styles.rewardProbability}>
                Probability: {reward.probability}
              </Text>
            </View>

            <View style={styles.rightSide}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{reward.status}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>
        ))}

        {/* Backend note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Server-side configuration</Text>

          <Text style={styles.infoText}>
            Reward probabilities are controlled by the backend. Changes made
            here will eventually be saved to the rewards table and used by the
            server-side spin logic.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },

  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 5,
  },

  headerText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 260,
  },

  headerIcon: {
    fontSize: 42,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  rewardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.7,
  },

  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  emoji: {
    fontSize: 25,
  },

  rewardContent: {
    flex: 1,
  },

  rewardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  rewardProbability: {
    fontSize: 12,
    color: '#64748b',
  },

  rightSide: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  statusBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  statusText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '700',
  },

  arrow: {
    fontSize: 22,
    color: '#94a3b8',
    marginTop: 3,
  },

  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 19,
  },
});