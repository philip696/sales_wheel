
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

      /*
       * Verify the admin is authenticated.
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
        throw new Error('You are not authenticated.');
      }

      console.log('ADMIN ATTENDANCE USER:', {
        id: user.id,
        email: user.email,
      });

      /*
       * Read attendance records.
       */
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

      /*
       * Generate signed URLs for private photos.
       */
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading attendance...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
      >
        <Text style={styles.errorTitle}>
          Unable to load attendance
        </Text>

        <Text style={styles.errorText}>
          {error}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          Attendance
        </Text>

        <Text style={styles.pageSubtitle}>
          {records.length} record
          {records.length === 1 ? '' : 's'}
        </Text>
      </View>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            No attendance records
          </Text>

          <Text style={styles.emptyText}>
            No attendance has been submitted yet.
          </Text>
        </View>
      ) : (
        records.map((record) => (
          <AttendanceCard
            key={record.id}
            record={record}
          />
        ))
      )}
    </ScrollView>
  );
}

function AttendanceCard({
  record,
}: {
  record: AttendanceRecord;
}) {
  const status =
    record.status?.toUpperCase() ?? 'UNKNOWN';

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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
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

      <View style={styles.separator} />

      <View style={styles.main}>
        <View style={styles.photoContainer}>
          {record.photo_url ? (
            <Image
              source={{
                uri: record.photo_url,
              }}
              style={styles.photo}
              resizeMode="contain"
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
            label="Attendance ID"
            value={record.id}
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
              record.distance_meters !== null
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
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  content: {
    padding: 24,
    paddingBottom: 48,
  },

  center: {
    flex: 1,
    minHeight: 500,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#555',
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },

  errorText: {
    maxWidth: 700,
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
  },

  pageHeader: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
  },

  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },

  empty: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  emptyText: {
    marginTop: 6,
    color: '#666',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  person: {
    flex: 1,
  },

  personName: {
    fontSize: 19,
    fontWeight: '700',
  },

  personEmail: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },

  salesCode: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  approvedBadge: {
    backgroundColor: '#dcfce7',
  },

  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  approvedText: {
    color: '#166534',
  },

  rejectedText: {
    color: '#991b1b',
  },

  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 18,
  },

  main: {
    flexDirection: 'row',
    gap: 24,
  },

  photoContainer: {
    width: 360,
    height: 270,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
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
    color: '#777',
  },

  details: {
    flex: 1,
    gap: 13,
  },

  detail: {
    gap: 3,
  },

  detailLabel: {
    fontSize: 12,
    color: '#777',
  },

  detailValue: {
    fontSize: 14,
    color: '#222',
  },
});