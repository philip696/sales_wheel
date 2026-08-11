import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAuth } from '@/src/features/auth/useAuth';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ADMIN_SECTIONS = [
  {
    title: 'Attendance',
    description: 'Monitor attendance, GPS and photos',
    icon: '📋',
    route: '/admin/attendance',
  },
  {
    title: 'Spin History',
    description: 'View sales spin activity and rewards',
    icon: '🎡',
    route: '/admin/spins',
  },
  {
    title: 'Stores',
    description: 'Manage registered stores',
    icon: '🏪',
    route: '/admin/stores',
  },
  {
    title: 'Sales Team',
    description: 'Manage sales users',
    icon: '👥',
    route: '/admin/sales',
  },
  {
    title: 'Rewards',
    description: 'Manage available rewards',
    icon: '🎁',
    route: '/admin/rewards',
  },
] as const;

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer
      title="Admin Dashboard"
      subtitle={`Welcome back, ${profile?.name ?? 'Admin'}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Overview */}
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏪</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Stores</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎡</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Spins</Text>
          </View>
        </View>

        {/* Management */}
        <Text style={styles.sectionTitle}>Management</Text>

        {ADMIN_SECTIONS.map((section) => (
          <Pressable
            key={section.route}
            style={({ pressed }) => [
              styles.menuCard,
              pressed && styles.menuCardPressed,
            ]}
            onPress={() => router.push(section.route)}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{section.icon}</Text>
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{section.title}</Text>
              <Text style={styles.menuDescription}>
                {section.description}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

        {/* Backend note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Dashboard Status</Text>
          <Text style={styles.infoText}>
            Live statistics and management data will be loaded from
            Supabase when the backend services are connected.
          </Text>
        </View>

        {/* Sign out */}
        <PrimaryButton
          title="Sign Out"
          variant="danger"
          onPress={signOut}
          style={styles.signOut}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  menuCardPressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  icon: {
    fontSize: 24,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  menuDescription: {
    fontSize: 12,
    color: '#64748b',
  },

  arrow: {
    fontSize: 28,
    color: '#94a3b8',
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 18,
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

  signOut: {
    marginBottom: 10,
  },
});