import { AppAlert, type AppAlertButton } from '@/src/components/AppAlert';
import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
  createReward,
  deleteReward,
  listRewards,
  setRewardStatus,
  updateReward,
  type RewardInput,
} from '@/src/services/rewardService';
import type { EntityStatus, Reward } from '@/src/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const EMPTY_FORM: RewardInput = {
  name: '',
  value: '',
  probability: 0.1,
  status: 'active',
};

function isValidRewardName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 60;
}

function isValidRewardValue(value: string): boolean {
  return value.trim().length >= 1 && value.trim().length <= 60;
}

function isValidProbability(probability: number): boolean {
  return Number.isFinite(probability) && probability > 0 && probability <= 1;
}

export default function AdminRewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [form, setForm] = useState<RewardInput>(EMPTY_FORM);
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
    buttons?: AppAlertButton[]
  ) => setAlertState({ title, message, buttons });

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listRewards();
      setRewards(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards.');
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

  const stats = useMemo(() => {
    const active = rewards.filter((r) => r.status === 'active');
    const totalChance = active.reduce((sum, r) => sum + r.probability, 0);
    return {
      total: rewards.length,
      active: active.length,
      totalChancePct: `${Math.round(totalChance * 100)}%`,
    };
  }, [rewards]);

  const openCreateModal = () => {
    setEditingReward(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward);
    setForm({
      name: reward.name,
      value: reward.value,
      probability: reward.probability,
      status: reward.status,
    });
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const validateForm = (): string | null => {
    if (!isValidRewardName(form.name)) {
      return 'Reward name must be 2-60 characters.';
    }
    if (!isValidRewardValue(form.value)) {
      return 'Reward value must be 1-60 characters.';
    }
    if (!isValidProbability(form.probability)) {
      return 'Probability must be a number greater than 0 and at most 1 (e.g. 0.25 for 25%).';
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
      if (editingReward) {
        await updateReward(editingReward.id, form);
      } else {
        await createReward(form);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save reward.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (reward: Reward) => {
    const nextStatus: EntityStatus =
      reward.status === 'active' ? 'inactive' : 'active';
    try {
      await setRewardStatus(reward.id, nextStatus);
      await load();
    } catch (err) {
      showAlert(
        'Update Failed',
        err instanceof Error ? err.message : 'Could not update reward status.'
      );
    }
  };

  const handleDelete = (reward: Reward) => {
    showAlert(
      'Delete Reward',
      `Delete "${reward.name}"? This cannot be undone. Past spins that won ` +
        `this reward will keep their record, just without a reward name attached.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReward(reward.id);
              await load();
            } catch (err) {
              showAlert(
                'Delete Failed',
                err instanceof Error ? err.message : 'Could not delete reward.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer
      title="Reward Management"
      subtitle="Configure rewards and spin probabilities"
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Rewards</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalChancePct}</Text>
          <Text style={styles.statLabel}>Total Chance</Text>
        </View>
      </View>

      <PrimaryButton
        title="+ Add Reward"
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
          data={rewards}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No rewards yet.</Text>
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
              <Text style={styles.cardValue}>{item.value}</Text>
              <Text style={styles.cardMeta}>
                Probability: {(item.probability * 100).toFixed(1)}%
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
              {editingReward ? 'Edit Reward' : 'Add Reward'}
            </Text>

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <FormInput
              placeholder="Reward Name (e.g. 10% OFF)"
              value={form.name}
              onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
            />
            <FormInput
              placeholder="Reward Value (e.g. 10% or Free Item)"
              value={form.value}
              onChangeText={(text) => setForm((f) => ({ ...f, value: text }))}
            />
            <FormInput
              placeholder="Probability (0.0 - 1.0, e.g. 0.25 = 25%)"
              keyboardType="decimal-pad"
              value={String(form.probability)}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, probability: Number(text) || 0 }))
              }
            />

            {/* Placeholder only — not wired to any state or saved anywhere. */}
            <Text style={styles.placeholderNote}>
              This field is a placeholder for a future feature and isn't
              functional yet — use Probability above to actually set the
              reward's odds.
            </Text>

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
              title={editingReward ? 'Save Changes' : 'Create Reward'}
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
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
  cardValue: {
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
  disabledInput: {
    opacity: 0.5,
  },
  placeholderNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: -6,
    marginBottom: 14,
    lineHeight: 15,
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