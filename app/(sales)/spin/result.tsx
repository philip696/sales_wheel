import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';

export default function SpinResultScreen() {
  return (
    <ScreenContainer title="Your Reward" subtitle="Result from backend">
      <View style={styles.resultBox}>
        <Text style={styles.rewardName}>—</Text>
        <Text style={styles.rewardValue}>
          Reward details returned by server after spin
        </Text>
      </View>

      <PrimaryButton
        title="Back to Home"
        onPress={() => router.replace('/(sales)')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resultBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  rewardName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  rewardValue: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
  },
});
