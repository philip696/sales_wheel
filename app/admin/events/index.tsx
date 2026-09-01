import { AppAlert, type AppAlertButton } from '@/src/components/AppAlert';
import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
  createEvent,
  deleteEvent,
  listEvents,
  setEventStatus,
  updateEvent,
  type EventInput,
} from '@/src/services/eventService';
import type { Event } from '@/src/types';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const EMPTY_FORM: EventInput = {
  name: '',
  description: '',
  status: 'active',
};

function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 60;
}

export default function AdminEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<{
    title: string;
    message?: string;
    buttons?: AppAlertButton[];
  } | null>(null);

  const showAlert = (title: string, message?: string, buttons?: AppAlertButton[]) => {
    setAlertState({ title, message, buttons });
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listEvents();
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
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

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({
      name: event.name,
      description: event.description ?? '',
      status: event.status,
    });
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const validateForm = (): string | null => {
    if (!isValidName(form.name)) {
      return 'Event name must be 2-60 characters.';
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
      if (editingEvent) {
        await updateEvent(editingEvent.id, form);
      } else {
        await createEvent(form);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (event: Event) => {
    try {
      await setEventStatus(event.id, event.status === 'active' ? 'inactive' : 'active');
      await load();
    } catch (err) {
      showAlert('Could not update event', err instanceof Error ? err.message : undefined);
    }
  };

  const handleDelete = (event: Event) => {
    showAlert(
      `Delete "${event.name}"?`,
      'This will also delete every reward configured under this event. Spin history is kept but will show as unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              await load();
            } catch (err) {
              showAlert('Could not delete event', err instanceof Error ? err.message : undefined);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer title="Events" subtitle="Manage promo periods, campaigns, and their rewards">
      <PrimaryButton title="+ New Event" onPress={openCreateModal} style={styles.addButton} />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No events yet. Create one to get started.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/admin/events/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
              {item.description ? <Text style={styles.cardMeta}>{item.description}</Text> : null}

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
            </Pressable>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>

            <FormInput
              placeholder="Event name"
              value={form.name}
              onChangeText={(value) => setForm((f) => ({ ...f, name: value }))}
            />

            <FormInput
              placeholder="Description (optional)"
              value={form.description}
              onChangeText={(value) => setForm((f) => ({ ...f, description: value }))}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.status === 'active'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value ? 'active' : 'inactive' }))
                }
              />
            </View>

            {formError && <Text style={styles.formErrorText}>{formError}</Text>}

            <PrimaryButton
              title={editingEvent ? 'Save Changes' : 'Create Event'}
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />
            <PrimaryButton title="Cancel" variant="secondary" onPress={closeModal} disabled={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppAlert
        visible={!!alertState}
        title={alertState?.title ?? ''}
        message={alertState?.message}
        buttons={alertState?.buttons}
        onRequestClose={() => setAlertState(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: { marginBottom: 16 },
  loading: { marginTop: 40 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 24 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 18 },

  card: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', flexShrink: 1 },
  cardMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },

  statusBadge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#e2e8f0' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editAction: { backgroundColor: '#2563eb' },
  toggleAction: { backgroundColor: '#64748b' },
  deleteAction: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 },
  switchLabel: { fontSize: 15, color: '#111', fontWeight: '600' },

  formErrorText: { color: '#991b1b', fontSize: 13, marginBottom: 10 },
  saveButton: { marginBottom: 10 },
});