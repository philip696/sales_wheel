import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';

export default function AttendanceResultScreen() {
  return (
    <ScreenContainer
      title="Attendance Result"
      subtitle="Backend validation result will appear here"
    >
      <View style={styles.placeholder}>
        <Text style={styles.text}>
          After submission, the server returns approved or rejected status.
          Only approved attendance unlocks the spin wheel.
        </Text>
      </View>

      <PrimaryButton
        title="Go to Spin Wheel"
        onPress={() => router.push('/(sales)/spin')}
        style={styles.button}
      />
      <PrimaryButton
        title="Back to Home"
        variant="secondary"
        onPress={() => router.replace('/(sales)')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  text: {
    color: '#64748b',
    lineHeight: 22,
  },
  button: {
    marginBottom: 12,
  },
});
