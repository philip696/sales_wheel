import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
  listStoresWithSpinCounts,
  type StoreSpinSummary,
} from '@/src/services/adminSpinService';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AdminSpinsScreen() {
  const [stores, setStores] = useState<StoreSpinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listStoresWithSpinCounts();
      setStores(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load spin activity.'
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScreenContainer title="Spin Activity" subtitle="Tap a store to see its history">
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.storeId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stores found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/admin/spins/[storeId]',
                  params: { storeId: item.storeId, storeName: item.storeName },
                })
              }
            >
              <Text style={styles.storeName} numberOfLines={2}>
                {item.storeName}
              </Text>
              <Text style={styles.storeCode}>{item.storeCode}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {item.spinCount} {item.spinCount === 1 ? 'spin' : 'spins'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 24,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  storeCode: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
});