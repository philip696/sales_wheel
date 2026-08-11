import { ScreenContainer } from '@/src/components/ScreenContainer';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const SALES_USERS = [
  {
    name: 'Sales Representative',
    role: 'Sales',
    status: 'Active',
    initials: 'SR',
  },
  {
    name: 'Sales Representative',
    role: 'Sales',
    status: 'Active',
    initials: 'SR',
  },
];

export default function AdminSalesScreen() {
  return (
    <ScreenContainer
      title="Sales Management"
      subtitle="Manage sales representatives and accounts"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Sales Team</Text>

            <Text style={styles.headerText}>
              Manage sales representatives, roles, and account status.
            </Text>
          </View>

          <Text style={styles.headerIcon}>👥</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {/* Sales list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Representatives</Text>

          <Text style={styles.sectionCount}>— users</Text>
        </View>

        {SALES_USERS.map((user, index) => (
          <Pressable
            key={`${user.name}-${index}`}
            style={({ pressed }) => [
              styles.userCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.initials}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>

              <Text style={styles.userRole}>
                Role: {user.role}
              </Text>
            </View>

            <View style={styles.userRight}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{user.status}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>
        ))}

        {/* Backend note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Account Management</Text>

          <Text style={styles.infoText}>
            Sales representatives, roles, and account status will be loaded
            from the existing authentication and Supabase backend.
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
    maxWidth: 280,
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

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  sectionCount: {
    fontSize: 12,
    color: '#64748b',
  },

  userCard: {
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
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  userRole: {
    fontSize: 12,
    color: '#64748b',
  },

  userRight: {
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