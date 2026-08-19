import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useGpsVerification } from '@/src/features/gps/useGpsVerification';
import { geocodeAddress } from '@/src/services/geocodingService';
import { createLocalStore } from '@/src/services/localStoreService';
import type { StoreInput } from '@/src/types';
import {
    isValidStoreCode,
    isValidStoreName,
} from '@/src/utils/validation';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const STORE_RADIUS_METERS = 50;

export default function AddStoreScreen() {
  const [form, setForm] = useState<StoreInput>({
    store_code: '',
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: STORE_RADIUS_METERS,
    status: 'active',
  });

  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [checkingLocation, setCheckingLocation] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [geocodeMatch, setGeocodeMatch] =
    useState<string | null>(null);

  const {
    requestPermission,
    getCurrentPosition,
  } = useGpsVerification();

  const busy =
    saving ||
    geocoding ||
    checkingLocation;

  /*
   * ============================================================
   * CANCEL
   * ============================================================
   */

  const handleCancel = () => {
    if (busy) {
      return;
    }

    router.back();
  };

  /*
   * ============================================================
   * FIND STORE LOCATION
   * ============================================================
   */

  const handleFindLocation = async () => {
    const address = form.address?.trim();

    if (!address) {
      setFormError(
        'Enter the store address first.'
      );

      return;
    }

    setGeocoding(true);
    setFormError(null);
    setGeocodeMatch(null);

    try {
      const result =
        await geocodeAddress(address);

      if (!result) {
        setFormError(
          'Could not find this address. Please enter a more specific address.'
        );

        return;
      }

      setForm((current) => ({
        ...current,
        latitude: result.latitude,
        longitude: result.longitude,
        radius_meters:
          STORE_RADIUS_METERS,
        status: 'active',
      }));

      setGeocodeMatch(
        result.displayName
      );
    } catch (error) {
      console.error(
        'GEOCODING ERROR:',
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : 'Could not find this location.'
      );
    } finally {
      setGeocoding(false);
    }
  };

  /*
   * ============================================================
   * VALIDATE
   * ============================================================
   */

  const validateForm =
    (): string | null => {
      if (
        !isValidStoreCode(
          form.store_code
        )
      ) {
        return 'Store code must be 2–32 characters.';
      }

      if (
        !isValidStoreName(
          form.name
        )
      ) {
        return 'Store name must be 2–120 characters.';
      }

      if (
        !form.address ||
        form.address.trim().length === 0
      ) {
        return 'Store address is required.';
      }

      if (
        !Number.isFinite(
          form.latitude
        ) ||
        !Number.isFinite(
          form.longitude
        ) ||
        (form.latitude === 0 &&
          form.longitude === 0)
      ) {
        return 'Please find the store location first.';
      }

      return null;
    };

  /*
   * ============================================================
   * VERIFY USER LOCATION
   * ============================================================
   */

  const verifyUserIsAtStore =
    async (): Promise<boolean> => {
      const permitted =
        await requestPermission();

      if (!permitted) {
        Alert.alert(
          'Location Required',
          'Location permission is required to add a store. You must be physically at the store location.'
        );

        return false;
      }

      const reading =
        await getCurrentPosition();

      if (!reading) {
        Alert.alert(
          'Location Unavailable',
          'Could not determine your current location. Make sure GPS/location services are enabled and try again.'
        );

        return false;
      }

      const distance =
        calculateDistanceMeters(
          reading.latitude,
          reading.longitude,
          form.latitude,
          form.longitude
        );

      console.log(
        'STORE CREATION LOCATION CHECK:',
        {
          userLatitude:
            reading.latitude,
          userLongitude:
            reading.longitude,
          storeLatitude:
            form.latitude,
          storeLongitude:
            form.longitude,
          distanceMeters:
            distance,
          accuracy:
            reading.accuracy,
        }
      );

      if (
        distance >
        STORE_RADIUS_METERS
      ) {
        Alert.alert(
          'You Are Too Far Away',
          `You must be at the store location to add it.\n\nYou are approximately ${distance.toFixed(
            0
          )}m away.\n\nMaximum allowed distance is ${STORE_RADIUS_METERS}m.`
        );

        return false;
      }

      if (
        reading.accuracy != null &&
        reading.accuracy >
          STORE_RADIUS_METERS
      ) {
        Alert.alert(
          'GPS Accuracy Too Low',
          `Your current GPS accuracy is approximately ${reading.accuracy.toFixed(
            0
          )}m.\n\nPlease move somewhere with a better GPS signal and try again.`
        );

        return false;
      }

      return true;
    };

  /*
   * ============================================================
   * CREATE STORE
   * ============================================================
   */

  const handleCreateStore =
    async () => {
      if (busy) {
        return;
      }

      const validationError =
        validateForm();

      if (validationError) {
        setFormError(
          validationError
        );

        return;
      }

      setFormError(null);
      setCheckingLocation(true);

      try {
        /*
         * GPS verification
         */

        const atStore =
          await verifyUserIsAtStore();

        if (!atStore) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * This uses LOCAL STORAGE.
         *
         * It does NOT use Supabase.
         */

        setSaving(true);

        const createdStore =
          await createLocalStore({
            store_code:
              form.store_code.trim(),

            name:
              form.name.trim(),

            address:
              form.address?.trim() ?? '',

            latitude:
              form.latitude,

            longitude:
              form.longitude,

            radius_meters:
              STORE_RADIUS_METERS,

            status: 'active',
          });

        console.log(
          'LOCAL STORE CREATED:',
          createdStore
        );

        /*
         * ======================================================
         * GO TO STORE DETAILS
         * ======================================================
         *
         * Actual file:
         *
         * app/(sales)/store-details.tsx
         *
         * Correct route:
         *
         * /store-details
         *
         * NOT:
         * /(sales)/store-details
         */

        Alert.alert(
          'Store Added',
          `${createdStore.name} has been added successfully.\n\nNow add the store's phone number, owner name, usual orders and notes.`,
          [
            {
              text: 'Continue',

              onPress: () => {
                router.replace({
                  pathname:
                    '/store-details',

                  params: {
                    storeId:
                      createdStore.id,

                    storeName:
                      createdStore.name,
                  },
                });
              },
            },
          ]
        );
      } catch (error) {
        console.error(
          'ADD LOCAL STORE ERROR:',
          error
        );

        setFormError(
          error instanceof Error
            ? error.message
            : 'Could not create the store.'
        );
      } finally {
        setSaving(false);
        setCheckingLocation(
          false
        );
      }
    };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Add Store"
      subtitle="Add a new store at your current location"
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
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
            style={styles.infoCard}
          >
            <View
              style={styles.infoIcon}
            >
              <Text
                style={styles.infoEmoji}
              >
                📍
              </Text>
            </View>

            <View
              style={styles.infoContent}
            >
              <Text
                style={styles.infoTitle}
              >
                Add Store From Location
              </Text>

              <Text
                style={styles.infoText}
              >
                You must physically be at
                the store to add it. Your
                current GPS location will be
                checked before the store is
                created.
              </Text>
            </View>
          </View>

          <Text
            style={styles.sectionLabel}
          >
            STORE DETAILS
          </Text>

          <View
            style={styles.card}
          >
            <FormInput
              placeholder="Store Code (e.g. STR-001)"
              autoCapitalize="characters"
              value={
                form.store_code
              }
              editable={!busy}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    store_code:
                      text,
                  })
                )
              }
            />

            <FormInput
              placeholder="Store Name"
              value={form.name}
              editable={!busy}
              onChangeText={(text) =>
                setForm(
                  (current) => ({
                    ...current,
                    name: text,
                  })
                )
              }
            />

            <FormInput
              placeholder="Store Address"
              value={
                form.address ?? ''
              }
              editable={!busy}
              multiline
              numberOfLines={3}
              onChangeText={(text) => {
                setForm(
                  (current) => ({
                    ...current,
                    address: text,
                    latitude: 0,
                    longitude: 0,
                  })
                );

                setGeocodeMatch(
                  null
                );
              }}
            />

            <Pressable
              style={({
                pressed,
              }) => [
                styles.findLocationButton,
                geocoding &&
                  styles.disabledButton,
                pressed &&
                  !geocoding &&
                  styles.pressed,
              ]}
              onPress={
                handleFindLocation
              }
              disabled={busy}
            >
              {geocoding ? (
                <ActivityIndicator
                  size="small"
                  color="#2563eb"
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.findLocationIcon
                    }
                  >
                    📍
                  </Text>

                  <Text
                    style={
                      styles.findLocationText
                    }
                  >
                    Find Store Location
                  </Text>
                </>
              )}
            </Pressable>

            {geocodeMatch ? (
              <View
                style={
                  styles.locationFound
                }
              >
                <View
                  style={
                    styles.locationFoundIcon
                  }
                >
                  <Text>✓</Text>
                </View>

                <View
                  style={
                    styles.locationFoundContent
                  }
                >
                  <Text
                    style={
                      styles.locationFoundTitle
                    }
                  >
                    Store location found
                  </Text>

                  <Text
                    style={
                      styles.locationFoundText
                    }
                    numberOfLines={2}
                  >
                    {geocodeMatch}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={
              styles.radiusCard
            }
          >
            <View
              style={
                styles.radiusIcon
              }
            >
              <Text
                style={
                  styles.radiusEmoji
                }
              >
                🎯
              </Text>
            </View>

            <View
              style={
                styles.radiusContent
              }
            >
              <Text
                style={
                  styles.radiusTitle
                }
              >
                Location Radius
              </Text>

              <Text
                style={
                  styles.radiusText
                }
              >
                Store attendance radius is
                automatically set to 50
                meters.
              </Text>
            </View>

            <View
              style={
                styles.radiusBadge
              }
            >
              <Text
                style={
                  styles.radiusBadgeNumber
                }
              >
                50m
              </Text>

              <Text
                style={
                  styles.radiusBadgeLabel
                }
              >
                FIXED
              </Text>
            </View>
          </View>

          {formError ? (
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
                {formError}
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.securityCard
            }
          >
            <Text
              style={
                styles.securityIcon
              }
            >
              🔒
            </Text>

            <View
              style={
                styles.securityContent
              }
            >
              <Text
                style={
                  styles.securityTitle
                }
              >
                Location Verification
              </Text>

              <Text
                style={
                  styles.securityText
                }
              >
                Your phone's GPS location
                will be checked against the
                store location before the
                store is created.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.nextStepCard
            }
          >
            <Text
              style={
                styles.nextStepIcon
              }
            >
              📝
            </Text>

            <View
              style={
                styles.nextStepContent
              }
            >
              <Text
                style={
                  styles.nextStepTitle
                }
              >
                Store Information
              </Text>

              <Text
                style={
                  styles.nextStepText
                }
              >
                After the store is created,
                you can add the owner's name,
                phone number, usual orders
                and notes.
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={
              checkingLocation
                ? 'Checking Location...'
                : saving
                  ? 'Adding Store...'
                  : 'Add Store'
            }
            loading={
              checkingLocation ||
              saving
            }
            disabled={busy}
            onPress={
              handleCreateStore
            }
            style={
              styles.createButton
            }
          />

          <PrimaryButton
            title="Cancel"
            variant="secondary"
            disabled={busy}
            onPress={
              handleCancel
            }
            style={
              styles.cancelButton
            }
          />

          <Text
            style={styles.footer}
          >
            Store is saved locally on this
            device with a fixed 50m
            attendance radius.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * DISTANCE
 * ============================================================
 */

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const earthRadiusMeters =
    6371000;

  const lat1 =
    toRadians(latitude1);

  const lat2 =
    toRadians(latitude2);

  const deltaLatitude =
    toRadians(
      latitude2 - latitude1
    );

  const deltaLongitude =
    toRadians(
      longitude2 - longitude1
    );

  const a =
    Math.sin(
      deltaLatitude / 2
    ) **
      2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLongitude / 2
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    earthRadiusMeters * c
  );
}

function toRadians(
  degrees: number
): number {
  return (
    (degrees * Math.PI) /
    180
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

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 15,
    marginBottom: 22,
  },

  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoEmoji: {
    fontSize: 23,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e3a8a',
    marginBottom: 4,
  },

  infoText: {
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
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },

  findLocationButton: {
    minHeight: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },

  findLocationIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  findLocationText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.65,
  },

  locationFound: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 11,
    padding: 11,
    marginTop: 10,
  },

  locationFoundIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  locationFoundContent: {
    flex: 1,
  },

  locationFoundTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803d',
    marginBottom: 2,
  },

  locationFoundText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748b',
  },

  radiusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 14,
    marginBottom: 16,
  },

  radiusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  radiusEmoji: {
    fontSize: 20,
  },

  radiusContent: {
    flex: 1,
  },

  radiusTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  radiusText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748b',
  },

  radiusBadge: {
    minWidth: 54,
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 7,
    marginLeft: 8,
  },

  radiusBadgeNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },

  radiusBadgeLabel: {
    marginTop: 1,
    fontSize: 7,
    fontWeight: '900',
    color: '#3b82f6',
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

  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },

  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  securityText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748b',
  },

  nextStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },

  nextStepIcon: {
    fontSize: 23,
    marginRight: 11,
  },

  nextStepContent: {
    flex: 1,
  },

  nextStepTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  nextStepText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748b',
  },

  createButton: {
    marginBottom: 10,
  },

  cancelButton: {
    marginBottom: 15,
  },

  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 14,
    paddingHorizontal: 30,
  },
});