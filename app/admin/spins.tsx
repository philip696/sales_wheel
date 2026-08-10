import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export default function AdminSpinsScreen() {
  return (
    <ScreenContainer title="Spin History">
      <View style={styles.box}>
        <Text style={styles.text}>
          Monitor spin activity, rewards distributed, and duplicate spin attempts.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12 },
  text: { color: '#64748b', lineHeight: 22 },
});
