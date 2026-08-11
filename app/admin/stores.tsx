import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
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
  const [records, setRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
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

      console.log('ADMIN ATTENDANCE USER:', {
        id: user.id,
        email: user.email,
      });

      const { data, error: attendanceError } =
        await supabase
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
          .order('created_at', {
            ascending: false,
          });

      if (attendanceError) {
        console.error(
          'ADMIN ATTENDANCE DATABASE ERROR:',
          {
            code: attendanceError.code,
            message: attendanceError.message,
            details: attendanceError.details,
            hint: attendanceError.hint,
          }
        );

        throw new Error(
          `Could not read attendance: ${attendanceError.message}`
        );
      }

      console.log(
        'ADMIN ATTENDANCE RECORDS:',
        data
      );

      const recordsWithPhotos =
        await Promise.all(
          (data ?? []).map(
            async (record: any) => {
              let photoUrl: string | null = null;

              if (record.photo_path) {
                const {
                  data: signedUrl,
                  error: photoError,
                } = await supabase.storage
                  .from(ATTENDANCE_BUCKET)
                  .createSignedUrl(
                    record.photo_path,
                    60 * 60
                  );

                if (photoError) {
                  console.error(
                    'ATTENDANCE PHOTO ERROR:',
                    {
                      attendanceId: record.id,
                      photoPath:
                        record.photo_path,
                      message:
                        photoError.message,
                    }
                  );
                } else {
                  photoUrl =
                    signedUrl?.signedUrl ?? null;
                }
              }

              return {
                ...record,
                photo_url: photoUrl,
              };
            }
          )
        );

      setRecords(recordsWithPhotos);
    } catch (err) {
      console.error(
        'ADMIN ATTENDANCE PAGE ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load attendance'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const total = records.length;

  const approved = records.filter(
    (record) =>
      record.status?.toLowerCase() ===
      'approved'
  ).length;

  const rejected = records.filter(
    (record) =>
      record.status?.toLowerCase() ===
      'rejected'
  ).length;

  return (
    <ScreenContainer
      title="Attendance Monitoring"
      subtitle="Monitor sales attendance and verification"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {loading ? '—' : total}
            </Text>

            <Text style={styles.summaryLabel}>
              Total
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text
              style={[
                styles.summaryNumber,
                styles.approved,
              ]}
            >
              {loading ? '—' : approved}
            </Text>

            <Text style={styles.summaryLabel}>
              Approved
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text
              style={[
                styles.summaryNumber,
                styles.rejected,
              ]}
            >
              {loading ? '—' : rejected}
            </Text>

            <Text style={styles.summaryLabel}>
              Rejected
            </Text>
          </View>
        </View>

        {/* Attendance Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Attendance Records
          </Text>

          <View style={styles.filterRow}>
            <View style={styles.filter}>
              <Text style={styles.filterText}>
                All Status
              </Text>
            </View>

            <View style={styles.filter}>
              <Text style={styles.filterText}>
                Today
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" />

            <Text style={styles.emptyTitle}>
              Loading Attendance
            </Text>

            <Text style={styles.emptyText}>
              Reading attendance records...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              ⚠️
            </Text>

            <Text style={styles.emptyTitle}>
              Unable to load attendance
            </Text>

            <Text style={styles.emptyText}>
              {error}
            </Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              Attendance Records
            </Text>

            <Text style={styles.emptyText}>
              No attendance records have been
              submitted yet.
            </Text>
          </View>
        ) : (
          <View style={styles.records}>
            {records.map((record) => (
              <AttendanceCard
                key={record.id}
                record={record}
              />
            ))}
          </View>
        )}

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Verification Details
          </Text>

          <Text style={styles.infoItem}>
            📍 GPS location verification
          </Text>

          <Text style={styles.infoItem}>
            📷 Attendance photo
          </Text>

          <Text style={styles.infoItem}>
            ✅ Approval / rejection status
          </Text>

          <Text style={styles.infoItem}>
            📝 Rejection reason
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function AttendanceCard({
  record,
}: {
  record: AttendanceRecord;
}) {
  const status =
    record.status?.toUpperCase() ??
    'UNKNOWN';

  const isApproved =
    status === 'APPROVED';

  const capturedAt =
    record.client_captured_at
      ? new Date(
          record.client_captured_at
        ).toLocaleString()
      : 'Unknown';

  const submittedAt = record.created_at
    ? new Date(
        record.created_at
      ).toLocaleString()
    : 'Unknown';

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.person}>
          <Text style={styles.personName}>
            {record.sales?.name ??
              'Unknown salesperson'}
          </Text>

          <Text style={styles.personEmail}>
            {record.sales?.email ?? '—'}
          </Text>

          {record.sales?.sales_code ? (
            <Text style={styles.salesCode}>
              Sales code:{' '}
              {record.sales.sales_code}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            isApproved
              ? styles.approvedBadge
              : styles.rejectedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isApproved
                ? styles.approvedText
                : styles.rejectedText,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.recordSeparator} />

      <View style={styles.recordBody}>
        <View style={styles.photoContainer}>
          {record.photo_url ? (
            <Image
              source={{
                uri: record.photo_url,
              }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noPhoto}>
              <Text style={styles.noPhotoText}>
                No photo
              </Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Detail
            label="Store"
            value={
              record.store?.name ??
              'Unknown store'
            }
          />

          <Detail
            label="Captured"
            value={capturedAt}
          />

          <Detail
            label="Submitted"
            value={submittedAt}
          />

          <Detail
            label="Distance"
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
            label="GPS accuracy"
            value={
              record.gps_accuracy !== null
                ? `${record.gps_accuracy.toFixed(
                    1
                  )} m`
                : '—'
            }
          />

          <Detail
            label="Latitude"
            value={
              record.latitude !== null
                ? record.latitude.toFixed(6)
                : '—'
            }
          />

          <Detail
            label="Longitude"
            value={
              record.longitude !== null
                ? record.longitude.toFixed(6)
                : '—'
            }
          />

          {record.rejection_reason ? (
            <Detail
              label="Rejection reason"
              value={
                record.rejection_reason
              }
            />
          ) : null}
        </View>
      </View>
    </View>
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
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  summaryNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  approved: {
    color: '#16a34a',
  },

  rejected: {
    color: '#dc2626',
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },

  filter: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 16,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  infoItem: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
  },

  records: {
    gap: 16,
  },

  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  person: {
    flex: 1,
  },

  personName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  personEmail: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748b',
  },

  salesCode: {
    marginTop: 3,
    fontSize: 12,
    color: '#94a3b8',
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  approvedBadge: {
    backgroundColor: '#dcfce7',
  },

  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  approvedText: {
    color: '#166534',
  },

  rejectedText: {
    color: '#991b1b',
  },

  recordSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },

  recordBody: {
    flexDirection: 'row',
    gap: 18,
  },

  photoContainer: {
    width: 280,
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  noPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noPhotoText: {
    color: '#64748b',
    fontSize: 13,
  },

  details: {
    flex: 1,
    gap: 10,
  },

  detail: {
    gap: 2,
  },

  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },

  detailValue: {
    fontSize: 13,
    color: '#334155',
  },
});