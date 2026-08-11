// app/index.tsx
import { useAuth } from '@/src/features/auth/useAuth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Not logged in -> go to login
      router.replace('/auth/login');
    } else if (profile?.role === 'admin') {
      // Logged in as Admin
      router.replace('/admin');
    } else {
      // Logged in as Sales
      router.replace('/(sales)');
    }
  }, [user, profile, isLoading]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#111827" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});