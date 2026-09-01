import { router } from 'expo-router';
import {
    useMemo,
    useState,
} from 'react';

import {
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

import {
    ScreenContainer,
} from '@/src/components/ScreenContainer';

type StoreCategory =
  | 'Grosir'
  | 'Retail';

type TaxType =
  | 'KTP Pemilik'
  | 'KTP Bukan Pemilik'
  | 'NPWP';

interface CustomerForm {
  name: string;
  address: string;
  phone1: string;
  phone2: string;
  owner: string;
  topLimit: string;
  category: StoreCategory | '';
  taxation: TaxType | '';
  area: string;
}

const INITIAL_FORM: CustomerForm = {
  name: '',
  address: '',
  phone1: '',
  phone2: '',
  owner: '',
  topLimit: '',
  category: '',
  taxation: '',
  area: '',
};

export default function AddCustomerScreen() {
  const [
    form,
    setForm,
  ] =
    useState<CustomerForm>(
      INITIAL_FORM
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
   * ============================================================
   * FORM UPDATE
   * ============================================================
   */

  const updateField = <
    K extends keyof CustomerForm
  >(
    field: K,
    value: CustomerForm[K]
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
   * FORMAT TOP LIMIT
   * ============================================================
   */

  const formattedTopLimit =
    useMemo(() => {
      const numeric =
        Number(
          form.topLimit
            .replace(
              /\D/g,
              ''
            )
        );

      if (
        !numeric
      ) {
        return '';
      }

      return new Intl.NumberFormat(
        'id-ID'
      ).format(
        numeric
      );
    }, [
      form.topLimit,
    ]);

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  const validateForm =
    (): string | null => {
      if (
        form.name.trim()
          .length < 2
      ) {
        return 'Nama toko harus diisi.';
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
        !form.topLimit.trim()
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

      return null;
    };

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  const handleSave =
    async () => {
      if (
        saving
      ) {
        return;
      }

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        Alert.alert(
          'Data Belum Lengkap',
          validationError
        );

        return;
      }

      setSaving(
        true
      );

      try {
        /*
         * ======================================================
         * DEMO ONLY
         * ======================================================
         *
         * This currently does not write to Supabase.
         *
         * Later your friend can replace this block with:
         *
         * await createCustomer(...)
         *
         * or an RPC / Supabase insert.
         */

        const customerData = {
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
        };

        console.log(
          'DEMO CUSTOMER CREATED:',
          customerData
        );

        Alert.alert(
          'Customer Added',
          `${customerData.name} has been added successfully.`,
          [
            {
              text:
                'Back to Home',

              onPress:
                () =>
                  router.replace(
                    '/(sales)'
                  ),
            },
          ]
        );
      } catch (
        error
      ) {
        console.error(
          'ADD CUSTOMER ERROR:',
          error
        );

        Alert.alert(
          'Could Not Save',
          error instanceof Error
            ? error.message
            : 'Something went wrong while saving the customer.'
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /*
   * ============================================================
   * CANCEL
   * ============================================================
   */

  const handleCancel =
    () => {
      if (
        saving
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
   * RENDER
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Add Customer"
      subtitle="Enter the store's business information"
    >
      <KeyboardAvoidingView
        style={
          styles.flex
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
                Customer information
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                Complete the customer's business
                details so your team has a
                consistent record for every store.
              </Text>
            </View>
          </View>

          {/* ==================================================
           * BASIC INFORMATION
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            BASIC INFORMATION
          </Text>

          <View
            style={
              styles.card
            }
          >
            {/* NAME */}

            <Text
              style={
                styles.label
              }
            >
              NAMA TOKO
            </Text>

            <TextInput
              value={
                form.name
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'name',
                  value
                )
              }
              placeholder="Contoh: Toko Sumber Jaya"
              placeholderTextColor="#a1a1aa"
              editable={
                !saving
              }
              style={
                styles.input
              }
            />

            {/* ADDRESS */}

            <Text
              style={
                styles.label
              }
            >
              ALAMAT
            </Text>

            <TextInput
              value={
                form.address
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'address',
                  value
                )
              }
              placeholder="Masukkan alamat lengkap"
              placeholderTextColor="#a1a1aa"
              editable={
                !saving
              }
              multiline
              numberOfLines={
                4
              }
              textAlignVertical="top"
              style={[
                styles.input,
                styles.multilineInput,
              ]}
            />

            {/* AREA */}

            <Text
              style={
                styles.label
              }
            >
              AREA
            </Text>

            <TextInput
              value={
                form.area
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'area',
                  value
                )
              }
              placeholder="Contoh: Surabaya Barat"
              placeholderTextColor="#a1a1aa"
              editable={
                !saving
              }
              style={
                styles.input
              }
            />
          </View>

          {/* ==================================================
           * CONTACT
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            CONTACT
          </Text>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.label
              }
            >
              NOMOR TELEPON 1
            </Text>

            <TextInput
              value={
                form.phone1
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'phone1',
                  value.replace(
                    /[^0-9+\-\s]/g,
                    ''
                  )
                )
              }
              placeholder="Nomor utama"
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              editable={
                !saving
              }
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.label
              }
            >
              NOMOR TELEPON 2
            </Text>

            <TextInput
              value={
                form.phone2
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'phone2',
                  value.replace(
                    /[^0-9+\-\s]/g,
                    ''
                  )
                )
              }
              placeholder="Nomor tambahan (opsional)"
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              editable={
                !saving
              }
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.label
              }
            >
              OWNER
            </Text>

            <TextInput
              value={
                form.owner
              }
              onChangeText={(
                value
              ) =>
                updateField(
                  'owner',
                  value
                )
              }
              placeholder="Nama pemilik toko"
              placeholderTextColor="#a1a1aa"
              editable={
                !saving
              }
              style={
                styles.input
              }
            />
          </View>

          {/* ==================================================
           * BUSINESS INFORMATION
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
            {/* TOP LIMIT */}

            <Text
              style={
                styles.label
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
                  value
                ) =>
                  updateField(
                    'topLimit',
                    value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                keyboardType="numeric"
                editable={
                  !saving
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

            {/* CATEGORY */}

            <Text
              style={
                [
                  styles.label,
                  styles.spacedLabel,
                ]
              }
            >
              KATEGORI TOKO
            </Text>

            <View
              style={
                styles.optionRow
              }
            >
              {(
                [
                  'Grosir',
                  'Retail',
                ] as StoreCategory[]
              ).map(
                (
                  category
                ) => {
                  const selected =
                    form.category ===
                    category;

                  return (
                    <Pressable
                      key={
                        category
                      }
                      onPress={() =>
                        updateField(
                          'category',
                          category
                        )
                      }
                      disabled={
                        saving
                      }
                      style={[
                        styles.option,
                        selected &&
                          styles.optionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionTitle,
                          selected &&
                            styles.optionTitleSelected,
                        ]}
                      >
                        {category}
                      </Text>

                      <Text
                        style={[
                          styles.optionSubtitle,
                          selected &&
                            styles.optionSubtitleSelected,
                        ]}
                      >
                        {category ===
                        'Grosir'
                          ? 'Wholesale'
                          : 'Retail store'}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>

          {/* ==================================================
           * TAX
           * ================================================== */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            PERPAJAKAN
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

            <View
              style={
                styles.taxOptions
              }
            >
              {(
                [
                  'KTP Pemilik',
                  'KTP Bukan Pemilik',
                  'NPWP',
                ] as TaxType[]
              ).map(
                (
                  tax
                ) => {
                  const selected =
                    form.taxation ===
                    tax;

                  return (
                    <Pressable
                      key={
                        tax
                      }
                      onPress={() =>
                        updateField(
                          'taxation',
                          tax
                        )
                      }
                      disabled={
                        saving
                      }
                      style={[
                        styles.taxOption,
                        selected &&
                          styles.taxOptionSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          selected &&
                            styles.radioSelected,
                        ]}
                      >
                        {selected ? (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.taxTextContainer
                        }
                      >
                        <Text
                          style={[
                            styles.taxTitle,
                            selected &&
                              styles.taxTitleSelected,
                          ]}
                        >
                          {tax}
                        </Text>

                        <Text
                          style={
                            styles.taxSubtitle
                          }
                        >
                          {tax ===
                          'KTP Pemilik'
                            ? 'Dokumen menggunakan identitas owner.'
                            : tax ===
                                'KTP Bukan Pemilik'
                              ? 'Dokumen menggunakan identitas pihak lain.'
                              : 'Toko menggunakan nomor NPWP.'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>

          {/* ==================================================
           * SUMMARY
           * ================================================== */}

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              CUSTOMER SUMMARY
            </Text>

            <SummaryRow
              label="Nama"
              value={
                form.name ||
                '—'
              }
            />

            <SummaryRow
              label="Owner"
              value={
                form.owner ||
                '—'
              }
            />

            <SummaryRow
              label="Kategori"
              value={
                form.category ||
                '—'
              }
            />

            <SummaryRow
              label="Perpajakan"
              value={
                form.taxation ||
                '—'
              }
            />

            <SummaryRow
              label="Area"
              value={
                form.area ||
                '—'
              }
            />

            <SummaryRow
              label="TOP Limit"
              value={
                formattedTopLimit
                  ? `Rp ${formattedTopLimit}`
                  : '—'
              }
              last
            />
          </View>

          {/* ==================================================
           * SAVE
           * ================================================== */}

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={
              handleSave
            }
            disabled={
              saving
            }
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              {saving
                ? 'SAVING...'
                : 'SAVE CUSTOMER'}
            </Text>
          </Pressable>

          {/* ==================================================
           * CANCEL
           * ================================================== */}

          <Pressable
            style={[
              styles.cancelButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={
              handleCancel
            }
            disabled={
              saving
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

          {/* ==================================================
           * DEMO NOTE
           * ================================================== */}

          <Text
            style={
              styles.demoNote
            }
          >
            DEMO MODE · Customer information is
            currently stored locally for the presentation.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * SUMMARY ROW
 * ============================================================
 */

function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        !last &&
          styles.summaryRowBorder,
      ]}
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
        numberOfLines={
          1
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    flex: {
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
      width: 46,
      height: 46,
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
      fontSize: 22,
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
     * LABELS
     */

    label: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#475569',
      letterSpacing:
        0.8,
      marginBottom: 6,
    },

    spacedLabel: {
      marginTop: 17,
    },

    /*
     * INPUT
     */

    input: {
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

    multilineInput: {
      minHeight: 92,
      paddingTop: 12,
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
      paddingRight: 4,
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
      marginBottom: 2,
    },

    /*
     * CATEGORY
     */

    optionRow: {
      flexDirection:
        'row',
      gap: 9,
    },

    option: {
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

    optionSelected: {
      borderColor:
        '#2563eb',
      backgroundColor:
        '#eff6ff',
    },

    optionTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 3,
    },

    optionTitleSelected: {
      color:
        '#1d4ed8',
    },

    optionSubtitle: {
      fontSize: 8,
      color:
        '#94a3b8',
    },

    optionSubtitleSelected: {
      color:
        '#60a5fa',
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

    taxOptions: {
      gap: 8,
    },

    taxOption: {
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 13,
      padding: 11,
      backgroundColor:
        '#f8fafc',
    },

    taxOptionSelected: {
      borderColor:
        '#2563eb',
      backgroundColor:
        '#eff6ff',
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

    taxTextContainer: {
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
     * SUMMARY
     */

    summaryCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      paddingHorizontal: 15,
      paddingTop: 13,
      marginBottom: 18,
    },

    summaryTitle: {
      fontSize: 8,
      fontWeight:
        '900',
      letterSpacing:
        1,
      color:
        '#94a3b8',
      marginBottom: 2,
    },

    summaryRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingVertical: 11,
    },

    summaryRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        '#f1f5f9',
    },

    summaryLabel: {
      fontSize: 9,
      color:
        '#94a3b8',
      marginRight: 15,
    },

    summaryValue: {
      flex: 1,
      textAlign:
        'right',
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#334155',
    },

    /*
     * SAVE
     */

    saveButton: {
      minHeight: 49,
      borderRadius: 13,
      backgroundColor:
        '#111827',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 9,
    },

    saveButtonText: {
      color:
        '#ffffff',
      fontSize: 11,
      fontWeight:
        '900',
      letterSpacing:
        0.6,
    },

    /*
     * CANCEL
     */

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

    disabledButton: {
      opacity: 0.5,
    },

    /*
     * DEMO
     */

    demoNote: {
      fontSize: 7.5,
      lineHeight: 12,
      textAlign:
        'center',
      color:
        '#c4c7ce',
      paddingHorizontal: 25,
    },
  });