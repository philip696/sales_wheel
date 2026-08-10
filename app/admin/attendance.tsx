import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export default function AdminAttendanceScreen() {
  return (
    <ScreenContainer title="Attendance Monitoring">
      <View style={styles.box}>
        <Text style={styles.text}>
          View all attendance records, photos, GPS data, and rejection reasons.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12 },
  text: { color: '#64748b', lineHeight: 22 },
});
