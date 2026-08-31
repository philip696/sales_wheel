import { AppAlert, type AppAlertButton } from '@/src/components/AppAlert';
import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';

import {
  deleteEvent,
  getEvent,
  setEventStatus,
  updateEvent,
  type EventInput,
} from '@/src/services/eventService';

import type { Event } from '@/src/types';

import { router, useLocalSearchParams } from 'expo-router';

import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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

function formatDate(value?: string | null): string {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 60;
}

export default function AdminEventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<{
    title: string;
    message?: string;
    buttons?: AppAlertButton[];
  } | null>(null);

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
  ) => {
    setAlertState({
      title,
      message,
      buttons,
    });
  };

  const load = useCallback(async () => {
    if (!eventId) return;

    setError(null);

    try {
      const result = await getEvent(eventId);
      setEvent(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load event.',
      );
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);

    load().finally(() => {
      setLoading(false);
    });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await load();

    setRefreshing(false);
  }, [load]);

  const openEditModal = () => {
    if (!event) return;

    setForm({
      name: event.name,
      description: event.description ?? '',
      status: event.status,
      starts_at: event.starts_at ?? null,
      ends_at: event.ends_at ?? null,
    });

    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!event) return;

    if (!isValidName(form.name)) {
      setFormError('Event name must be 2-60 characters.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateEvent(event.id, form);

      setEvent(updated);
      setModalVisible(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save event.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!event) return;

    const nextStatus =
      event.status === 'active' ? 'inactive' : 'active';

    try {
      const updated = await setEventStatus(event.id, nextStatus);
      setEvent(updated);
    } catch (err) {
      showAlert(
        'Could not update event',
        err instanceof Error
          ? err.message
          : 'Failed to update event status.',
      );
    }
  };

  const handleDelete = () => {
    if (!event) return;

    showAlert(
      `Delete "${event.name}"?`,
      'This will also delete every reward configured under this event. Spin history is kept but will show as unassigned.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);

              router.replace('/admin/events');
            } catch (err) {
              showAlert(
                'Could not delete event',
                err instanceof Error
                  ? err.message
                  : 'Failed to delete event.',
              );
            }
          },
        },
      ],
    );
  };

  const goToRewards = () => {
    if (!eventId) return;

    router.push(`/admin/events/${eventId}/rewards`);
  };

  const goToHistory = () => {
    if (!eventId) return;

    router.push(`/admin/events/${eventId}/history`);
  };

  if (loading) {
    return (
      <ScreenContainer
        title="Event"
        subtitle="Loading event details..."
      >
        <ActivityIndicator
          style={styles.loading}
          size="large"
          color="#2563eb"
        />
      </ScreenContainer>
    );
  }

  if (error || !event) {
    return (
      <ScreenContainer
        title="Event"
        subtitle="Unable to load event"
      >
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Event could not be loaded
          </Text>

          <Text style={styles.errorText}>
            {error ?? 'This event does not exist.'}
          </Text>
        </View>

        <PrimaryButton
          title="Back to Events"
          onPress={() => router.replace('/admin/events')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title={event.name}
      subtitle="Event overview and management"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/admin/events')}
        >
          <Text style={styles.backText}>
            ← Back to Events
          </Text>
        </Pressable>

        {/* Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle}>
                {event.name}
              </Text>

              <Text style={styles.heroDescription}>
                {event.description ||
                  'No description has been added to this event.'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                event.status === 'active'
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  event.status === 'active'
                    ? styles.statusDotActive
                    : styles.statusDotInactive,
                ]}
              />

              <Text style={styles.statusText}>
                {event.status}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.eventMetaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>
                Start
              </Text>

              <Text style={styles.metaValue}>
                {formatDate(event.starts_at)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>
                End
              </Text>

              <Text style={styles.metaValue}>
                {formatDate(event.ends_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          Event Management
        </Text>

        <View style={styles.actionGrid}>
          <Pressable
            style={styles.managementCard}
            onPress={goToRewards}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🎁</Text>
            </View>

            <Text style={styles.managementTitle}>
              Rewards
            </Text>

            <Text style={styles.managementDescription}>
              Configure prizes, values, and probabilities.
            </Text>

            <Text style={styles.managementArrow}>
              Manage →
            </Text>
          </Pressable>

          <Pressable
            style={styles.managementCard}
            onPress={goToHistory}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>📊</Text>
            </View>

            <Text style={styles.managementTitle}>
              Spin History
            </Text>

            <Text style={styles.managementDescription}>
              Review spins, sales, stores, and rewards won.
            </Text>

            <Text style={styles.managementArrow}>
              View History →
            </Text>
          </Pressable>
        </View>

        {/* Event Settings */}
        <Text style={styles.sectionTitle}>
          Event Settings
        </Text>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                Event Status
              </Text>

              <Text style={styles.settingDescription}>
                {event.status === 'active'
                  ? 'This event is currently available to the sales app.'
                  : 'This event is currently disabled.'}
              </Text>
            </View>

            <Switch
              value={event.status === 'active'}
              onValueChange={handleToggleStatus}
            />
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingsAction}
            onPress={openEditModal}
          >
            <View>
              <Text style={styles.settingsActionTitle}>
                Edit Event
              </Text>

              <Text style={styles.settingsActionDescription}>
                Change the event name, description, status, or dates.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>
          Danger Zone
        </Text>

        <View style={styles.dangerCard}>
          <View style={styles.dangerTextContainer}>
            <Text style={styles.dangerTitle}>
              Delete Event
            </Text>

            <Text style={styles.dangerDescription}>
              Permanently remove this event and its configured
              rewards. Existing spin history will remain.
            </Text>
          </View>

          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>
              Delete
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Edit Event Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>
                Edit Event
              </Text>

              <Text style={styles.modalSubtitle}>
                Update the event configuration below.
              </Text>

              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {formError}
                  </Text>
                </View>
              ) : null}

              <FormInput
                placeholder="Event name"
                value={form.name}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <FormInput
                placeholder="Description (optional)"
                value={form.description}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                multiline
              />

              <View style={styles.switchRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.switchLabel}>
                    Active
                  </Text>

                  <Text style={styles.switchDescription}>
                    Allow this event to be used by sales.
                  </Text>
                </View>

                <Switch
                  value={form.status === 'active'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value
                        ? 'active'
                        : 'inactive',
                    }))
                  }
                />
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Save Changes"
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
            </ScrollView>
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
  scroll: {
    flex: 1,
  },

  content: {
    paddingBottom: 24,
  },

  loading: {
    marginTop: 60,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 6,
  },

  backText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },

  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 24,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },

  heroTitleContainer: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },

  statusActive: {
    backgroundColor: '#dcfce7',
  },

  statusInactive: {
    backgroundColor: '#f3f4f6',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  statusDotActive: {
    backgroundColor: '#16a34a',
  },

  statusDotInactive: {
    backgroundColor: '#6b7280',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: '#374151',
  },

  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 18,
  },

  eventMetaGrid: {
    flexDirection: 'row',
    gap: 24,
  },

  metaItem: {
    flex: 1,
  },

  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },

  managementCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 17,
    minHeight: 180,
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  iconText: {
    fontSize: 20,
  },

  managementTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },

  managementDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
    flex: 1,
  },

  managementArrow: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },

  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 28,
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    gap: 16,
  },

  settingTextContainer: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },

  settingsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
  },

  settingsActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  settingsActionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },

  chevron: {
    fontSize: 28,
    color: '#9ca3af',
    marginLeft: 12,
  },

  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff7f7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 17,
  },

  dangerTextContainer: {
    flex: 1,
  },

  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 5,
  },

  dangerDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7f1d1d',
  },

  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
  },

  deleteButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 30,
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
  },

  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#b91c1c',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '90%',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 5,
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 18,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 15,
  },

  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
  },

  modalActions: {
    gap: 10,
    marginTop: 12,
  },

  saveButton: {
    marginBottom: 0,
  },
});
