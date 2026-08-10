import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAuth } from '@/src/features/auth/useAuth';

const ADMIN_SECTIONS = [
  { title: 'Attendance Monitoring', route: '/admin/attendance' },
  { title: 'Spin History', route: '/admin/spins' },
  { title: 'Store Management', route: '/admin/stores' },
  { title: 'Sales Management', route: '/admin/sales' },
  { title: 'Reward Management', route: '/admin/rewards' },
] as const;

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer
      title="Admin Dashboard"
      subtitle={`Logged in as ${profile?.name ?? 'Admin'}`}
    >
      <View style={styles.sections}>
        {ADMIN_SECTIONS.map((section) => (
          <PrimaryButton
            key={section.route}
            title={section.title}
            variant="secondary"
            onPress={() => router.push(section.route)}
            style={styles.button}
          />
        ))}
      </View>

      <Text style={styles.note}>
        Admin screens are scaffolded. Full CRUD and monitoring UI comes in the
        next phase.
      </Text>

      <PrimaryButton title="Sign Out" variant="danger" onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sections: {
    flex: 1,
    marginBottom: 16,
  },
  button: {
    marginBottom: 10,
  },
  note: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});
