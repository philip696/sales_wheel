import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';

const ATTENDANCE_BUCKET = 'attendance-photos';

type AttendanceRecord = {
  id: string;
  sales_id: string;
  distance_meters: number | null;
  gps_accuracy: number | null;
  photo_path: string | null;
  client_captured_at: string | null;
  created_at: string;
  order_confirmed: boolean | null;

  sales: {
    id: string;
    name: string;
    email: string;
    sales_code: string;
  } | null;

  store: {
    id: string;
    name: string;
  } | null;

  photo_url: string | null;

  orderPlaced: boolean;
};

export default function AdminAttendanceScreen() {
  const [records, setRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * LOAD ATTENDANCE
   * ============================================================
   */

  const loadAttendance =
    useCallback(async () => {
      try {
        setError(null);

        /*
         * --------------------------------------------------------
         * GET AUTHENTICATED USER
         * --------------------------------------------------------
         */

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            `Authentication error: ${authError.message}`
          );
        }

        if (!user) {
          throw new Error(
            'You are not authenticated.'
          );
        }

        /*
         * --------------------------------------------------------
         * LOAD APPROVED ATTENDANCE
         * --------------------------------------------------------
         *
         * We now also select sales_id because we need it
         * to identify the salesperson attached to each visit.
         */

        const {
          data,
          error: attendanceError,
        } =
          await supabase
            .from('attendance')
            .select(`
              id,
              sales_id,
              distance_meters,
              gps_accuracy,
              photo_path,
              client_captured_at,
              created_at,
              order_confirmed,

              sales:sales_id (
                id,
                name,
                email,
                sales_code
              ),

              store:store_id (
                id,
                name
              )
            `)
            .eq(
              'status',
              'approved'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            );

        if (attendanceError) {
          throw new Error(
            `Could not read attendance: ${attendanceError.message}`
          );
        }

        /*
         * --------------------------------------------------------
         * PREPARE ATTENDANCE RECORDS
         * --------------------------------------------------------
         */

        const attendanceRecords =
          (data ??
            []) as unknown as Omit<
            AttendanceRecord,
            'photo_url' | 'orderPlaced'
          >[];

        /*
         * --------------------------------------------------------
         * LOAD SIGNED PHOTO URLS
         * --------------------------------------------------------
         */

        const recordsWithPhotos =
          await Promise.all(
            attendanceRecords.map(
              async (record) => {
                let photoUrl:
                  | string
                  | null = null;

                if (
                  record.photo_path
                ) {
                  const {
                    data: signedUrl,
                  } =
                    await supabase.storage
                      .from(
                        ATTENDANCE_BUCKET
                      )
                      .createSignedUrl(
                        record.photo_path,
                        60 * 60
                      );

                  photoUrl =
                    signedUrl?.signedUrl ??
                    null;
                }

                return {
                  ...record,
                  photo_url:
                    photoUrl,

                  /*
                   * Whether this visit resulted in an order,
                   * read directly from
                   * attendance.order_confirmed
                   * (008_attendance_order_confirmation.sql)
                   * rather than inferred from a linked spins
                   * row. NULL (not yet answered) is treated
                   * the same as NO for this badge, since the
                   * UI only has a binary YES/NO state today.
                   */
                  orderPlaced:
                    record.order_confirmed ===
                    true,
                };
              }
            )
          );

        setRecords(
          recordsWithPhotos
        );
      } catch (err) {
        console.error(
          'ADMIN ATTENDANCE ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load attendance'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const handleRefresh =
    () => {
      setRefreshing(true);
      loadAttendance();
    };

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const totalAttendance =
    records.length;

  const totalOrders =
    records.filter(
      (record) =>
        record.orderPlaced
    ).length;

  const totalNoOrders =
    totalAttendance -
    totalOrders;

  /*
   * Order percentage:
   *
   * Orders / Total Attendance × 100
   */

  const orderPercentage =
    totalAttendance > 0
      ? (totalOrders /
          totalAttendance) *
        100
      : 0;

  const orderPercentageDisplay =
    `${orderPercentage.toFixed(1)}%`;

  /*
   * ============================================================
   * SCREEN
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Attendance Monitoring"
      subtitle="Recorded sales attendance"
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
      >
        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <View
          style={
            styles.summaryGrid
          }
        >
          {/* TOTAL ATTENDANCE */}

          <View
            style={[
              styles.summaryCard,
              styles.totalCard,
            ]}
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {loading
                ? '—'
                : totalAttendance}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              ATTENDANCE
            </Text>
          </View>

          {/* ORDERS */}

          <View
            style={[
              styles.summaryCard,
              styles.orderCard,
            ]}
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {loading
                ? '—'
                : totalOrders}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              ORDERS
            </Text>
          </View>

          {/* NO ORDERS */}

          <View
            style={[
              styles.summaryCard,
              styles.noOrderCard,
            ]}
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {loading
                ? '—'
                : totalNoOrders}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              NO ORDER
            </Text>
          </View>

          {/* ORDER RATE */}

          <View
            style={[
              styles.summaryCard,
              styles.rateCard,
            ]}
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {loading
                ? '—'
                : orderPercentageDisplay}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              ORDER RATE
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* ORDER RATE DETAILS */}
        {/* ================================================== */}

        {!loading &&
        !error &&
        totalAttendance > 0 ? (
          <View
            style={
              styles.rateDetailCard
            }
          >
            <View
              style={
                styles.rateHeader
              }
            >
              <View
                style={
                  styles.rateHeaderText
                }
              >
                <Text
                  style={
                    styles.rateTitle
                  }
                >
                  OVERALL ORDER RATE
                </Text>

                <Text
                  style={
                    styles.rateDescription
                  }
                >
                  Percentage of approved
                  store visits that resulted
                  in an order.
                </Text>
              </View>

              <Text
                style={
                  styles.ratePercentage
                }
              >
                {
                  orderPercentageDisplay
                }
              </Text>
            </View>

            {/* PROGRESS BAR */}

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      orderPercentage,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>

            <View
              style={
                styles.rateFooter
              }
            >
              <Text
                style={
                  styles.rateFooterText
                }
              >
                {totalOrders} orders
              </Text>

              <Text
                style={
                  styles.rateFooterText
                }
              >
                {totalNoOrders}{' '}
                no orders
              </Text>

              <Text
                style={
                  styles.rateFooterText
                }
              >
                {totalAttendance}{' '}
                visits
              </Text>
            </View>
          </View>
        ) : null}

        {/* ================================================== */}
        {/* LOADING */}
        {/* ================================================== */}

        {loading ? (
          <View
            style={
              styles.stateCard
            }
          >
            <ActivityIndicator
              size="large"
              color="#2563eb"
            />

            <Text
              style={
                styles.stateTitle
              }
            >
              Loading Attendance
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Reading recorded
              attendance...
            </Text>
          </View>
        ) : null}

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {!loading &&
        error ? (
          <View
            style={
              styles.stateCard
            }
          >
            <Text
              style={
                styles.stateIcon
              }
            >
              ⚠️
            </Text>

            <Text
              style={
                styles.stateTitle
              }
            >
              Unable to Load Attendance
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* ================================================== */}
        {/* EMPTY */}
        {/* ================================================== */}

        {!loading &&
        !error &&
        records.length ===
          0 ? (
          <View
            style={
              styles.stateCard
            }
          >
            <Text
              style={
                styles.stateIcon
              }
            >
              📋
            </Text>

            <Text
              style={
                styles.stateTitle
              }
            >
              No Recorded Attendance
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Recorded attendance
              will appear here.
            </Text>
          </View>
        ) : null}

        {/* ================================================== */}
        {/* ATTENDANCE LIST */}
        {/* ================================================== */}

        {!loading &&
        !error &&
        records.length > 0 ? (
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              RECORDED ATTENDANCE
            </Text>

            {records.map(
              (record) => (
                <View
                  key={record.id}
                  style={
                    styles.card
                  }
                >
                  {/* PHOTO */}

                  {record.photo_url ? (
                    <Image
                      source={{
                        uri: record.photo_url,
                      }}
                      style={
                        styles.photo
                      }
                      resizeMode="cover"
                    />
                  ) : null}

                  {/* HEADER */}

                  <View
                    style={
                      styles.header
                    }
                  >
                    <View
                      style={
                        styles.headerText
                      }
                    >
                      <Text
                        style={
                          styles.storeName
                        }
                      >
                        {record
                          .store
                          ?.name ??
                          'Unknown Store'}
                      </Text>

                      <Text
                        style={
                          styles.salesName
                        }
                      >
                        {record
                          .sales
                          ?.name ??
                          'Unknown Sales Rep'}
                      </Text>
                    </View>

                    {/* ORDER BADGE */}

                    <View
                      style={[
                        styles.badge,
                        record.orderPlaced
                          ? styles.orderBadge
                          : styles.noOrderBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          record.orderPlaced
                            ? styles.orderBadgeText
                            : styles.noOrderBadgeText,
                        ]}
                      >
                        {record.orderPlaced
                          ? 'ORDER: YES'
                          : 'ORDER: NO'}
                      </Text>
                    </View>
                  </View>

                  {/* DETAILS */}

                  <View
                    style={
                      styles.details
                    }
                  >
                    <Detail
                      label="ATTENDANCE"
                      value={new Date(
                        record.created_at
                      ).toLocaleString()}
                    />

                    <Detail
                      label="PHOTO CAPTURED"
                      value={
                        record.client_captured_at
                          ? new Date(
                              record.client_captured_at
                            ).toLocaleString()
                          : '—'
                      }
                    />

                    <Detail
                      label="DISTANCE"
                      value={
                        record.distance_meters !==
                        null
                          ? `${record.distance_meters.toFixed(
                              1
                            )} m`
                          : '—'
                      }
                    />

                    <Detail
                      label="GPS ACCURACY"
                      value={
                        record.gps_accuracy !==
                        null
                          ? `${record.gps_accuracy.toFixed(
                              1
                            )} m`
                          : '—'
                      }
                    />

                    <Detail
                      label="ORDER"
                      value={
                        record.orderPlaced
                          ? 'YES'
                          : 'NO'
                      }
                    />
                  </View>
                </View>
              )
            )}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/*
 * ================================================================
 * DETAIL
 * ================================================================
 */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.detail}
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * ================================================================
 * STYLES
 * ================================================================
 */

const styles =
  StyleSheet.create({
    container: {
      paddingBottom: 30,
    },

    /* =======================================================
     * SUMMARY
     * ======================================================= */

    summaryGrid: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },

    summaryCard: {
      width: '48%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 15,
      alignItems: 'center',
    },

    totalCard: {
      backgroundColor:
        '#eff6ff',
      borderColor:
        '#bfdbfe',
    },

    orderCard: {
      backgroundColor:
        '#f0fdf4',
      borderColor:
        '#bbf7d0',
    },

    noOrderCard: {
      backgroundColor:
        '#f8fafc',
      borderColor:
        '#e2e8f0',
    },

    rateCard: {
      backgroundColor:
        '#faf5ff',
      borderColor:
        '#e9d5ff',
    },

    summaryNumber: {
      fontSize: 24,
      fontWeight: '900',
      color: '#111827',
    },

    summaryLabel: {
      fontSize: 8,
      fontWeight: '900',
      color: '#64748b',
      letterSpacing: 0.8,
      marginTop: 3,
    },

    /* =======================================================
     * ORDER RATE
     * ======================================================= */

    rateDetailCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 16,
      padding: 15,
      marginBottom: 22,
    },

    rateHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 13,
    },

    rateHeaderText: {
      flex: 1,
      marginRight: 12,
    },

    rateTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#64748b',
      letterSpacing: 1,
      marginBottom: 4,
    },

    rateDescription: {
      fontSize: 10,
      color: '#94a3b8',
      lineHeight: 15,
    },

    ratePercentage: {
      fontSize: 26,
      fontWeight: '900',
      color: '#7c3aed',
    },

    progressTrack: {
      height: 9,
      backgroundColor:
        '#f1f5f9',
      borderRadius: 10,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor:
        '#7c3aed',
      borderRadius: 10,
    },

    rateFooter: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      marginTop: 7,
    },

    rateFooterText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#94a3b8',
    },

    /* =======================================================
     * SECTION
     * ======================================================= */

    sectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#94a3b8',
      letterSpacing: 1,
      marginBottom: 9,
    },

    /* =======================================================
     * STATE
     * ======================================================= */

    stateCard: {
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 17,
      padding: 28,
      alignItems: 'center',
      marginBottom: 18,
    },

    stateIcon: {
      fontSize: 40,
      marginBottom: 12,
    },

    stateTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: '#111827',
      textAlign:
        'center',
      marginBottom: 6,
    },

    stateText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#64748b',
      textAlign:
        'center',
    },

    /* =======================================================
     * ATTENDANCE CARD
     * ======================================================= */

    card: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 17,
      padding: 15,
      marginBottom: 12,
    },

    photo: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      marginBottom: 14,
      backgroundColor:
        '#f1f5f9',
    },

    header: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    headerText: {
      flex: 1,
      marginRight: 10,
    },

    storeName: {
      fontSize: 16,
      fontWeight: '900',
      color: '#111827',
    },

    salesName: {
      fontSize: 13,
      color: '#475569',
      marginTop: 3,
    },

    /* =======================================================
     * BADGES
     * ======================================================= */

    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },

    orderBadge: {
      backgroundColor:
        '#dcfce7',
    },

    noOrderBadge: {
      backgroundColor:
        '#f1f5f9',
    },

    badgeText: {
      fontSize: 10,
      fontWeight: '800',
    },

    orderBadgeText: {
      color: '#166534',
    },

    noOrderBadgeText: {
      color: '#64748b',
    },

    /* =======================================================
     * DETAILS
     * ======================================================= */

    details: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        '#f1f5f9',
      gap: 10,
    },

    detail: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      gap: 10,
    },

    detailLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: '#94a3b8',
    },

    detailValue: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      color: '#334155',
      textAlign: 'right',
    },
  });