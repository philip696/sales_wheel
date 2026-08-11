import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { geocodeAddress } from '@/src/services/geocodingService';
import {
  createStore,
  deleteStore,
  listAllStores,
  setStoreStatus,
  updateStore,
} from '@/src/services/storeService';
import type { EntityStatus, Store, StoreInput } from '@/src/types';
import {
  isValidLatitude,
  isValidLongitude,
  isValidRadiusMeters,
  isValidStoreCode,
  isValidStoreName,
} from '@/src/utils/validation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

type StatusFilter = EntityStatus | 'all';

const EMPTY_FORM: StoreInput = {
  store_code: '',
  name: '',
  address: '',
  latitude: 0,
  longitude: 0,
  radius_meters: 50,
  status: 'active',
};

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export default function AdminStoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMatch, setGeocodeMatch] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listAllStores({
        status: statusFilter,
        pageSize: 100,
      });
      setStores(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores.');
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openCreateModal = () => {
    setEditingStore(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setGeocodeMatch(null);
    setModalVisible(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setForm({
      store_code: store.store_code,
      name: store.name,
      address: store.address ?? '',
      latitude: store.latitude,
      longitude: store.longitude,
      radius_meters: store.radius_meters,
      status: store.status,
    });
    setFormError(null);
    setGeocodeMatch(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const handleGeocodeAddress = async () => {
    if (!form.address || form.address.trim().length === 0) {
      setFormError('Enter an address first, then tap "Find Coordinates".');
      return;
    }

    setGeocoding(true);
    setFormError(null);
    setGeocodeMatch(null);
    try {
      const result = await geocodeAddress(form.address);
      if (!result) {
        setFormError('No matching location found for that address.');
        return;
      }
      setForm((f) => ({
        ...f,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      setGeocodeMatch(result.displayName);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not look up that address.'
      );
    } finally {
      setGeocoding(false);
    }
  };

  const validateForm = (): string | null => {
    if (!isValidStoreCode(form.store_code)) {
      return 'Store code must be 2-32 characters.';
    }
    if (!isValidStoreName(form.name)) {
      return 'Store name must be 2-120 characters.';
    }
    if (!isValidLatitude(form.latitude)) {
      return 'Latitude must be a number between -90 and 90.';
    }
    if (!isValidLongitude(form.longitude)) {
      return 'Longitude must be a number between -180 and 180.';
    }
    if (!isValidRadiusMeters(form.radius_meters)) {
      return 'Radius must be a number between 1 and 5000 meters.';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingStore) {
        await updateStore(editingStore.id, form);
      } else {
        await createStore(form);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save store.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (store: Store) => {
    const nextStatus: EntityStatus =
      store.status === 'active' ? 'inactive' : 'active';
    try {
      await setStoreStatus(store.id, nextStatus);
      await load();
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err instanceof Error ? err.message : 'Could not update store status.'
      );
    }
  };

  const handleDelete = (store: Store) => {
    Alert.alert(
      'Delete Store',
      `Delete "${store.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStore(store.id);
              await load();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Could not delete store.';
              Alert.alert('Delete Failed', message, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Deactivate Instead',
                  onPress: () => handleToggleStatus(store),
                },
              ]);
            }
          },
        },
      ]
    );
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <Pressable
            key={filter.value}
            onPress={() => setStatusFilter(filter.value)}
            style={[
              styles.filterChip,
              statusFilter === filter.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === filter.value && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
    ),
    [statusFilter]
  );

  return (
    <ScreenContainer title="Store Management" style={styles.screen}>
      <PrimaryButton
        title="+ Add Store"
        onPress={openCreateModal}
        style={styles.addButton}
      />

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
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stores found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'active'
                      ? styles.statusActive
                      : styles.statusInactive,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{item.store_code}</Text>
              {item.address ? (
                <Text style={styles.cardMeta}>{item.address}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · radius{' '}
                {item.radius_meters}m
              </Text>

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionButton, styles.editAction]}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.toggleAction]}
                  onPress={() => handleToggleStatus(item)}
                >
                  <Text style={styles.actionButtonText}>
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteAction]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingStore ? 'Edit Store' : 'Add Store'}
            </Text>

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <FormInput
              placeholder="Store Code (e.g. STR-001)"
              autoCapitalize="characters"
              value={form.store_code}
              onChangeText={(text) => setForm((f) => ({ ...f, store_code: text }))}
            />
            <FormInput
              placeholder="Store Name"
              value={form.name}
              onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
            />
            <FormInput
              placeholder="Address (optional)"
              value={form.address ?? ''}
              onChangeText={(text) => {
                setForm((f) => ({ ...f, address: text }));
                setGeocodeMatch(null);
              }}
            />
            <Pressable
              style={[
                styles.geocodeButton,
                geocoding && styles.geocodeButtonDisabled,
              ]}
              onPress={handleGeocodeAddress}
              disabled={geocoding}
            >
              {geocoding ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.geocodeButtonText}>
                  📍 Find Coordinates from Address
                </Text>
              )}
            </Pressable>
            {geocodeMatch ? (
              <Text style={styles.geocodeMatchText} numberOfLines={2}>
                Matched: {geocodeMatch}
              </Text>
            ) : null}

            <View style={styles.row}>
              <FormInput
                placeholder="Latitude"
                keyboardType="numbers-and-punctuation"
                value={String(form.latitude)}
                onChangeText={(text) =>
                  setForm((f) => ({ ...f, latitude: Number(text) || 0 }))
                }
                style={styles.halfInput}
              />
              <FormInput
                placeholder="Longitude"
                keyboardType="numbers-and-punctuation"
                value={String(form.longitude)}
                onChangeText={(text) =>
                  setForm((f) => ({ ...f, longitude: Number(text) || 0 }))
                }
                style={styles.halfInput}
              />
            </View>
            <FormInput
              placeholder="Radius (meters)"
              keyboardType="number-pad"
              value={String(form.radius_meters)}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, radius_meters: Number(text) || 0 }))
              }
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.status === 'active'}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    status: value ? 'active' : 'inactive',
                  }))
                }
              />
            </View>

            <PrimaryButton
              title={editingStore ? 'Save Changes' : 'Create Store'}
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />
            <PrimaryButton
              title="Cancel"
              variant="secondary"
              onPress={closeModal}
              disabled={saving}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  addButton: {
    marginBottom: 12,
  },
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#e2e8f0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#2563eb',
  },
  toggleAction: {
    backgroundColor: '#64748b',
  },
  deleteAction: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  geocodeButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 40,
  },
  geocodeButtonDisabled: {
    opacity: 0.6,
  },
  geocodeButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  geocodeMatchText: {
    color: '#16a34a',
    fontSize: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  saveButton: {
    marginBottom: 10,
  },
});