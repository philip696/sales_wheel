import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';

export default function SpinScreen() {
  return (
    <ScreenContainer
      title="Spin Wheel"
      subtitle="One spin per store per day — enforced by backend"
    >
      <View style={styles.wheelPlaceholder}>
        <Text style={styles.wheelText}>🎡</Text>
        <Text style={styles.hint}>
          Spin animation goes here. Reward is determined server-side via
          `request_spin` RPC.
        </Text>
      </View>

      <PrimaryButton
        title="Request Spin"
        onPress={() => router.push('/(sales)/spin/result')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wheelPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
  },
  wheelText: {
    fontSize: 64,
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 22,
  },
});
