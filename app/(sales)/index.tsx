import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAuth } from '@/src/features/auth/useAuth';

export default function SalesHomeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer
      title={`Hello, ${profile?.name ?? 'Sales'}`}
      subtitle="Verify your store attendance and spin for rewards"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Start Attendance</Text>
        <Text style={styles.cardText}>
          Select a store, verify your GPS location, take a fresh photo, and
          submit for backend validation.
        </Text>
        <PrimaryButton
          title="Select Store"
          onPress={() => router.push('/(sales)/stores')}
          style={styles.button}
        />
        <PrimaryButton
          title="GPS Prototype"
          variant="secondary"
          onPress={() => router.push('/(sales)/attendance')}
          style={styles.button}
        />
      </View>

      <PrimaryButton
        title="View History"
        variant="secondary"
        onPress={() => router.push('/(sales)/history')}
        style={styles.button}
      />

      <PrimaryButton title="Sign Out" variant="danger" onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
  },
  cardText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginBottom: 12,
  },
});
