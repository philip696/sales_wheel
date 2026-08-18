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
  distance_meters: number | null;
  gps_accuracy: number | null;
  photo_path: string | null;
  client_captured_at: string | null;
  created_at: string;
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
};

export default function AdminAttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
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
        throw new Error('You are not authenticated.');
      }

      const { data, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          distance_meters,
          gps_accuracy,
          photo_path,
          client_captured_at,
          created_at,
          sales:sales_id (id, name, email, sales_code),
          store:store_id (id, name)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (attendanceError) {
        throw new Error(
          `Could not read attendance: ${attendanceError.message}`
        );
      }

      const recordsWithPhotos = await Promise.all(
        (data ?? []).map(async (record: any) => {
          let photoUrl: string | null = null;

          if (record.photo_path) {
            const { data: signedUrl } = await supabase.storage
              .from(ATTENDANCE_BUCKET)
              .createSignedUrl(record.photo_path, 60 * 60);

            photoUrl = signedUrl?.signedUrl ?? null;
          }

          return {
            ...record,
            photo_url: photoUrl,
          };
        })
      );

      setRecords(recordsWithPhotos);
    } catch (err) {
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

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  return (
    <ScreenContainer
      title="Attendance Monitoring"
      subtitle="Recorded sales attendance"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {loading ? '—' : records.length}
          </Text>

          <Text style={styles.summaryLabel}>
            RECORDED ATTENDANCE
          </Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" />

            <Text style={styles.stateTitle}>
              Loading Attendance
            </Text>

            <Text style={styles.stateText}>
              Reading recorded attendance...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>⚠️</Text>

            <Text style={styles.stateTitle}>
              Unable to Load Attendance
            </Text>

            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && records.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>📋</Text>

            <Text style={styles.stateTitle}>
              No Recorded Attendance
            </Text>

            <Text style={styles.stateText}>
              Recorded attendance will appear here.
            </Text>
          </View>
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <View>
            {records.map((record) => (
              <View key={record.id} style={styles.card}>
                {record.photo_url ? (
                  <Image
                    source={{ uri: record.photo_url }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={styles.storeName}>
                      {record.store?.name ?? 'Unknown Store'}
                    </Text>

                    <Text style={styles.salesName}>
                      {record.sales?.name ?? 'Unknown Sales Rep'}
                    </Text>
                  </View>

                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
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

                  <Detail
                    label="GPS ACCURACY"
                    value={
                      record.gps_accuracy !== null
                        ? `${record.gps_accuracy.toFixed(1)} m`
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
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
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