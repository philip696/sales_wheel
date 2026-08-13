import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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
  status: string;
  rejection_reason: string | null;

  store: {
    id: string;
    name: string;
  } | null;
};

export default function SalesHistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setError(null);

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
       * ============================================================
       * GET THE CURRENT SALESPERSON
       * ============================================================
       *
       * The attendance table uses sales_id.
       *
       * We first find the sales record belonging to the
       * currently logged-in Supabase user.
       *
       * This keeps the history specific to this salesperson.
       */

      const { data: sales, error: salesError } =
        await supabase
          .from('sales')
          .select('id, name, email, sales_code')
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
       * ============================================================
       * LOAD THIS SALESPERSON'S ATTENDANCE HISTORY
       * ============================================================
       */

      const {
        data,
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
          status,
          rejection_reason,

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

      setRecords(
        (data ?? []) as unknown as AttendanceRecord[]
      );
    } catch (err) {
      console.error(
        'SALES HISTORY ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load attendance history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Load history when the screen opens.
   */
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /*
   * Pull-to-refresh.
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

  const total = records.length;

  const approved = records.filter(
    (record) =>
      record.status?.toLowerCase() === 'approved'
  ).length;

  const pending = records.filter(
    (record) =>
      record.status?.toLowerCase() === 'pending'
  ).length;

  const rejected = records.filter(
    (record) =>
      record.status?.toLowerCase() === 'rejected'
  ).length;

  return (
    <ScreenContainer
      title="Visit History"
      subtitle="Your store attendance history"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >
        {/* ===================================================== */}
        {/* SUMMARY */}
        {/* ===================================================== */}

        <View style={styles.summaryRow}>
          <SummaryCard
            number={loading ? '—' : total}
            label="Total"
          />

          <SummaryCard
            number={loading ? '—' : approved}
            label="Approved"
            numberStyle={styles.approvedNumber}
          />

          <SummaryCard
            number={loading ? '—' : pending}
            label="Pending"
            numberStyle={styles.pendingNumber}
          />

          <SummaryCard
            number={loading ? '—' : rejected}
            label="Rejected"
            numberStyle={styles.rejectedNumber}
          />
        </View>

        {/* ===================================================== */}
        {/* LOADING */}
        {/* ===================================================== */}

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" />

            <Text style={styles.stateTitle}>
              Loading History
            </Text>

            <Text style={styles.stateText}>
              Reading your store visits...
            </Text>
          </View>
        ) : null}

        {/* ===================================================== */}
        {/* ERROR */}
        {/* ===================================================== */}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>
              ⚠️
            </Text>

            <Text style={styles.stateTitle}>
              Unable to Load History
            </Text>

            <Text style={styles.stateText}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* ===================================================== */}
        {/* EMPTY */}
        {/* ===================================================== */}

        {!loading &&
        !error &&
        records.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>
              📋
            </Text>

            <Text style={styles.stateTitle}>
              No Store Visits Yet
            </Text>

            <Text style={styles.stateText}>
              Your attendance history will appear
              here after you complete your first
              store attendance.
            </Text>
          </View>
        ) : null}

        {/* ===================================================== */}
        {/* HISTORY */}
        {/* ===================================================== */}

        {!loading &&
        !error &&
        records.length > 0 ? (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>
              STORE VISITS
            </Text>

            {records.map((record) => (
              <AttendanceCard
                key={record.id}
                record={record}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
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
    <View style={styles.summaryCard}>
      <Text
        style={[
          styles.summaryNumber,
          numberStyle,
        ]}
      >
        {number}
      </Text>

      <Text style={styles.summaryLabel}>
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
  record: AttendanceRecord;
}) {
  const status =
    record.status?.toLowerCase() ??
    'unknown';

  const isApproved =
    status === 'approved';

  const isPending =
    status === 'pending';

  const isRejected =
    status === 'rejected';

  const submittedAt = record.created_at
    ? new Date(
        record.created_at
      ).toLocaleString()
    : 'Unknown';

  const capturedAt =
    record.client_captured_at
      ? new Date(
          record.client_captured_at
        ).toLocaleString()
      : null;

  return (
    <View style={styles.attendanceCard}>
      {/* Header */}

      <View style={styles.attendanceHeader}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeIcon}>
            📍
          </Text>

          <View style={styles.storeHeaderText}>
            <Text style={styles.storeName}>
              {record.store?.name ??
                'Unknown Store'}
            </Text>

            <Text style={styles.submittedDate}>
              {submittedAt}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            isApproved &&
              styles.statusApproved,
            isPending &&
              styles.statusPending,
            isRejected &&
              styles.statusRejected,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isApproved &&
                styles.statusApprovedText,
              isPending &&
                styles.statusPendingText,
              isRejected &&
                styles.statusRejectedText,
            ]}
          >
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Separator */}

      <View style={styles.separator} />

      {/* Details */}

      <View style={styles.detailsGrid}>
        <Detail
          label="ATTENDANCE DATE"
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
            record.distance_meters !== null
              ? `${record.distance_meters.toFixed(
                  1
                )} m`
              : '—'
          }
        />

        <Detail
          label="GPS ACCURACY"
          value={
            record.gps_accuracy !== null
              ? `${record.gps_accuracy.toFixed(
                  1
                )} m`
              : '—'
          }
        />
      </View>

      {/* Rejection */}

      {record.rejection_reason ? (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionTitle}>
            REJECTION REASON
          </Text>

          <Text style={styles.rejectionText}>
            {record.rejection_reason}
          </Text>
        </View>
      ) : null}

      {/* Approved */}

      {isApproved ? (
        <View style={styles.approvedMessage}>
          <Text style={styles.approvedMessageText}>
            ✓ Attendance approved by admin
          </Text>
        </View>
      ) : null}

      {/* Pending */}

      {isPending ? (
        <View style={styles.pendingMessage}>
          <Text style={styles.pendingMessageText}>
            ⏳ Waiting for admin approval
          </Text>
        </View>
      ) : null}

      {/* Rejected */}

      {isRejected ? (
        <View style={styles.rejectedMessage}>
          <Text style={styles.rejectedMessageText}>
            ✕ Attendance was rejected
          </Text>
        </View>
      ) : null}
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
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
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
  container: {
    paddingBottom: 30,
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 22,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 7,
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
    textAlign: 'center',
  },

  approvedNumber: {
    color: '#16a34a',
  },

  pendingNumber: {
    color: '#d97706',
  },

  rejectedNumber: {
    color: '#dc2626',
  },

  summaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  /* STATE */

  stateCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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

  /* HISTORY */

  historyContainer: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 9,
  },

  /* ATTENDANCE CARD */

  attendanceCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusApproved: {
    backgroundColor: '#dcfce7',
  },

  statusPending: {
    backgroundColor: '#fef3c7',
  },

  statusRejected: {
    backgroundColor: '#fee2e2',
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },

  statusApprovedText: {
    color: '#15803d',
  },

  statusPendingText: {
    color: '#b45309',
  },

  statusRejectedText: {
    color: '#b91c1c',
  },

  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 13,
  },

  /* DETAILS */

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

  /* MESSAGES */

  approvedMessage: {
    backgroundColor: '#f0fdf4',
    borderRadius: 9,
    padding: 9,
    marginTop: 13,
  },

  approvedMessageText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  pendingMessage: {
    backgroundColor: '#fffbeb',
    borderRadius: 9,
    padding: 9,
    marginTop: 13,
  },

  pendingMessageText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  rejectedMessage: {
    backgroundColor: '#fef2f2',
    borderRadius: 9,
    padding: 9,
    marginTop: 13,
  },

  rejectedMessageText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  /* REJECTION */

  rejectionBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 11,
    marginTop: 13,
  },

  rejectionTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: '#b91c1c',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  rejectionText: {
    fontSize: 11,
    color: '#7f1d1d',
    lineHeight: 16,
  },
});