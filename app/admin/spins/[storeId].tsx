import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
    getSpinsForStore,
    type StoreSpinEntry,
} from '@/src/services/adminSpinService';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function StoreSpinHistoryScreen() {
  const { storeId, storeName } = useLocalSearchParams<{
    storeId: string;
    storeName?: string;
  }>();

  const [spins, setSpins] = useState<StoreSpinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setError(null);
    try {
      const result = await getSpinsForStore(storeId);
      setSpins(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load spin history.'
      );
    }
  }, [storeId]);

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
    <ScreenContainer
      title={storeName ?? 'Store Spin History'}
      subtitle={`${spins.length} ${spins.length === 1 ? 'spin' : 'spins'} recorded`}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={spins}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No spins have happened at this store yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.rewardName}>
                  {item.rewardName ?? 'No reward'}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'completed' && styles.statusCompleted,
                    item.status === 'rejected' && styles.statusRejected,
                    item.status === 'pending' && styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              {item.rewardValue ? (
                <Text style={styles.rewardValue}>{item.rewardValue}</Text>
              ) : null}

              <Text style={styles.salesName}>
                {item.salesName} <Text style={styles.salesCode}>({item.salesCode})</Text>
              </Text>
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
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
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    flexShrink: 1,
  },
  rewardValue: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusPending: {
    backgroundColor: '#fef9c3',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  salesName: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
    marginTop: 10,
  },
  salesCode: {
    fontWeight: '400',
    color: '#64748b',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});