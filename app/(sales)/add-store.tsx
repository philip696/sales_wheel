// app/(sales)/add-store.tsx

import {
  router,
} from 'expo-router';

import {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FormInput,
} from '@/src/components/FormInput';

import {
  PrimaryButton,
} from '@/src/components/PrimaryButton';

import {
  ScreenContainer,
} from '@/src/components/ScreenContainer';

import {
  useGpsVerification,
} from '@/src/features/gps/useGpsVerification';

import {
  geocodeAddress,
} from '@/src/services/geocodingService';

import {
  createStore,
} from '@/src/services/storeService';

import type {
  StoreInput,
} from '@/src/types';

import {
  isValidStoreCode,
  isValidStoreName,
} from '@/src/utils/validation';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type StoreCategory =
  | 'Grosir'
  | 'Retail';

type TaxationType =
  | 'KTP Pemilik'
  | 'KTP Bukan Pemilik'
  | 'NPWP';

interface ExtendedStoreForm {
  store_code: string;
  name: string;
  address: string;

  phone1: string;
  phone2: string;

  owner: string;

  topLimit: string;

  category:
    | StoreCategory
    | '';

  taxation:
    | TaxationType
    | '';

  area: string;

  latitude: number;
  longitude: number;

  radius_meters: number;

  status: 'active';
}

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 *
 * NOTE:
 * Your existing implementation uses 5000 metres.
 * Keep that value here so the GPS behaviour remains unchanged.
 */

const STORE_RADIUS_METERS =
  5000;

const LOCAL_CUSTOMER_KEY =
  'salesman_demo_customer_profiles';

/*
 * ============================================================
 * WEB / NATIVE ALERT HELPER
 * ============================================================
 */

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?:
    | 'default'
    | 'cancel'
    | 'destructive';
}

const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (
    Platform.OS ===
    'web'
  ) {
    const fullText =
      message
        ? `${title}\n\n${message}`
        : title;

    if (
      buttons &&
      buttons.length > 0
    ) {
      if (
        buttons.length ===
        1
      ) {
        window.alert(
          fullText
        );

        buttons[0].onPress?.();
      } else {
        const confirmBtn =
          buttons.find(
            (button) =>
              button.style !==
              'cancel'
          ) ??
          buttons[0];

        const cancelBtn =
          buttons.find(
            (button) =>
              button.style ===
              'cancel'
          );

        const confirmed =
          window.confirm(
            fullText
          );

        if (
          confirmed
        ) {
          confirmBtn.onPress?.();
        } else {
          cancelBtn?.onPress?.();
        }
      }
    } else {
      window.alert(
        fullText
      );
    }

    return;
  }

  Alert.alert(
    title,
    message,
    buttons,
    {
      cancelable:
        false,
    }
  );
};

/*
 * ============================================================
 * INITIAL FORM
 * ============================================================
 */

const INITIAL_FORM:
  ExtendedStoreForm = {
  store_code: '',
  name: '',
  address: '',

  phone1: '',
  phone2: '',

  owner: '',

  topLimit: '',

  category: '',

  taxation: '',

  area: '',

  latitude: 0,
  longitude: 0,

  radius_meters:
    STORE_RADIUS_METERS,

  status: 'active',
};

/*
 * ============================================================
 * SCREEN
 * ============================================================
 */

export default function AddStoreScreen() {
  const [
    form,
    setForm,
  ] =
    useState<ExtendedStoreForm>(
      INITIAL_FORM
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    geocoding,
    setGeocoding,
  ] =
    useState(false);

  const [
    checkingLocation,
    setCheckingLocation,
  ] =
    useState(false);

  const [
    formError,
    setFormError,
  ] =
    useState<string | null>(
      null
    );

  const [
    geocodeMatch,
    setGeocodeMatch,
  ] =
    useState<string | null>(
      null
    );

  const {
    requestPermission,
    getCurrentPosition,
  } =
    useGpsVerification();

  const busy =
    saving ||
    geocoding ||
    checkingLocation;

  /*
   * ============================================================
   * UPDATE FORM
   * ============================================================
   */

  const updateField = <
    K extends keyof ExtendedStoreForm
  >(
    field: K,
    value: ExtendedStoreForm[K]
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]:
          value,
      })
    );
  };

  /*
   * ============================================================
   * TOP LIMIT DISPLAY
   * ============================================================
   */

  const formattedTopLimit =
    useMemo(() => {
      const raw =
        form.topLimit.replace(
          /\D/g,
          ''
        );

      if (
        !raw
      ) {
        return '';
      }

      const number =
        Number(
          raw
        );

      if (
        !Number.isFinite(
          number
        )
      ) {
        return '';
      }

      return new Intl.NumberFormat(
        'id-ID'
      ).format(
        number
      );
    }, [
      form.topLimit,
    ]);

  /*
   * ============================================================
   * CANCEL
   * ============================================================
   */

  const handleCancel =
    () => {
      if (
        busy
      ) {
        return;
      }

      if (
        router.canGoBack()
      ) {
        router.back();
      } else {
        router.replace(
          '/(sales)'
        );
      }
    };

  /*
   * ============================================================
   * FIND STORE LOCATION
   * ============================================================
   */

  const handleFindLocation =
    async () => {
      const address =
        form.address.trim();

      if (
        !address
      ) {
        setFormError(
          'Masukkan alamat toko terlebih dahulu.'
        );

        return;
      }

      setGeocoding(
        true
      );

      setFormError(
        null
      );

      setGeocodeMatch(
        null
      );

      try {
        const result =
          await geocodeAddress(
            address
          );

        if (
          !result
        ) {
          setFormError(
            'Alamat tidak ditemukan. Coba masukkan alamat yang lebih lengkap.'
          );

          return;
        }

        setForm(
          (
            current
          ) => ({
            ...current,

            latitude:
              result.latitude,

            longitude:
              result.longitude,

            radius_meters:
              STORE_RADIUS_METERS,

            status:
              'active',
          })
        );

        setGeocodeMatch(
          result.displayName
        );
      } catch (
        error
      ) {
        console.error(
          'GEOCODING ERROR:',
          error
        );

        setFormError(
          error instanceof Error
            ? error.message
            : 'Lokasi toko tidak dapat ditemukan.'
        );
      } finally {
        setGeocoding(
          false
        );
      }
    };

  /*
   * ============================================================
   * FORM VALIDATION
   * ============================================================
   */

  const validateForm =
    (): string | null => {
      if (
        !isValidStoreCode(
          form.store_code
        )
      ) {
        return 'Store code harus 2–32 karakter.';
      }

      if (
        !isValidStoreName(
          form.name
        )
      ) {
        return 'Nama toko harus 2–120 karakter.';
      }

      if (
        form.address.trim()
          .length < 5
      ) {
        return 'Alamat toko harus diisi.';
      }

      if (
        form.phone1.trim()
          .length < 8
      ) {
        return 'Nomor telepon utama harus diisi.';
      }

      if (
        form.owner.trim()
          .length < 2
      ) {
        return 'Nama owner harus diisi.';
      }

      if (
        !form.topLimit
          .trim()
      ) {
        return 'TOP limit harus diisi.';
      }

      if (
        !form.category
      ) {
        return 'Pilih kategori toko.';
      }

      if (
        !form.taxation
      ) {
        return 'Pilih perpajakan toko.';
      }

      if (
        !form.area.trim()
      ) {
        return 'Area harus diisi.';
      }

      if (
        !Number.isFinite(
          form.latitude
        ) ||
        !Number.isFinite(
          form.longitude
        ) ||
        (
          form.latitude ===
            0 &&
          form.longitude ===
            0
        )
      ) {
        return 'Cari lokasi toko terlebih dahulu.';
      }

      return null;
    };

  /*
   * ============================================================
   * DISTANCE CALCULATION
   * ============================================================
   */

  const calculateDistanceMeters =
    (
      latitude1: number,
      longitude1: number,
      latitude2: number,
      longitude2: number
    ) => {
      const earthRadius =
        6371000;

      const lat1 =
        (
          latitude1 *
          Math.PI
        ) /
        180;

      const lat2 =
        (
          latitude2 *
          Math.PI
        ) /
        180;

      const deltaLat =
        (
          (
            latitude2 -
            latitude1
          ) *
          Math.PI
        ) /
        180;

      const deltaLon =
        (
          (
            longitude2 -
            longitude1
          ) *
          Math.PI
        ) /
        180;

      const a =
        Math.sin(
          deltaLat / 2
        ) **
          2 +
        Math.cos(
          lat1
        ) *
          Math.cos(
            lat2
          ) *
          Math.sin(
            deltaLon / 2
          ) **
            2;

      const c =
        2 *
        Math.atan2(
          Math.sqrt(
            a
          ),
          Math.sqrt(
            1 - a
          )
        );

      return (
        earthRadius *
        c
      );
    };

  /*
   * ============================================================
   * VERIFY CURRENT LOCATION
   * ============================================================
   */

  const verifyUserIsAtStore =
    async (): Promise<boolean> => {
      const permitted =
        await requestPermission();

      if (
        !permitted
      ) {
        showAlert(
          'Location Required',
          'Location permission is required to add a store.'
        );

        return false;
      }

      const reading =
        await getCurrentPosition();

      if (
        !reading
      ) {
        showAlert(
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
        'STORE CREATION GPS CHECK:',
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
        showAlert(
          'You Are Too Far Away',
          `You are approximately ${distance.toFixed(
            0
          )}m away from the selected store location.\n\nMaximum allowed distance is ${STORE_RADIUS_METERS}m.`
        );

        return false;
      }

      if (
        reading.accuracy !=
          null &&
        reading.accuracy >
          STORE_RADIUS_METERS
      ) {
        showAlert(
          'GPS Accuracy Too Low',
          `Your GPS accuracy is approximately ${reading.accuracy.toFixed(
            0
          )}m.\n\nPlease move somewhere with a better GPS signal and try again.`
        );

        return false;
      }

      return true;
    };

  /*
   * ============================================================
   * SAVE DEMO BUSINESS INFORMATION
   * ============================================================
   *
   * This is frontend-only.
   *
   * It allows us to collect the new business fields without
   * requiring database changes yet.
   */

  const saveLocalBusinessProfile =
    async (
      storeId: string
    ) => {
      try {
        const existing =
          await AsyncStorage.getItem(
            LOCAL_CUSTOMER_KEY
          );

        let profiles:
          Record<
            string,
            unknown
          > =
          {};

        if (
          existing
        ) {
          try {
            profiles =
              JSON.parse(
                existing
              );
          } catch {
            profiles =
              {};
          }
        }

        profiles[
          storeId
        ] = {
          storeId,

          storeCode:
            form.store_code.trim(),

          name:
            form.name.trim(),

          address:
            form.address.trim(),

          phone1:
            form.phone1.trim(),

          phone2:
            form.phone2.trim() ||
            null,

          owner:
            form.owner.trim(),

          topLimit:
            Number(
              form.topLimit.replace(
                /\D/g,
                ''
              )
            ),

          category:
            form.category,

          taxation:
            form.taxation,

          area:
            form.area.trim(),

          latitude:
            form.latitude,

          longitude:
            form.longitude,

          radiusMeters:
            STORE_RADIUS_METERS,

          status:
            'active',

          createdAt:
            new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          LOCAL_CUSTOMER_KEY,
          JSON.stringify(
            profiles
          )
        );
      } catch (
        error
      ) {
        /*
         * Local demo storage must never make the main
         * store creation flow fail.
         */

        console.warn(
          'LOCAL CUSTOMER PROFILE SAVE WARNING:',
          error
        );
      }
    };

  /*
   * ============================================================
   * CREATE STORE
   * ============================================================
   */

  const handleCreateStore =
    async () => {
      if (
        busy
      ) {
        return;
      }

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        setFormError(
          validationError
        );

        return;
      }

      setFormError(
        null
      );

      setCheckingLocation(
        true
      );

      try {
        /*
         * ------------------------------------------------------
         * GPS CHECK
         * ------------------------------------------------------
         */

        const atStore =
          await verifyUserIsAtStore();

        if (
          !atStore
        ) {
          return;
        }

        setSaving(
          true
        );

        /*
         * ------------------------------------------------------
         * CREATE STORE
         * ------------------------------------------------------
         *
         * Only fields currently supported by your StoreInput /
         * createStore backend service are sent here.
         *
         * The additional business fields are stored locally
         * above for the demo.
         */

        const storeInput:
          StoreInput = {
          store_code:
            form.store_code.trim(),

          name:
            form.name.trim(),

          address:
            form.address.trim(),

          latitude:
            form.latitude,

          longitude:
            form.longitude,

          radius_meters:
            STORE_RADIUS_METERS,

          status:
            'active',
        };

        const createdStore =
          await createStore(
            storeInput
          );

        console.log(
          'STORE CREATED:',
          createdStore
        );

        /*
         * ------------------------------------------------------
         * SAVE EXTRA BUSINESS INFORMATION LOCALLY
         * ------------------------------------------------------
         */

        await saveLocalBusinessProfile(
          createdStore.id
        );

        /*
         * ------------------------------------------------------
         * SUCCESS
         * ------------------------------------------------------
         */

        showAlert(
          'Store Added',
          `${createdStore.name} and its customer information have been saved successfully.`,
          [
            {
              text:
                'Continue',

              onPress:
                () => {
                  router.replace({
                    pathname:
                      '/',

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
      } catch (
        error
      ) {
        console.error(
          'ADD STORE ERROR:',
          error
        );

        setFormError(
          error instanceof Error
            ? error.message
            : 'Could not create the store.'
        );
      } finally {
        setSaving(
          false
        );

        setCheckingLocation(
          false
        );
      }
    };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Add Store"
      subtitle="Register a complete customer and store profile"
    >
      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS ===
          'ios'
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
          {/* ==================================================
           * INTRO
           * ================================================== */}

          <View
            style={
              styles.introCard
            }
          >
            <View
              style={
                styles.introIcon
              }
            >
              <Text
                style={
                  styles.introEmoji
                }
              >
                🏪
              </Text>
            </View>

            <View
              style={
                styles.introContent
              }
            >
              <Text
                style={
                  styles.introTitle
                }
              >
                Complete store profile
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                Add the store, owner, contact,
                commercial and taxation
                information in one place.
              </Text>
            </View>
          </View>

          {/* ==================================================
           * STORE INFORMATION
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            STORE INFORMATION
          </Text>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              STORE CODE
            </Text>

            <FormInput
              placeholder="Contoh: STR-001"
              autoCapitalize="characters"
              value={
                form.store_code
              }
              editable={
                !busy
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'store_code',
                  text
                )
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              NAMA TOKO
            </Text>

            <FormInput
              placeholder="Contoh: Toko Sumber Jaya"
              value={
                form.name
              }
              editable={
                !busy
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'name',
                  text
                )
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              ALAMAT
            </Text>

            <FormInput
              placeholder="Masukkan alamat lengkap toko"
              value={
                form.address
              }
              editable={
                !busy
              }
              multiline
              numberOfLines={
                4
              }
              onChangeText={(
                text
              ) => {
                updateField(
                  'address',
                  text
                );

                setGeocodeMatch(
                  null
                );

                setForm(
                  (
                    current
                  ) => ({
                    ...current,

                    latitude:
                      0,

                    longitude:
                      0,
                  })
                );
              }}
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              AREA
            </Text>

            <FormInput
              placeholder="Contoh: Surabaya Barat"
              value={
                form.area
              }
              editable={
                !busy
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'area',
                  text
                )
              }
            />

            {/* FIND LOCATION */}

            <Pressable
              style={({ pressed }) => [
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
              disabled={
                busy
              }
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
                  <Text
                    style={
                      styles.locationFoundIconText
                    }
                  >
                    ✓
                  </Text>
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
                    Location found
                  </Text>

                  <Text
                    style={
                      styles.locationFoundText
                    }
                    numberOfLines={
                      3
                    }
                  >
                    {
                      geocodeMatch
                    }
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* ==================================================
           * CONTACT
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            CONTACT & OWNER
          </Text>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              NOMOR TELEPON 1
            </Text>

            <TextInput
              value={
                form.phone1
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'phone1',
                  text.replace(
                    /[^0-9+\-\s]/g,
                    ''
                  )
                )
              }
              placeholder="Nomor utama"
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              editable={
                !busy
              }
              style={
                styles.textInput
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              NOMOR TELEPON 2
            </Text>

            <TextInput
              value={
                form.phone2
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'phone2',
                  text.replace(
                    /[^0-9+\-\s]/g,
                    ''
                  )
                )
              }
              placeholder="Nomor tambahan (opsional)"
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              editable={
                !busy
              }
              style={
                styles.textInput
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              OWNER
            </Text>

            <TextInput
              value={
                form.owner
              }
              onChangeText={(
                text
              ) =>
                updateField(
                  'owner',
                  text
                )
              }
              placeholder="Nama pemilik toko"
              placeholderTextColor="#a1a1aa"
              editable={
                !busy
              }
              style={
                styles.textInput
              }
            />
          </View>

          {/* ==================================================
           * BUSINESS
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            BUSINESS INFORMATION
          </Text>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              TOP LIMIT
            </Text>

            <View
              style={
                styles.currencyInput
              }
            >
              <Text
                style={
                  styles.currencyPrefix
                }
              >
                Rp
              </Text>

              <TextInput
                value={
                  formattedTopLimit
                }
                onChangeText={(
                  text
                ) =>
                  updateField(
                    'topLimit',
                    text.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                keyboardType="numeric"
                editable={
                  !busy
                }
                style={
                  styles.currencyTextInput
                }
              />
            </View>

            <Text
              style={
                styles.helperText
              }
            >
              Batas kredit / TOP customer.
            </Text>

            <Text
              style={[
                styles.fieldLabel,
                styles.fieldLabelSpaced,
              ]}
            >
              KATEGORI
            </Text>

            <View
              style={
                styles.categoryRow
              }
            >
              <Pressable
                onPress={() =>
                  updateField(
                    'category',
                    'Grosir'
                  )
                }
                disabled={
                  busy
                }
                style={[
                  styles.categoryCard,
                  form.category ===
                    'Grosir' &&
                    styles.categoryCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryTitle,
                    form.category ===
                      'Grosir' &&
                      styles.categoryTitleSelected,
                  ]}
                >
                  Grosir
                </Text>

                <Text
                  style={
                    styles.categorySubtitle
                  }
                >
                  Wholesale
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  updateField(
                    'category',
                    'Retail'
                  )
                }
                disabled={
                  busy
                }
                style={[
                  styles.categoryCard,
                  form.category ===
                    'Retail' &&
                    styles.categoryCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryTitle,
                    form.category ===
                      'Retail' &&
                      styles.categoryTitleSelected,
                  ]}
                >
                  Retail
                </Text>

                <Text
                  style={
                    styles.categorySubtitle
                  }
                >
                  Retail store
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ==================================================
           * TAXATION
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            PERPAJAKAN TOKO
          </Text>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.taxDescription
              }
            >
              Pilih dokumen perpajakan yang digunakan
              oleh toko.
            </Text>

            <Pressable
              onPress={() =>
                updateField(
                  'taxation',
                  'KTP Pemilik'
                )
              }
              disabled={
                busy
              }
              style={[
                styles.taxCard,
                form.taxation ===
                  'KTP Pemilik' &&
                  styles.taxCardSelected,
              ]}
            >
              <View
                style={[
                  styles.radio,
                  form.taxation ===
                    'KTP Pemilik' &&
                    styles.radioSelected,
                ]}
              >
                {form.taxation ===
                'KTP Pemilik' ? (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                ) : null}
              </View>

              <View
                style={
                  styles.taxContent
                }
              >
                <Text
                  style={[
                    styles.taxTitle,
                    form.taxation ===
                      'KTP Pemilik' &&
                      styles.taxTitleSelected,
                  ]}
                >
                  KTP Pemilik
                </Text>

                <Text
                  style={
                    styles.taxSubtitle
                  }
                >
                  Identitas menggunakan KTP
                  owner toko.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                updateField(
                  'taxation',
                  'KTP Bukan Pemilik'
                )
              }
              disabled={
                busy
              }
              style={[
                styles.taxCard,
                form.taxation ===
                  'KTP Bukan Pemilik' &&
                  styles.taxCardSelected,
              ]}
            >
              <View
                style={[
                  styles.radio,
                  form.taxation ===
                    'KTP Bukan Pemilik' &&
                    styles.radioSelected,
                ]}
              >
                {form.taxation ===
                'KTP Bukan Pemilik' ? (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                ) : null}
              </View>

              <View
                style={
                  styles.taxContent
                }
              >
                <Text
                  style={[
                    styles.taxTitle,
                    form.taxation ===
                      'KTP Bukan Pemilik' &&
                      styles.taxTitleSelected,
                  ]}
                >
                  KTP Bukan Pemilik
                </Text>

                <Text
                  style={
                    styles.taxSubtitle
                  }
                >
                  Identitas menggunakan KTP
                  pihak lain.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                updateField(
                  'taxation',
                  'NPWP'
                )
              }
              disabled={
                busy
              }
              style={[
                styles.taxCard,
                form.taxation ===
                  'NPWP' &&
                  styles.taxCardSelected,
              ]}
            >
              <View
                style={[
                  styles.radio,
                  form.taxation ===
                    'NPWP' &&
                    styles.radioSelected,
                ]}
              >
                {form.taxation ===
                'NPWP' ? (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                ) : null}
              </View>

              <View
                style={
                  styles.taxContent
                }
              >
                <Text
                  style={[
                    styles.taxTitle,
                    form.taxation ===
                      'NPWP' &&
                      styles.taxTitleSelected,
                  ]}
                >
                  NPWP
                </Text>

                <Text
                  style={
                    styles.taxSubtitle
                  }
                >
                  Toko menggunakan nomor
                  NPWP.
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ==================================================
           * LOCATION SUMMARY
           * ================================================== */}

          <View
            style={
              styles.locationCard
            }
          >
            <View
              style={
                styles.locationIcon
              }
            >
              <Text
                style={
                  styles.locationEmoji
                }
              >
                📍
              </Text>
            </View>

            <View
              style={
                styles.locationContent
              }
            >
              <Text
                style={
                  styles.locationTitle
                }
              >
                Store Location
              </Text>

              <Text
                style={
                  styles.locationText
                }
              >
                {form.latitude !==
                  0 &&
                form.longitude !==
                  0
                  ? `${form.latitude.toFixed(
                      6
                    )}, ${form.longitude.toFixed(
                      6
                    )}`
                  : 'Location not selected'}
              </Text>

              <Text
                style={
                  styles.locationRadius
                }
              >
                Radius: {
                  STORE_RADIUS_METERS
                }m
              </Text>
            </View>

            <View
              style={[
                styles.locationStatus,
                form.latitude !==
                  0 &&
                form.longitude !==
                  0
                  ? styles.locationStatusReady
                  : styles.locationStatusEmpty,
              ]}
            >
              <Text
                style={[
                  styles.locationStatusText,
                  form.latitude !==
                    0 &&
                  form.longitude !==
                    0
                    ? styles.locationStatusTextReady
                    : styles.locationStatusTextEmpty,
                ]}
              >
                {form.latitude !==
                  0 &&
                form.longitude !==
                  0
                  ? 'READY'
                  : 'MISSING'}
              </Text>
            </View>
          </View>

          {/* ==================================================
           * ERROR
           * ================================================== */}

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

          {/* ==================================================
           * SAVE NOTE
           * ================================================== */}

          <View
            style={
              styles.saveInfo
            }
          >
            <Text
              style={
                styles.saveInfoIcon
              }
            >
              ✓
            </Text>

            <Text
              style={
                styles.saveInfoText
              }
            >
              Store location is saved to the existing
              store system. Additional customer
              information is currently stored locally
              for the demo.
            </Text>
          </View>

          {/* ==================================================
           * SAVE
           * ================================================== */}

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
            disabled={
              busy
            }
            onPress={
              handleCreateStore
            }
            style={
              styles.createButton
            }
          />

          {/* ==================================================
           * CANCEL
           * ================================================== */}

          <Pressable
            style={[
              styles.cancelButton,
              busy &&
                styles.disabledButton,
            ]}
            onPress={
              handleCancel
            }
            disabled={
              busy
            }
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </Pressable>

          <Text
            style={
              styles.footer
            }
          >
            Customer and store registration
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

const styles =
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
    },

    container: {
      paddingBottom: 40,
    },

    /*
     * INTRO
     */

    introCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#eff6ff',
      borderWidth: 1,
      borderColor:
        '#bfdbfe',
      borderRadius: 17,
      padding: 15,
      marginBottom: 22,
    },

    introIcon: {
      width: 47,
      height: 47,
      borderRadius: 14,
      backgroundColor:
        '#dbeafe',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    introEmoji: {
      fontSize: 23,
    },

    introContent: {
      flex: 1,
    },

    introTitle: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#1e3a8a',
      marginBottom: 4,
    },

    introText: {
      fontSize: 10,
      lineHeight: 15,
      color:
        '#64748b',
    },

    /*
     * SECTION
     */

    sectionLabel: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#64748b',
      letterSpacing:
        1.2,
      marginBottom: 8,
    },

    /*
     * CARD
     */

    card: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
    },

    /*
     * LABEL
     */

    fieldLabel: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#475569',
      letterSpacing:
        0.8,
      marginBottom: 6,
    },

    fieldLabelSpaced: {
      marginTop: 17,
    },

    /*
     * INPUT
     */

    textInput: {
      minHeight: 45,
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 11,
      paddingHorizontal: 13,
      fontSize: 12,
      color:
        '#111827',
      marginBottom: 15,
    },

    /*
     * FIND LOCATION
     */

    findLocationButton: {
      minHeight: 46,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        '#2563eb',
      backgroundColor:
        '#eff6ff',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 2,
    },

    findLocationIcon: {
      fontSize: 17,
      marginRight: 7,
    },

    findLocationText: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#2563eb',
    },

    disabledButton: {
      opacity: 0.5,
    },

    pressed: {
      opacity: 0.7,
    },

    /*
     * LOCATION FOUND
     */

    locationFound: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f0fdf4',
      borderWidth: 1,
      borderColor:
        '#bbf7d0',
      borderRadius: 11,
      padding: 11,
      marginTop: 10,
    },

    locationFoundIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor:
        '#dcfce7',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    locationFoundIconText: {
      color:
        '#16a34a',
      fontSize: 12,
      fontWeight:
        '900',
    },

    locationFoundContent: {
      flex: 1,
    },

    locationFoundTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#15803d',
      marginBottom: 2,
    },

    locationFoundText: {
      fontSize: 8.5,
      lineHeight: 13,
      color:
        '#64748b',
    },

    /*
     * TOP LIMIT
     */

    currencyInput: {
      flexDirection:
        'row',
      alignItems:
        'center',
      minHeight: 45,
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 11,
      marginBottom: 4,
    },

    currencyPrefix: {
      paddingLeft: 13,
      paddingRight: 3,
      fontSize: 12,
      fontWeight:
        '800',
      color:
        '#64748b',
    },

    currencyTextInput: {
      flex: 1,
      height: 44,
      paddingHorizontal: 7,
      fontSize: 12,
      color:
        '#111827',
    },

    helperText: {
      fontSize: 8,
      color:
        '#a1a1aa',
    },

    /*
     * CATEGORY
     */

    categoryRow: {
      flexDirection:
        'row',
      gap: 9,
    },

    categoryCard: {
      flex: 1,
      minHeight: 72,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 13,
      backgroundColor:
        '#f8fafc',
      padding: 11,
      justifyContent:
        'center',
    },

    categoryCardSelected: {
      backgroundColor:
        '#eff6ff',
      borderColor:
        '#2563eb',
    },

    categoryTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 3,
    },

    categoryTitleSelected: {
      color:
        '#1d4ed8',
    },

    categorySubtitle: {
      fontSize: 8,
      color:
        '#94a3b8',
    },

    /*
     * TAX
     */

    taxDescription: {
      fontSize: 9,
      lineHeight: 14,
      color:
        '#94a3b8',
      marginBottom: 10,
    },

    taxCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 13,
      padding: 11,
      marginBottom: 8,
    },

    taxCardSelected: {
      backgroundColor:
        '#eff6ff',
      borderColor:
        '#2563eb',
    },

    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor:
        '#cbd5e1',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    radioSelected: {
      borderColor:
        '#2563eb',
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        '#2563eb',
    },

    taxContent: {
      flex: 1,
    },

    taxTitle: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 2,
    },

    taxTitleSelected: {
      color:
        '#1d4ed8',
    },

    taxSubtitle: {
      fontSize: 8,
      lineHeight: 13,
      color:
        '#94a3b8',
    },

    /*
     * LOCATION SUMMARY
     */

    locationCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 17,
      padding: 13,
      marginBottom: 16,
    },

    locationIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor:
        '#eff6ff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    locationEmoji: {
      fontSize: 20,
    },

    locationContent: {
      flex: 1,
    },

    locationTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 2,
    },

    locationText: {
      fontSize: 8.5,
      color:
        '#64748b',
      marginBottom: 3,
    },

    locationRadius: {
      fontSize: 7.5,
      color:
        '#94a3b8',
    },

    locationStatus: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
      marginLeft: 8,
    },

    locationStatusReady: {
      backgroundColor:
        '#ecfdf5',
    },

    locationStatusEmpty: {
      backgroundColor:
        '#f1f5f9',
    },

    locationStatusText: {
      fontSize: 6.5,
      fontWeight:
        '900',
      letterSpacing:
        0.7,
    },

    locationStatusTextReady: {
      color:
        '#15803d',
    },

    locationStatusTextEmpty: {
      color:
        '#64748b',
    },

    /*
     * ERROR
     */

    errorBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#fef2f2',
      borderWidth: 1,
      borderColor:
        '#fecaca',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },

    errorIcon: {
      fontSize: 17,
      marginRight: 8,
    },

    errorText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      color:
        '#b91c1c',
    },

    /*
     * SAVE INFO
     */

    saveInfo: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f8fafc',
      borderRadius: 12,
      padding: 10,
      marginBottom: 15,
    },

    saveInfoIcon: {
      width: 22,
      height: 22,
      borderRadius: 7,
      backgroundColor:
        '#ecfdf5',
      alignItems:
        'center',
      justifyContent:
        'center',
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#16a34a',
      marginRight: 7,
      textAlign:
        'center',
      textAlignVertical:
        'center',
    },

    saveInfoText: {
      flex: 1,
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
    },

    /*
     * BUTTONS
     */

    createButton: {
      marginBottom: 9,
    },

    cancelButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      marginBottom: 15,
    },

    cancelButtonText: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#94a3b8',
    },

    /*
     * FOOTER
     */

    footer: {
      textAlign:
        'center',
      fontSize: 7,
      color:
        '#c4c7ce',
    },
  });