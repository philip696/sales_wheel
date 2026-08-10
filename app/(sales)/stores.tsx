import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { searchStores } from '@/src/services/storeService';
import { config } from '@/src/lib/config';
import type { Store } from '@/src/types';

export default function StoresScreen() {
  const { setSelectedStore } = useAttendanceFlow();
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async (searchQuery: string) => {
    if (!config.isSupabaseConfigured) {
      setError('Supabase is not configured. Check your .env file and restart the app.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await searchStores({ query: searchQuery, page: 1, pageSize: 20 });
      setStores(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores('');
  }, [loadStores]);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    router.push('/(sales)/attendance');
  };

  return (
    <ScreenContainer title="Select Store" subtitle="Search and choose your store">
      <TextInput
        style={styles.search}
        placeholder="Search by name or code..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => loadStores(query)}
        returnKeyType="search"
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.storeItem} onPress={() => handleSelectStore(item)}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.storeMeta}>
                {item.store_code} · {item.radius_meters}m radius
              </Text>
              {item.address ? (
                <Text style={styles.storeAddress}>{item.address}</Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No active stores found.</Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  loader: {
    marginTop: 24,
  },
  error: {
    color: '#dc2626',
    marginTop: 12,
  },
  storeItem: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  storeMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  storeAddress: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
  },
});
