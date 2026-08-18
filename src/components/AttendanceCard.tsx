import { getAttendancePhotoUrl } from '@/src/services/attendanceService';
import type { AdminAttendanceRecord } from '@/src/types';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AttendanceCardProps {
  record: AdminAttendanceRecord;
}

export function AttendanceCard({ record }: AttendanceCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const capturedAt = new Date(record.client_captured_at).toLocaleString();

  useEffect(() => {
    let active = true;

    if (!record.photo_path) {
      setPhotoUrl(null);
      return () => {
        active = false;
      };
    }

    getAttendancePhotoUrl(record.photo_path)
      .then((url) => {
        if (active) setPhotoUrl(url);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });

    return () => {
      active = false;
    };
  }, [record.photo_path]);

  return (
    <View style={styles.card}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.storeName}>{record.storeName}</Text>
          <Text style={styles.repName}>{record.salesName}</Text>
        </View>

        <View style={styles.recordedBadge}>
          <Text style={styles.recordedBadgeText}>RECORDED</Text>
        </View>
      </View>

      <Text style={styles.meta}>Captured: {capturedAt}</Text>

      {record.distance_meters !== null ? (
        <Text style={styles.meta}>
          Distance from store: {Math.round(record.distance_meters)}m
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  repName: {
    fontSize: 14,
    color: '#334155',
    marginTop: 2,
  },
  recordedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  recordedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});