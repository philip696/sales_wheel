import { ScreenContainer } from '@/src/components/ScreenContainer';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const SPIN_RECORDS = [
  {
    name: 'Sales Representative',
    reward: '10% OFF',
    time: '—',
    status: 'Approved',
  },
  {
    name: 'Sales Representative',
    reward: 'FREE ITEM',
    time: '—',
    status: 'Approved',
  },
  {
    name: 'Sales Representative',
    reward: 'TRY AGAIN',
    time: '—',
    status: 'Approved',
  },
];

export default function AdminSpinsScreen() {
  return (
    <ScreenContainer
      title="Spin History"
      subtitle="Monitor spin activity and rewards"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Spin Activity</Text>

            <Text style={styles.headerText}>
              Monitor spins, rewards distributed, and duplicate spin attempts.
            </Text>
          </View>

          <Text style={styles.headerIcon}>🎡</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Total Spins</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Duplicates</Text>
          </View>
        </View>

        {/* Filters */}
        <Text style={styles.sectionTitle}>Recent Spins</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterActive}>
            <Text style={styles.filterActiveText}>All</Text>
          </View>

          <View style={styles.filter}>
            <Text style={styles.filterText}>Today</Text>
          </View>

          <View style={styles.filter}>
            <Text style={styles.filterText}>Duplicates</Text>
          </View>
        </View>

        {/* Records */}
        {SPIN_RECORDS.map((spin, index) => (
          <Pressable
            key={`${spin.name}-${index}`}
            style={({ pressed }) => [
              styles.spinCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🎡</Text>
            </View>

            <View style={styles.spinContent}>
              <Text style={styles.salesName}>{spin.name}</Text>

              <Text style={styles.reward}>
                Reward: {spin.reward}
              </Text>

              <Text style={styles.time}>
                {spin.time}
              </Text>
            </View>

            <View style={styles.rightSide}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{spin.status}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>
        ))}

        {/* Empty/backend information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Server-side spin validation</Text>

          <Text style={styles.infoText}>
            Spin results are determined by the backend. This screen will
            display the actual spin history, rewards distributed, and
            duplicate attempts once the existing spin service is connected.
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

  headerContent: {
    flex: 1,
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
  },

  headerIcon: {
    fontSize: 42,
    marginLeft: 12,
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

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  filterActive: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  filterActiveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  filter: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  filterText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },

  spinCard: {
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

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    fontSize: 22,
  },

  spinContent: {
    flex: 1,
  },

  salesName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  reward: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 3,
  },

  time: {
    fontSize: 11,
    color: '#94a3b8',
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