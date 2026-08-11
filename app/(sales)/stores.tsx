import { router } from 'expo-router';
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

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { config } from '@/src/lib/config';
import { searchStores } from '@/src/services/storeService';
import type { Store } from '@/src/types';

export default function StoresScreen() {
  const { setSelectedStore } = useAttendanceFlow();

  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async (searchQuery: string) => {
    if (!config.isSupabaseConfigured) {
      setError(
        'Supabase is not configured. Check your .env file and restart the app.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchStores({
        query: searchQuery,
        page: 1,
        pageSize: 20,
      });

      setStores(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load stores'
      );
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
    <ScreenContainer
      title="Select Store"
      subtitle="Choose the store you are visiting today"
    >
      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>

        <TextInput
          style={styles.search}
          placeholder="Search store name or code..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => loadStores(query)}
          returnKeyType="search"
          autoCapitalize="none"
        />

        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              loadStores('');
            }}
          >
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          AVAILABLE STORES
        </Text>

        {!loading && !error ? (
          <Text style={styles.storeCount}>
            {stores.length} {stores.length === 1 ? 'store' : 'stores'}
          </Text>
        ) : null}
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />

          <Text style={styles.loadingText}>
            Loading stores...
          </Text>
        </View>
      ) : error ? (
        /* Error */
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorTitle}>
            Unable to load stores
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => loadStores(query)}
          >
            <Text style={styles.retryText}>
              TRY AGAIN
            </Text>
          </Pressable>
        </View>
      ) : (
        /* Store List */
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            stores.length === 0
              ? styles.emptyList
              : styles.listContent
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.storeItem,
                pressed && styles.storeItemPressed,
              ]}
              onPress={() => handleSelectStore(item)}
            >
              {/* Store Icon */}
              <View style={styles.storeIcon}>
                <Text style={styles.storeEmoji}>🏪</Text>
              </View>

              {/* Store Information */}
              <View style={styles.storeInfo}>
                <Text
                  style={styles.storeName}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <Text style={styles.storeCode}>
                  {item.store_code}
                </Text>

                {item.address ? (
                  <Text
                    style={styles.storeAddress}
                    numberOfLines={2}
                  >
                    {item.address}
                  </Text>
                ) : null}

                <View style={styles.radiusBadge}>
                  <Text style={styles.radiusText}>
                    📍 {item.radius_meters}m GPS radius
                  </Text>
                </View>
              </View>

              {/* Arrow */}
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>
                  ›
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyEmoji}>
                  🏪
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                No Stores Found
              </Text>

              <Text style={styles.emptyText}>
                {query
                  ? 'Try searching with a different store name or code.'
                  : 'There are currently no active stores available.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Footer */}
      {!loading && !error && stores.length > 0 ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Select a store to begin attendance verification.
          </Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 52,
    marginBottom: 20,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  search: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },

  clear: {
    fontSize: 15,
    color: '#94a3b8',
    padding: 4,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1,
  },

  storeCount: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },

  listContent: {
    paddingBottom: 10,
  },

  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  storeItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },

  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  storeEmoji: {
    fontSize: 22,
  },

  storeInfo: {
    flex: 1,
    minWidth: 0,
  },

  storeName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },

  storeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },

  storeAddress: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
    marginBottom: 6,
  },

  radiusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  radiusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },

  arrowContainer: {
    marginLeft: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    fontSize: 23,
    color: '#94a3b8',
    lineHeight: 25,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#94a3b8',
  },

  errorCard: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },

  errorIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#991b1b',
    marginBottom: 6,
  },

  errorText: {
    fontSize: 11,
    color: '#b91c1c',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  retryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  emptyList: {
    flexGrow: 1,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyEmoji: {
    fontSize: 32,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
  },

  footer: {
    paddingTop: 8,
    paddingBottom: 4,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
  },
});