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

/*
 * ============================================================
 * DEFAULT FORM
 * ============================================================
 *
 * Probability is stored as a decimal:
 *
 * 0.10 = 10%
 * 0.25 = 25%
 * 0.50 = 50%
 * 1.00 = 100%
 *
 * The TOTAL probability of all active rewards
 * cannot exceed 1.00 (100%).
 */

const EMPTY_FORM: RewardInput = {
  name: '',
  value: '',
  probability: 0.1,
  status: 'active',
};

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function isValidRewardName(name: string): boolean {
  return (
    name.trim().length >= 2 &&
    name.trim().length <= 60
  );
}

function isValidRewardValue(value: string): boolean {
  return (
    value.trim().length >= 1 &&
    value.trim().length <= 60
  );
}

function isValidProbability(
  probability: number
): boolean {
  return (
    Number.isFinite(probability) &&
    probability > 0 &&
    probability <= 1
  );
}

/*
 * ============================================================
 * SCREEN
 * ============================================================
 */

export default function AdminRewardsScreen() {
  /*
   * ==========================================================
   * REWARDS
   * ==========================================================
   */

  const [rewards, setRewards] =
    useState<Reward[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ==========================================================
   * MODAL / FORM
   * ==========================================================
   */

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingReward, setEditingReward] =
    useState<Reward | null>(null);

  const [form, setForm] =
    useState<RewardInput>(
      EMPTY_FORM
    );

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  /*
   * ==========================================================
   * ALERT
   * ==========================================================
   */

  const [alertState, setAlertState] =
    useState<{
      title: string;
      message?: string;
      buttons?: AppAlertButton[];
    } | null>(null);

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AppAlertButton[]
  ) => {
    setAlertState({
      title,
      message,
      buttons,
    });
  };

  /*
   * ==========================================================
   * LOAD REWARDS
   * ==========================================================
   */

  const load = useCallback(
    async () => {
      setError(null);

      try {
        const result =
          await listRewards();

        setRewards(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load rewards.'
        );
      }
    },
    []
  );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    setLoading(true);

    load().finally(() => {
      setLoading(false);
    });
  }, [load]);

  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const onRefresh =
    useCallback(
      async () => {
        setRefreshing(true);

        await load();

        setRefreshing(false);
      },
      [load]
    );

  /*
   * ==========================================================
   * STATISTICS
   * ==========================================================
   */

  const stats = useMemo(() => {
    const active =
      rewards.filter(
        (reward) =>
          reward.status === 'active'
      );

    const totalChance =
      active.reduce(
        (sum, reward) =>
          sum + reward.probability,
        0
      );

    return {
      total: rewards.length,

      active: active.length,

      totalChancePct:
        `${Math.round(
          totalChance * 100
        )}%`,

      totalChance,
    };
  }, [rewards]);

  /*
   * ==========================================================
   * REMAINING PROBABILITY
   * ==========================================================
   */

  const getRemainingProbability =
    () => {
      /*
       * Exclude the currently edited reward.
       *
       * This is important because if a reward is
       * currently 20% and the admin changes it to
       * 30%, we should replace 20% with 30%,
       * not add 30% on top of the existing 20%.
       */

      const otherActiveProbability =
        rewards
          .filter(
            (reward) =>
              reward.status ===
                'active' &&
              reward.id !==
                editingReward?.id
          )
          .reduce(
            (sum, reward) =>
              sum +
              reward.probability,
            0
          );

      return Math.max(
        0,
        1 -
          otherActiveProbability
      );
    };

  /*
   * ==========================================================
   * CREATE MODAL
   * ==========================================================
   */

  const openCreateModal = () => {
    setEditingReward(null);

    setForm({
      ...EMPTY_FORM,
    });

    setFormError(null);

    setModalVisible(true);
  };

  /*
   * ==========================================================
   * EDIT MODAL
   * ==========================================================
   */

  const openEditModal = (
    reward: Reward
  ) => {
    setEditingReward(reward);

    setForm({
      name: reward.name,
      value: reward.value,
      probability:
        reward.probability,
      status: reward.status,
    });

    setFormError(null);

    setModalVisible(true);
  };

  /*
   * ==========================================================
   * CLOSE MODAL
   * ==========================================================
   */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
  };

  /*
   * ==========================================================
   * VALIDATE FORM
   * ==========================================================
   */

  const validateForm =
    (): string | null => {
      /*
       * ------------------------------------------------------
       * NAME
       * ------------------------------------------------------
       */

      if (
        !isValidRewardName(
          form.name
        )
      ) {
        return (
          'Reward name must be 2-60 characters.'
        );
      }

      /*
       * ------------------------------------------------------
       * VALUE
       * ------------------------------------------------------
       */

      if (
        !isValidRewardValue(
          form.value
        )
      ) {
        return (
          'Reward value must be 1-60 characters.'
        );
      }

      /*
       * ------------------------------------------------------
       * INDIVIDUAL PROBABILITY
       * ------------------------------------------------------
       */

      if (
        !isValidProbability(
          form.probability
        )
      ) {
        return (
          'Probability must be greater than 0 and at most 100% (e.g. 0.25 = 25%).'
        );
      }

      /*
       * ------------------------------------------------------
       * TOTAL ACTIVE PROBABILITY
       * ------------------------------------------------------
       *
       * Only active rewards count.
       *
       * If the reward is inactive, it doesn't consume
       * any of the 100% probability pool.
       */

      if (
        form.status ===
        'active'
      ) {
        const otherActiveProbability =
          rewards
            .filter(
              (reward) =>
                reward.status ===
                  'active' &&
                reward.id !==
                  editingReward?.id
            )
            .reduce(
              (sum, reward) =>
                sum +
                reward.probability,
              0
            );

        const totalProbability =
          otherActiveProbability +
          form.probability;

        /*
         * Small tolerance to prevent floating point
         * errors such as:
         *
         * 0.1 + 0.2 + 0.7
         *
         * becoming 1.00000000001.
         */

        if (
          totalProbability >
          1.000001
        ) {
          const remainingProbability =
            Math.max(
              0,
              1 -
                otherActiveProbability
            );

          return (
            `Total active reward probability cannot exceed 100%. ` +
            `You have ${(
              remainingProbability *
              100
            ).toFixed(1)}% remaining.`
          );
        }
      }

      return null;
    };

  /*
   * ==========================================================
   * SAVE
   * ==========================================================
   */

  const handleSave =
    async () => {
      const validationError =
        validateForm();

      if (validationError) {
        setFormError(
          validationError
        );

        return;
      }

      setSaving(true);

      setFormError(null);

      try {
        /*
         * EDIT
         */

        if (editingReward) {
          await updateReward(
            editingReward.id,
            form
          );
        }

        /*
         * CREATE
         */

        else {
          await createReward(
            form
          );
        }

        /*
         * Close modal after successful save.
         */

        setModalVisible(false);

        /*
         * Refresh reward list.
         */

        await load();
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : 'Failed to save reward.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ==========================================================
   * TOGGLE STATUS
   * ==========================================================
   */

  const handleToggleStatus =
    async (
      reward: Reward
    ) => {
      const nextStatus: EntityStatus =
        reward.status ===
        'active'
          ? 'inactive'
          : 'active';

      /*
       * If activating a reward, make sure its
       * probability fits within the remaining pool.
       */

      if (
        nextStatus ===
        'active'
      ) {
        const otherActiveProbability =
          rewards
            .filter(
              (item) =>
                item.status ===
                  'active' &&
                item.id !==
                  reward.id
            )
            .reduce(
              (sum, item) =>
                sum +
                item.probability,
              0
            );

        const totalProbability =
          otherActiveProbability +
          reward.probability;

        if (
          totalProbability >
          1.000001
        ) {
          const remaining =
            Math.max(
              0,
              1 -
                otherActiveProbability
            );

          showAlert(
            'Cannot Activate Reward',
            `Activating "${reward.name}" would make the total probability ${(
              totalProbability *
              100
            ).toFixed(
              1
            )}%, which exceeds 100%.\n\n` +
              `Only ${(
                remaining *
                100
              ).toFixed(
                1
              )}% probability is currently available.`
          );

          return;
        }
      }

      try {
        await setRewardStatus(
          reward.id,
          nextStatus
        );

        await load();
      } catch (err) {
        showAlert(
          'Update Failed',
          err instanceof Error
            ? err.message
            : 'Could not update reward status.'
        );
      }
    };

  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  const handleDelete = (
    reward: Reward
  ) => {
    showAlert(
      'Delete Reward',
      `Delete "${reward.name}"? This cannot be undone. Past spins that won ` +
        `this reward will keep their record, just without a reward name attached.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress:
            async () => {
              try {
                await deleteReward(
                  reward.id
                );

                await load();
              } catch (err) {
                showAlert(
                  'Delete Failed',
                  err instanceof Error
                    ? err.message
                    : 'Could not delete reward.'
                );
              }
            },
        },
      ]
    );
  };

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <ScreenContainer
      title="Reward Management"
      subtitle="Configure rewards and spin probabilities"
    >
      {/* ==================================================== */}
      {/* STATS */}
      {/* ==================================================== */}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.total}
          </Text>

          <Text style={styles.statLabel}>
            Rewards
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.active}
          </Text>

          <Text style={styles.statLabel}>
            Active
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.totalChancePct}
          </Text>

          <Text style={styles.statLabel}>
            Total Chance
          </Text>
        </View>
      </View>

      {/* ==================================================== */}
      {/* ADD REWARD */}
      {/* ==================================================== */}

      <PrimaryButton
        title="+ Add Reward"
        onPress={
          openCreateModal
        }
        style={
          styles.addButton
        }
      />

      {/* ==================================================== */}
      {/* ERROR */}
      {/* ==================================================== */}

      {error ? (
        <View
          style={
            styles.errorBox
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      {/* ==================================================== */}
      {/* REWARD LIST */}
      {/* ==================================================== */}

      {loading ? (
        <ActivityIndicator
          style={
            styles.loading
          }
          size="large"
          color="#2563eb"
        />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) =>
            item.id
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
            />
          }
          ListEmptyComponent={
            <Text
              style={
                styles.emptyText
              }
            >
              No rewards yet.
            </Text>
          }
          renderItem={({
            item,
          }) => (
            <View
              style={
                styles.card
              }
            >
              {/* CARD HEADER */}

              <View
                style={
                  styles.cardHeader
                }
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {item.name}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    item.status ===
                    'active'
                      ? styles.statusActive
                      : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={
                      styles.statusBadgeText
                    }
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* VALUE */}

              <Text
                style={
                  styles.cardValue
                }
              >
                {item.value}
              </Text>

              {/* PROBABILITY */}

              <Text
                style={
                  styles.cardMeta
                }
              >
                Probability:{' '}
                {(
                  item.probability *
                  100
                ).toFixed(1)}
                %
              </Text>

              {/* ACTIONS */}

              <View
                style={
                  styles.cardActions
                }
              >
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.editAction,
                  ]}
                  onPress={() =>
                    openEditModal(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.actionButtonText
                    }
                  >
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    styles.toggleAction,
                  ]}
                  onPress={() =>
                    handleToggleStatus(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.actionButtonText
                    }
                  >
                    {item.status ===
                    'active'
                      ? 'Deactivate'
                      : 'Activate'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    styles.deleteAction,
                  ]}
                  onPress={() =>
                    handleDelete(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.actionButtonText
                    }
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* ==================================================== */}
      {/* CREATE / EDIT MODAL */}
      {/* ==================================================== */}

      <Modal
        visible={
          modalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalBackdrop
          }
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            {/* TITLE */}

            <Text
              style={
                styles.modalTitle
              }
            >
              {editingReward
                ? 'Edit Reward'
                : 'Add Reward'}
            </Text>

            {/* FORM ERROR */}

            {formError ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {formError}
                </Text>
              </View>
            ) : null}

            {/* NAME */}

            <FormInput
              placeholder="Reward Name (e.g. 10% OFF)"
              value={
                form.name
              }
              onChangeText={(
                text
              ) =>
                setForm(
                  (f) => ({
                    ...f,
                    name: text,
                  })
                )
              }
            />

            {/* VALUE */}

            <FormInput
              placeholder="Reward Value (e.g. 10% or Free Item)"
              value={
                form.value
              }
              onChangeText={(
                text
              ) =>
                setForm(
                  (f) => ({
                    ...f,
                    value: text,
                  })
                )
              }
            />

            {/* PROBABILITY */}

            <FormInput
              placeholder="Probability (0 - 100%, e.g. 25)"
              keyboardType="decimal-pad"
              value={String(
                form.probability *
                  100
              )}
              onChangeText={(
                text
              ) => {
                const percentage =
                  Number(
                    text
                  );

                setForm(
                  (f) => ({
                    ...f,
                    probability:
                      Number.isFinite(
                        percentage
                      )
                        ? percentage /
                          100
                        : 0,
                  })
                );
              }}
            />

            {/* PROBABILITY INFORMATION */}

            <View
              style={
                styles.probabilityInfo
              }
            >
              <View
                style={
                  styles.probabilityInfoRow
                }
              >
                <Text
                  style={
                    styles.probabilityInfoLabel
                  }
                >
                  Current total:
                </Text>

                <Text
                  style={
                    styles.probabilityInfoValue
                  }
                >
                  {stats.totalChancePct}
                </Text>
              </View>

              <View
                style={
                  styles.probabilityInfoRow
                }
              >
                <Text
                  style={
                    styles.probabilityInfoLabel
                  }
                >
                  Available:
                </Text>

                <Text
                  style={
                    styles.probabilityInfoAvailable
                  }
                >
                  {(
                    getRemainingProbability() *
                    100
                  ).toFixed(1)}
                  %
                </Text>
              </View>

              <Text
                style={
                  styles.probabilityInfoText
                }
              >
                All active rewards combined
                cannot exceed 100%.
              </Text>
            </View>

            {/* STATUS */}

            <View
              style={
                styles.switchRow
              }
            >
              <Text
                style={
                  styles.switchLabel
                }
              >
                Active
              </Text>

              <Switch
                value={
                  form.status ===
                  'active'
                }
                onValueChange={(
                  value
                ) =>
                  setForm(
                    (f) => ({
                      ...f,
                      status:
                        value
                          ? 'active'
                          : 'inactive',
                    })
                  )
                }
              />
            </View>

            {/* SAVE */}

            <PrimaryButton
              title={
                editingReward
                  ? 'Save Changes'
                  : 'Create Reward'
              }
              loading={
                saving
              }
              onPress={
                handleSave
              }
              style={
                styles.saveButton
              }
            />

            {/* CANCEL */}

            <PrimaryButton
              title="Cancel"
              variant="secondary"
              onPress={
                closeModal
              }
              disabled={
                saving
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================== */}
      {/* ALERT */}
      {/* ==================================================== */}

      <AppAlert
        visible={
          !!alertState
        }
        title={
          alertState?.title ??
          ''
        }
        message={
          alertState?.message
        }
        buttons={
          alertState?.buttons
        }
        onRequestClose={() =>
          setAlertState(
            null
          )
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
  /* =========================================================
   * STATS
   * ========================================================= */

  statsRow: {
    flexDirection:
      'row',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor:
      '#f8fafc',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor:
      '#e2e8f0',
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

  /* =========================================================
   * ADD
   * ========================================================= */

  addButton: {
    marginBottom: 12,
  },

  /* =========================================================
   * LOADING
   * ========================================================= */

  loading: {
    marginTop: 40,
  },

  /* =========================================================
   * EMPTY
   * ========================================================= */

  emptyText: {
    textAlign:
      'center',
    color: '#64748b',
    marginTop: 24,
  },

  /* =========================================================
   * ERROR
   * ========================================================= */

  errorBox: {
    backgroundColor:
      '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 18,
  },

  /* =========================================================
   * REWARD CARD
   * ========================================================= */

  card: {
    backgroundColor:
      '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection:
      'row',
    justifyContent:
      'space-between',
    alignItems:
      'center',
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

  /* =========================================================
   * STATUS
   * ========================================================= */

  statusBadge: {
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },

  statusActive: {
    backgroundColor:
      '#dcfce7',
  },

  statusInactive: {
    backgroundColor:
      '#e2e8f0',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform:
      'uppercase',
  },

  /* =========================================================
   * ACTIONS
   * ========================================================= */

  cardActions: {
    flexDirection:
      'row',
    gap: 8,
    marginTop: 12,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems:
      'center',
  },

  editAction: {
    backgroundColor:
      '#2563eb',
  },

  toggleAction: {
    backgroundColor:
      '#64748b',
  },

  deleteAction: {
    backgroundColor:
      '#dc2626',
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* =========================================================
   * MODAL
   * ========================================================= */

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      'rgba(15, 23, 42, 0.5)',
    justifyContent:
      'flex-end',
  },

  modalCard: {
    backgroundColor:
      '#fff',
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

  /* =========================================================
   * PROBABILITY INFO
   * ========================================================= */

  probabilityInfo: {
    backgroundColor:
      '#f8fafc',
    borderWidth: 1,
    borderColor:
      '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
    marginBottom: 14,
  },

  probabilityInfoRow: {
    flexDirection:
      'row',
    justifyContent:
      'space-between',
    alignItems:
      'center',
    marginBottom: 5,
  },

  probabilityInfoLabel: {
    fontSize: 12,
    color: '#64748b',
  },

  probabilityInfoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  probabilityInfoAvailable: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },

  probabilityInfoText: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
    marginTop: 4,
  },

  /* =========================================================
   * SWITCH
   * ========================================================= */

  switchRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginBottom: 16,
    marginTop: 4,
  },

  switchLabel: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },

  /* =========================================================
   * BUTTONS
   * ========================================================= */

  saveButton: {
    marginBottom: 10,
  },
});