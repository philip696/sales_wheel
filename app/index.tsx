import { useAuth } from '@/src/features/auth/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function IndexScreen() {
  const { session, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.brandWrapper}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={38} color="#2563eb" />
          </View>
          <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (isAdmin) {
    return <Redirect href="/admin" />;
  }

  return <Redirect href="/(sales)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  brandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  spinner: {
    transform: [{ scale: 1.1 }],
  },
});