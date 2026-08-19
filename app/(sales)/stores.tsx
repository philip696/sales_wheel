import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import {
  searchStores,
} from '@/src/services/storeService';
import type { Store } from '@/src/types';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function StoresScreen() {
  const {
    setSelectedStore,
  } =
    useAttendanceFlow();

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    stores,
    setStores,
  ] = useState<Store[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  /*
   * ============================================================
   * LOAD STORES FROM SUPABASE
   * ============================================================
   */

  const loadStores =
    useCallback(
      async (
        searchQuery: string
      ) => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await searchStores({
              query:
                searchQuery,
              page: 1,
              pageSize: 100,
            });

          setStores(
            result.data
          );
        } catch (err) {
          console.error(
            'SUPABASE STORE LOAD ERROR:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load stores.'
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /*
   * ============================================================
   * REFRESH WHEN SCREEN OPENS
   * ============================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadStores(query);
    }, [
      loadStores,
      query,
    ])
  );

  /*
   * ============================================================
   * SELECT STORE
   * ============================================================
   */

  const handleSelectStore =
    (store: Store) => {
      setSelectedStore(
        store
      );

      router.push(
        '/attendance'
      );
    };

  /*
   * ============================================================
   * STORE DETAILS
   * ============================================================
   */

  const handleOpenDetails =
    (store: Store) => {
      router.push({
        pathname:
          '/store-details',

        params: {
          storeId:
            store.id,

          storeName:
            store.name,
        },
      });
    };

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  const handleSearch =
    () => {
      loadStores(query);
    };

  const handleClearSearch =
    () => {
      setQuery('');
      loadStores('');
    };

  /*
   * ============================================================
   * STORE ITEM
   * ============================================================
   */

  const renderStore =
    ({
      item,
    }: {
      item: Store;
    }) => (
      <View
        style={
          styles.storeItem
        }
      >
        <Pressable
          style={({ pressed }) => [
            styles.storeMain,
            pressed &&
              styles.storeItemPressed,
          ]}
          onPress={() =>
            handleSelectStore(
              item
            )
          }
        >
          <View
            style={
              styles.storeIcon
            }
          >
            <Text
              style={
                styles.storeEmoji
              }
            >
              🏪
            </Text>
          </View>

          <View
            style={
              styles.storeInfo
            }
          >
            <Text
              style={
                styles.storeName
              }
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {item.store_code ? (
              <Text
                style={
                  styles.storeCode
                }
              >
                {item.store_code}
              </Text>
            ) : null}

            {item.address ? (
              <Text
                style={
                  styles.storeAddress
                }
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
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.detailsButton,
            pressed &&
              styles.detailsButtonPressed,
          ]}
          onPress={() =>
            handleOpenDetails(
              item
            )
          }
        >
          <Text
            style={
              styles.detailsButtonText
            }
          >
            INFO
          </Text>
        </Pressable>
      </View>
    );

  /*
   * ============================================================
   * EMPTY
   * ============================================================
   */

  const renderEmpty =
    () => {
      if (
        loading ||
        error
      ) {
        return null;
      }

      return (
        <View
          style={
            styles.emptyContainer
          }
        >
          <View
            style={
              styles.emptyIcon
            }
          >
            <Text
              style={
                styles.emptyEmoji
              }
            >
              🏪
            </Text>
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No Stores Found
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            {query
              ? 'Try searching with a different store name or code.'
              : 'No active stores are available.'}
          </Text>

          {query ? (
            <Pressable
              style={
                styles.clearSearchButton
              }
              onPress={
                handleClearSearch
              }
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
   * HEADER
   * ============================================================
   */

  const renderHeader =
    () => (
      <>
        <View
          style={
            styles.searchContainer
          }
        >
          <Text
            style={
              styles.searchIcon
            }
          >
            🔍
          </Text>

          <TextInput
            style={
              styles.search
            }
            placeholder="Search store name or code..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={
              setQuery
            }
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
              <Text
                style={
                  styles.clear
                }
              >
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={
            styles.listHeader
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              AVAILABLE STORES
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Tap a store to start
              attendance.
            </Text>
          </View>

          {!loading &&
          !error ? (
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

        {!loading &&
        error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorIcon
              }
            >
              ⚠️
            </Text>

            <Text
              style={
                styles.errorTitle
              }
            >
              Unable to load stores
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                loadStores(
                  query
                )
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                TRY AGAIN
              </Text>
            </Pressable>
          </View>
        ) : null}
      </>
    );

  /*
   * ============================================================
   * FOOTER
   * ============================================================
   */

  const renderFooter =
    () => {
      if (
        loading ||
        error ||
        stores.length === 0
      ) {
        return null;
      }

      return (
        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerIcon
            }
          >
            📍
          </Text>

          <View
            style={
              styles.footerContent
            }
          >
            <Text
              style={
                styles.footerTitle
              }
            >
              Attendance verification
            </Text>

            <Text
              style={
                styles.footerText
              }
            >
              Select a store to begin
              GPS verification and
              attendance.
            </Text>
          </View>
        </View>
      );
    };

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
        renderItem={
          renderStore
        }
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
    justifyContent:
      'space-between',
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
    justifyContent:
      'center',
  },

  storeCount: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 10,
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  storeItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },

  storeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },

  storeItemPressed: {
    opacity: 0.7,
  },

  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent:
      'center',
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

  detailsButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 7,
  },

  detailsButtonPressed: {
    opacity: 0.6,
  },

  detailsButtonText: {
    color: '#2563eb',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent:
      'center',
    minHeight: 300,
    paddingVertical: 30,
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
    fontSize: 28,
    marginBottom: 12,
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
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent:
      'center',
    minHeight: 300,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent:
      'center',
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

  clearSearchText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },

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

  footerIcon: {
    fontSize: 20,
    marginRight: 10,
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