import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export default function AdminStoresScreen() {
  return (
    <ScreenContainer title="Store Management">
      <View style={styles.box}>
        <Text style={styles.text}>
          Create and manage stores with configurable radius_meters, coordinates,
          and status.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12 },
  text: { color: '#64748b', lineHeight: 22 },
});
