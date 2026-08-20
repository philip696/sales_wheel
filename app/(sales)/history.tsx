import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';

type AttendanceRecord = {
  id: string;
  sales_id: string;
  store_id: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  distance_meters: number | null;
  photo_path: string | null;
  client_captured_at: string | null;
  created_at: string;
  order_confirmed: boolean | null;

  store: {
    id: string;
    name: string;
  } | null;
};

type HistoryRecord = AttendanceRecord & {
  orderPlaced: boolean;
};

export default function SalesHistoryScreen() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * LOAD HISTORY
   * ============================================================
   */

  const loadHistory = useCallback(async () => {
    try {
      setError(null);

      /*
       * ----------------------------------------------------------
       * GET AUTHENTICATED USER
       * ----------------------------------------------------------
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

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
       * ----------------------------------------------------------
       * GET SALES PROFILE
       * ----------------------------------------------------------
       */

      const {
        data: sales,
        error: salesError,
      } = await supabase
        .from('sales')
        .select(
          'id, name, email, sales_code'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (salesError) {
        throw new Error(
          `Could not find sales profile: ${salesError.message}`
        );
      }

      if (!sales) {
        throw new Error(
          'Sales profile not found for this account.'
        );
      }

      /*
       * ----------------------------------------------------------
       * LOAD ATTENDANCE
       * ----------------------------------------------------------
       */

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from('attendance')
        .select(`
          id,
          sales_id,
          store_id,
          latitude,
          longitude,
          gps_accuracy,
          distance_meters,
          photo_path,
          client_captured_at,
          created_at,
          order_confirmed,

          store:store_id (
            id,
            name
          )
        `)
        .eq('sales_id', sales.id)
        .order('created_at', {
          ascending: false,
        });

      if (attendanceError) {
        throw new Error(
          `Could not load attendance history: ${attendanceError.message}`
        );
      }

      const attendanceRecords =
        (attendanceData ??
          []) as unknown as AttendanceRecord[];

      /*
       * ----------------------------------------------------------
       * ATTACH ORDER RESULT
       * ----------------------------------------------------------
       *
       * Read directly from attendance.order_confirmed
       * (008_attendance_order_confirmation.sql) instead of
       * inferring it from a linked spins row. NULL (not yet
       * answered) is treated the same as NO here, since this
       * screen only shows a binary YES/NO state today.
       */

      const history: HistoryRecord[] =
        attendanceRecords.map(
          (record) => ({
            ...record,
            orderPlaced:
              record.order_confirmed ===
              true,
          })
        );

      setRecords(history);
    } catch (err) {
      console.error(
        'SALES HISTORY ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load store history.'
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
    loadHistory();
  }, [loadHistory]);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  /*
   * ============================================================
   * SUMMARY
   * ============================================================
   */

  const totalVisits =
    records.length;

  const totalOrders =
    records.filter(
      (record) =>
        record.orderPlaced
    ).length;

  const totalNoOrders =
    totalVisits - totalOrders;

  /*
   * ============================================================
   * ORDER PERCENTAGE
   * ============================================================
   *
   * Example:
   *
   * 7 orders / 10 visits = 70%
   *
   * If there are no visits, show 0%.
   */

  const orderPercentage =
    totalVisits > 0
      ? (totalOrders /
          totalVisits) *
        100
      : 0;

  /*
   * Round to one decimal place.
   *
   * 66.666... → 66.7%
   */

  const orderPercentageDisplay =
    `${orderPercentage.toFixed(1)}%`;

  /*
   * ============================================================
   * SCREEN
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Visit History"
      subtitle="Your store visits and order results"
      scroll={false}
    >
      <FlatList
        data={records}
        keyExtractor={(item) =>
          item.id
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={
          records.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        ListHeaderComponent={
          <>
            {/* ================================================= */}
            {/* SUMMARY */}
            {/* ================================================= */}

            <View
              style={styles.summaryRow}
            >
              <SummaryCard
                number={
                  loading
                    ? '—'
                    : totalVisits
                }
                label="Total Visits"
                numberStyle={
                  styles.totalNumber
                }
              />

              <SummaryCard
                number={
                  loading
                    ? '—'
                    : totalOrders
                }
                label="Total Orders"
                numberStyle={
                  styles.orderNumber
                }
              />

              <SummaryCard
                number={
                  loading
                    ? '—'
                    : totalNoOrders
                }
                label="No Order"
                numberStyle={
                  styles.noOrderNumber
                }
              />

              <SummaryCard
                number={
                  loading
                    ? '—'
                    : orderPercentageDisplay
                }
                label="Order Rate"
                numberStyle={
                  styles.orderRateNumber
                }
              />
            </View>

            {/* ================================================= */}
            {/* ORDER RATE DETAIL */}
            {/* ================================================= */}

            {!loading &&
            !error &&
            totalVisits > 0 ? (
              <View
                style={
                  styles.orderRateCard
                }
              >
                <View
                  style={
                    styles.orderRateHeader
                  }
                >
                  <View
                    style={
                      styles.orderRateHeaderContent
                    }
                  >
                    <Text
                      style={
                        styles.orderRateTitle
                      }
                    >
                      ORDER RATE
                    </Text>

                    <Text
                      style={
                        styles.orderRateDescription
                      }
                    >
                      Percentage of store visits
                      that resulted in an order.
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.orderRatePercentage
                    }
                  >
                    {orderPercentageDisplay}
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
                    styles.orderRateFooter
                  }
                >
                  <Text
                    style={
                      styles.orderRateFooterText
                    }
                  >
                    {totalOrders} orders
                  </Text>

                  <Text
                    style={
                      styles.orderRateFooterText
                    }
                  >
                    {totalVisits} visits
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ================================================= */}
            {/* LOADING */}
            {/* ================================================= */}

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
                  Loading History
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  Reading your store
                  visits...
                </Text>
              </View>
            ) : null}

            {/* ================================================= */}
            {/* ERROR */}
            {/* ================================================= */}

            {!loading && error ? (
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
                  Unable to Load History
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

            {/* ================================================= */}
            {/* SECTION TITLE */}
            {/* ================================================= */}

            {!loading &&
            !error &&
            records.length > 0 ? (
              <Text
                style={
                  styles.sectionTitle
                }
              >
                STORE VISITS
              </Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <AttendanceCard
            record={item}
          />
        )}
        ListEmptyComponent={
          !loading &&
          !error ? (
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
                No Store Visits Yet
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Your store visit history
                will appear here after
                you complete your first
                attendance.
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

/*
 * ================================================================
 * SUMMARY CARD
 * ================================================================
 */

function SummaryCard({
  number,
  label,
  numberStyle,
}: {
  number: number | string;
  label: string;
  numberStyle?: object;
}) {
  return (
    <View
      style={styles.summaryCard}
    >
      <Text
        style={[
          styles.summaryNumber,
          numberStyle,
        ]}
      >
        {number}
      </Text>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * ================================================================
 * ATTENDANCE CARD
 * ================================================================
 */

function AttendanceCard({
  record,
}: {
  record: HistoryRecord;
}) {
  const submittedAt =
    record.created_at
      ? new Date(
          record.created_at
        ).toLocaleString(
          'id-ID'
        )
      : 'Unknown';

  const capturedAt =
    record.client_captured_at
      ? new Date(
          record.client_captured_at
        ).toLocaleString(
          'id-ID'
        )
      : null;

  return (
    <View
      style={
        styles.attendanceCard
      }
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <View
        style={
          styles.attendanceHeader
        }
      >
        <View
          style={styles.storeHeader}
        >
          <Text
            style={styles.storeIcon}
          >
            📍
          </Text>

          <View
            style={
              styles.storeHeaderText
            }
          >
            <Text
              style={styles.storeName}
            >
              {record.store?.name ??
                'Unknown Store'}
            </Text>

            <Text
              style={
                styles.submittedDate
              }
            >
              {submittedAt}
            </Text>
          </View>
        </View>

        {/* ORDER BADGE */}

        <View
          style={[
            styles.orderBadge,
            record.orderPlaced
              ? styles.orderYes
              : styles.orderNo,
          ]}
        >
          <Text
            style={[
              styles.orderBadgeText,
              record.orderPlaced
                ? styles.orderYesText
                : styles.orderNoText,
            ]}
          >
            {record.orderPlaced
              ? 'ORDER: YES'
              : 'ORDER: NO'}
          </Text>
        </View>
      </View>

      {/* ================================================= */}
      {/* SEPARATOR */}
      {/* ================================================= */}

      <View
        style={styles.separator}
      />

      {/* ================================================= */}
      {/* DETAILS */}
      {/* ================================================= */}

      <View
        style={styles.detailsGrid}
      >
        <Detail
          label="VISIT DATE"
          value={submittedAt}
        />

        {capturedAt ? (
          <Detail
            label="PHOTO CAPTURED"
            value={capturedAt}
          />
        ) : null}

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
      </View>

      {/* ================================================= */}
      {/* ORDER MESSAGE */}
      {/* ================================================= */}

      <View
        style={[
          styles.orderMessage,
          record.orderPlaced
            ? styles.orderMessageYes
            : styles.orderMessageNo,
        ]}
      >
        <Text
          style={[
            styles.orderMessageText,
            record.orderPlaced
              ? styles.orderMessageTextYes
              : styles.orderMessageTextNo,
          ]}
        >
          {record.orderPlaced
            ? '✓ Shop placed an order during this visit'
            : '— Shop did not place an order during this visit'}
        </Text>
      </View>
    </View>
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
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.detailValue}
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

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  /* =========================================================
   * SUMMARY
   * ========================================================= */

  summaryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor:
      '#f8fafc',
    borderWidth: 1,
    borderColor:
      '#e2e8f0',
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },

  summaryNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
    textAlign: 'center',
  },

  totalNumber: {
    color: '#2563eb',
  },

  orderNumber: {
    color: '#16a34a',
  },

  noOrderNumber: {
    color: '#64748b',
  },

  orderRateNumber: {
    color: '#7c3aed',
  },

  summaryLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'center',
    textTransform:
      'uppercase',
  },

  /* =========================================================
   * ORDER RATE
   * ========================================================= */

  orderRateCard: {
    backgroundColor:
      '#ffffff',
    borderWidth: 1,
    borderColor:
      '#e2e8f0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 22,
  },

  orderRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  orderRateHeaderContent: {
    flex: 1,
    marginRight: 12,
  },

  orderRateTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },

  orderRateDescription: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
  },

  orderRatePercentage: {
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

  orderRateFooter: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop: 7,
  },

  orderRateFooterText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },

  /* =========================================================
   * STATE
   * ========================================================= */

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
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },

  stateText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    textAlign: 'center',
  },

  /* =========================================================
   * SECTION
   * ========================================================= */

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 9,
  },

  /* =========================================================
   * ATTENDANCE CARD
   * ========================================================= */

  attendanceCard: {
    backgroundColor:
      '#ffffff',
    borderWidth: 1,
    borderColor:
      '#e2e8f0',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
  },

  storeHeader: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },

  storeIcon: {
    fontSize: 22,
    marginRight: 9,
  },

  storeHeaderText: {
    flex: 1,
  },

  storeName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },

  submittedDate: {
    fontSize: 10,
    color: '#94a3b8',
  },

  /* =========================================================
   * ORDER BADGE
   * ========================================================= */

  orderBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  orderYes: {
    backgroundColor:
      '#dcfce7',
  },

  orderNo: {
    backgroundColor:
      '#f1f5f9',
  },

  orderBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },

  orderYesText: {
    color: '#15803d',
  },

  orderNoText: {
    color: '#64748b',
  },

  /* =========================================================
   * SEPARATOR
   * ========================================================= */

  separator: {
    height: 1,
    backgroundColor:
      '#f1f5f9',
    marginVertical: 13,
  },

  /* =========================================================
   * DETAILS
   * ========================================================= */

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  detail: {
    width: '46%',
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 16,
  },

  /* =========================================================
   * ORDER MESSAGE
   * ========================================================= */

  orderMessage: {
    borderRadius: 9,
    padding: 9,
    marginTop: 13,
  },

  orderMessageYes: {
    backgroundColor:
      '#f0fdf4',
  },

  orderMessageNo: {
    backgroundColor:
      '#f8fafc',
  },

  orderMessageText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  orderMessageTextYes: {
    color: '#15803d',
  },

  orderMessageTextNo: {
    color: '#64748b',
  },
});