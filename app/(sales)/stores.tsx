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

  /*
   * ============================================================
   * LOAD STORES
   * ============================================================
   */

  const loadStores = useCallback(
    async (searchQuery: string) => {
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
          query: searchQuery.trim(),
          page: 1,
          pageSize: 20,
        });

        setStores(result.data);
      } catch (err) {
        console.error(
          'SALES STORE LOAD ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load stores'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    loadStores('');
  }, [loadStores]);

  /*
   * ============================================================
   * SELECT STORE
   * ============================================================
   *
   * Sales flow:
   *
   * Select Store
   *      ↓
   * GPS Verification
   *      ↓
   * Fresh Camera Photo
   *      ↓
   * Submit Attendance
   */

  const handleSelectStore = (
    store: Store
  ) => {
    setSelectedStore(store);

    router.push(
      '/(sales)/attendance'
    );
  };

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  const handleClearSearch = () => {
    setQuery('');
    loadStores('');
  };

  const handleSearch = () => {
    loadStores(query);
  };

  /*
   * ============================================================
   * RENDER STORE
   * ============================================================
   */

  const renderStore = ({
    item,
  }: {
    item: Store;
  }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.storeItem,
          pressed &&
            styles.storeItemPressed,
        ]}
        onPress={() =>
          handleSelectStore(item)
        }
      >
        {/* STORE ICON */}

        <View style={styles.storeIcon}>
          <Text style={styles.storeEmoji}>
            🏪
          </Text>
        </View>

        {/* STORE INFORMATION */}

        <View style={styles.storeInfo}>
          <Text
            style={styles.storeName}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.store_code ? (
            <Text style={styles.storeCode}>
              {item.store_code}
            </Text>
          ) : null}

          {item.address ? (
            <Text
              style={styles.storeAddress}
              numberOfLines={2}
            >
              {item.address}
            </Text>
          ) : null}

          <View
            style={
              styles.verificationBadge
            }
          >
            <Text
              style={
                styles.verificationIcon
              }
            >
              📍
            </Text>

            <Text
              style={
                styles.verificationText
              }
            >
              GPS verification required
            </Text>
          </View>
        </View>

        {/* ARROW */}

        <View
          style={styles.arrowContainer}
        >
          <Text style={styles.arrow}>
            ›
          </Text>
        </View>
      </Pressable>
    );
  };

  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */

  const renderEmpty = () => {
    if (loading || error) {
      return null;
    }

    return (
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

        {query ? (
          <Pressable
            style={({ pressed }) => [
              styles.clearSearchButton,
              pressed &&
                styles.clearSearchButtonPressed,
            ]}
            onPress={handleClearSearch}
          >
            <Text
              style={
                styles.clearSearchText
              }
            >
              CLEAR SEARCH
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  /*
   * ============================================================
   * FOOTER
   * ============================================================
   */

  const renderFooter = () => {
    if (
      loading ||
      error ||
      stores.length === 0
    ) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <View
          style={
            styles.footerIconContainer
          }
        >
          <Text style={styles.footerIcon}>
            📍
          </Text>
        </View>

        <View
          style={styles.footerContent}
        >
          <Text
            style={styles.footerTitle}
          >
            Attendance verification
          </Text>

          <Text
            style={styles.footerText}
          >
            After selecting a store, your
            location will be verified before
            you can submit attendance.
          </Text>
        </View>
      </View>
    );
  };

  /*
   * ============================================================
   * HEADER
   * ============================================================
   */

  const renderHeader = () => {
    return (
      <>
        {/* SEARCH */}

        <View
          style={styles.searchContainer}
        >
          <Text style={styles.searchIcon}>
            🔍
          </Text>

          <TextInput
            style={styles.search}
            placeholder="Search store name or code..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={
              handleSearch
            }
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {query.length > 0 ? (
            <Pressable
              onPress={
                handleClearSearch
              }
              hitSlop={8}
            >
              <Text style={styles.clear}>
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* LIST HEADER */}

        <View
          style={styles.listHeader}
        >
          <View style={styles.headerText}>
            <Text
              style={styles.sectionTitle}
            >
              AVAILABLE STORES
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Select a store to start
              attendance verification.
            </Text>
          </View>

          {!loading && !error ? (
            <View
              style={
                styles.storeCountBadge
              }
            >
              <Text
                style={
                  styles.storeCount
                }
              >
                {stores.length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* LOADING */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="large"
              color="#2563eb"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading stores...
            </Text>
          </View>
        ) : null}

        {/* ERROR */}

        {!loading && error ? (
          <View
            style={styles.errorCard}
          >
            <View
              style={
                styles.errorIconContainer
              }
            >
              <Text
                style={styles.errorIcon}
              >
                ⚠️
              </Text>
            </View>

            <Text
              style={styles.errorTitle}
            >
              Unable to load stores
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed &&
                  styles.retryButtonPressed,
              ]}
              onPress={() =>
                loadStores(query)
              }
            >
              <Text
                style={styles.retryText}
              >
                TRY AGAIN
              </Text>
            </Pressable>
          </View>
        ) : null}
      </>
    );
  };

  /*
   * ============================================================
   * SCREEN
   * ============================================================
   *
   * IMPORTANT:
   *
   * FlatList is now the ONLY vertical scrolling container.
   */

  return (
    <ScreenContainer
      title="Select Store"
      subtitle="Choose the store you are visiting today"
      scroll={false}
    >
      <FlatList
        data={stores}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={renderStore}
        ListHeaderComponent={
          renderHeader
        }
        ListEmptyComponent={
          renderEmpty
        }
        ListFooterComponent={
          renderFooter
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          stores.length === 0
            ? styles.emptyList
            : styles.listContent
        }
      />
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  /*
   * SEARCH
   */

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

  /*
   * HEADER
   */

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  headerText: {
    flex: 1,
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
  },

  storeCountBadge: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  storeCount: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '800',
  },

  /*
   * LIST
   */

  listContent: {
    paddingBottom: 10,
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 20,
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
    transform: [
      {
        scale: 0.99,
      },
    ],
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
    marginBottom: 7,
  },

  /*
   * GPS BADGE
   */

  verificationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  verificationIcon: {
    fontSize: 10,
    marginRight: 4,
  },

  verificationText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },

  /*
   * ARROW
   */

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

  /*
   * LOADING
   */

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingVertical: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#94a3b8',
  },

  /*
   * ERROR
   */

  errorCard: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },

  errorIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  errorIcon: {
    fontSize: 28,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#991b1b',
    marginBottom: 6,
    textAlign: 'center',
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

  retryButtonPressed: {
    opacity: 0.7,
  },

  retryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /*
   * EMPTY
   */

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

  clearSearchButton: {
    marginTop: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  clearSearchButtonPressed: {
    opacity: 0.7,
  },

  clearSearchText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },

  /*
   * FOOTER
   */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
  },

  footerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  footerIcon: {
    fontSize: 17,
  },

  footerContent: {
    flex: 1,
  },

  footerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 2,
  },

  footerText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 14,
  },
});