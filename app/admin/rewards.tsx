import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export default function AdminRewardsScreen() {
  return (
    <ScreenContainer title="Reward Management">
      <View style={styles.box}>
        <Text style={styles.text}>
          Configure rewards and probabilities. Server-side spin logic reads from
          this table.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12 },
  text: { color: '#64748b', lineHeight: 22 },
});
