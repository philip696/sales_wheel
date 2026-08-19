import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
    getLocalStore,
    updateLocalStoreDetails,
    type LocalStoreDetails,
} from '@/src/services/localStoreService';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const EMPTY_DETAILS: LocalStoreDetails = {
  phone_number: '',
  owner_name: '',
  usual_order: '',
  notes: '',
};

export default function StoreDetailsScreen() {
  const params =
    useLocalSearchParams<{
      storeId?: string;
      storeName?: string;
    }>();

  const storeId =
    params.storeId;

  const [storeName, setStoreName] =
    useState(
      params.storeName ??
        'Store'
    );

  const [form, setForm] =
    useState<LocalStoreDetails>(
      EMPTY_DETAILS
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * LOAD STORE
   * ============================================================
   */

  useEffect(() => {
    loadStore();
  }, [storeId]);

  const loadStore =
    async () => {
      if (!storeId) {
        setLoading(false);
        setError(
          'Store information could not be found.'
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const store =
          await getLocalStore(
            storeId
          );

        if (!store) {
          throw new Error(
            'Store could not be found on this device.'
          );
        }

        setStoreName(
          store.name
        );

        setForm({
          phone_number:
            store.phone_number ??
            '',
          owner_name:
            store.owner_name ??
            '',
          usual_order:
            store.usual_order ??
            '',
          notes:
            store.notes ?? '',
        });
      } catch (err) {
        console.error(
          'LOAD LOCAL STORE ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Could not load store information.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  const handleSave =
    async () => {
      if (!storeId) {
        Alert.alert(
          'Store Not Found',
          'Could not identify this store.'
        );

        return;
      }

      if (saving) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        await updateLocalStoreDetails(
          storeId,
          {
            phone_number:
              form.phone_number.trim(),

            owner_name:
              form.owner_name.trim(),

            usual_order:
              form.usual_order.trim(),

            notes:
              form.notes.trim(),
          }
        );

        Alert.alert(
          'Store Updated',
          'Store information has been saved successfully.',
          [
            {
              text: 'OK',

              onPress: () => {
                router.replace(
                  '/stores'
                );
              },
            },
          ]
        );
      } catch (err) {
        console.error(
          'SAVE LOCAL STORE ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Could not save store information.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * BACK
   * ============================================================
   */

  const handleBack =
    () => {
      if (saving) {
        return;
      }

      router.back();
    };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <ScreenContainer
        title="Store Details"
        subtitle={storeName}
      >
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
            Loading store information...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Store Details"
      subtitle={storeName}
    >
      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.container
          }
        >
          <View
            style={styles.headerCard}
          >
            <View
              style={styles.headerIcon}
            >
              <Text
                style={styles.headerEmoji}
              >
                🏪
              </Text>
            </View>

            <View
              style={
                styles.headerContent
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                {storeName}
              </Text>

              <Text
                style={
                  styles.headerText
                }
              >
                Add useful information about
                this store for future visits.
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.sectionLabel
            }
          >
            CONTACT INFORMATION
          </Text>

          <View
            style={styles.card}
          >
            <FormInput
              placeholder="Store Phone Number"
              keyboardType="phone-pad"
              value={
                form.phone_number
              }
              editable={!saving}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    phone_number:
                      text,
                  })
                )
              }
            />

            <FormInput
              placeholder="Owner Name"
              value={
                form.owner_name
              }
              editable={!saving}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    owner_name:
                      text,
                  })
                )
              }
            />
          </View>

          <Text
            style={
              styles.sectionLabel
            }
          >
            ORDER INFORMATION
          </Text>

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              WHAT DO THEY USUALLY ORDER?
            </Text>

            <FormInput
              placeholder="e.g. 2 cartons of Product A, 1 carton of Product B"
              value={
                form.usual_order
              }
              editable={!saving}
              multiline
              numberOfLines={4}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    usual_order:
                      text,
                  })
                )
              }
            />

            <Text
              style={
                styles.helperText
              }
            >
              Record the products or
              quantities this store usually
              orders.
            </Text>
          </View>

          <Text
            style={
              styles.sectionLabel
            }
          >
            NOTES
          </Text>

          <View
            style={styles.card}
          >
            <FormInput
              placeholder="Additional notes about this store..."
              value={form.notes}
              editable={!saving}
              multiline
              numberOfLines={5}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    notes: text,
                  })
                )
              }
            />
          </View>

          {error ? (
            <View
              style={
                styles.errorBox
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
                  styles.errorText
                }
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.permissionCard
            }
          >
            <Text
              style={
                styles.permissionIcon
              }
            >
              ✏️
            </Text>

            <View
              style={
                styles.permissionContent
              }
            >
              <Text
                style={
                  styles.permissionTitle
                }
              >
                Store Information
              </Text>

              <Text
                style={
                  styles.permissionText
                }
              >
                This information is saved locally
                on this device. You can update
                it whenever the store information
                changes.
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={
              saving
                ? 'Saving...'
                : 'Save Store Information'
            }
            loading={saving}
            disabled={saving}
            onPress={
              handleSave
            }
            style={
              styles.saveButton
            }
          />

          <PrimaryButton
            title="Back"
            variant="secondary"
            disabled={saving}
            onPress={
              handleBack
            }
            style={
              styles.backButton
            }
          />

          <Text
            style={styles.footer}
          >
            Store location and attendance
            settings cannot be changed from
            this page.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  container: {
    paddingBottom: 35,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 12,
  },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 15,
    marginBottom: 22,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerEmoji: {
    fontSize: 24,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#172554',
    marginBottom: 4,
  },

  headerText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#64748b',
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ec',
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  helperText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#94a3b8',
    marginTop: 2,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 11,
    padding: 12,
    marginBottom: 16,
  },

  errorIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 11,
    lineHeight: 16,
  },

  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },

  permissionIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  permissionContent: {
    flex: 1,
  },

  permissionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  permissionText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748b',
  },

  saveButton: {
    marginBottom: 10,
  },

  backButton: {
    marginBottom: 15,
  },

  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 14,
    paddingHorizontal: 25,
  },
});