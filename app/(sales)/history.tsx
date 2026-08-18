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
  distance_meters: number | null;
  client_captured_at: string | null;
  created_at: string;
  store: { id: string; name: string } | null;
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
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!user) {
        throw new Error('You are not authenticated.');
      }

      const { data, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          distance_meters,
          client_captured_at,
          created_at,
          store:store_id (id, name)
        `)
        .eq('sales_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (attendanceError) {
        throw new Error(
          `Could not load attendance history: ${attendanceError.message}`
        );
      }

      setRecords((data ?? []) as unknown as AttendanceRecord[]);
    } catch (err) {
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

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  return (
    <ScreenContainer
      title="Visit History"
      subtitle="Your recorded store visits"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={styles.container}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {loading ? '—' : records.length}
          </Text>
          <Text style={styles.summaryLabel}>RECORDED VISITS</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateTitle}>Loading History</Text>
            <Text style={styles.stateText}>
              Reading your recorded store visits...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>⚠️</Text>
            <Text style={styles.stateTitle}>
              Unable to Load History
            </Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && records.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>📋</Text>
            <Text style={styles.stateTitle}>No Store Visits Yet</Text>
            <Text style={styles.stateText}>
              Your recorded attendance will appear here after your first
              store visit.
            </Text>
          </View>
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>STORE VISITS</Text>

            {records.map((record) => (
              <View key={record.id} style={styles.attendanceCard}>
                <View style={styles.header}>
                  <View style={styles.storeHeader}>
                    <Text style={styles.storeIcon}>📍</Text>

                    <View style={styles.storeHeaderText}>
                      <Text style={styles.storeName}>
                        {record.store?.name ?? 'Unknown Store'}
                      </Text>

                      <Text style={styles.date}>
                        {new Date(record.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordedBadge}>
                    <Text style={styles.recordedBadgeText}>
                      RECORDED
                    </Text>
                  </View>
                </View>

                <View style={styles.details}>
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
                      record.distance_meters !== null
                        ? `${record.distance_meters.toFixed(1)} m`
                        : '—'
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 22,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#166534',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
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
    marginBottom: 6,
  },
  stateText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 9,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },
  header: {
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
  },
  date: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  recordedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  recordedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  details: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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