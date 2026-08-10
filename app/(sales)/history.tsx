import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export default function HistoryScreen() {
  return (
    <ScreenContainer
      title="History"
      subtitle="Attendance and spin history"
    >
      <View style={styles.placeholder}>
        <Text style={styles.text}>
          History will load from Supabase via attendanceService and spinService
          once the attendance transaction flow is wired up.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  text: {
    color: '#64748b',
    lineHeight: 22,
  },
});
