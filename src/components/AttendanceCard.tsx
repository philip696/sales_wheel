import {
    approveAttendance,
    getAttendancePhotoUrl,
    rejectAttendance,
} from '@/src/services/attendanceService';
import type { AdminAttendanceRecord } from '@/src/types';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface AttendanceCardProps {
  record: AdminAttendanceRecord;
  /** Called after a successful approve/reject so the parent can refetch/update its list. */
  onStatusChange?: (attendanceId: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};

export function AttendanceCard({ record, onStatusChange }: AttendanceCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusStyle = STATUS_COLORS[record.status] ?? STATUS_COLORS.pending;
  const capturedAt = new Date(record.client_captured_at).toLocaleString();

  const handleApprove = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await approveAttendance(record.id);
      onStatusChange?.(record.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await rejectAttendance(record.id, reason);
      setIsRejecting(false);
      setReason('');
      onStatusChange?.(record.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      {record.photo_path ? (
        <Image
          source={{ uri: getAttendancePhotoUrl(record.photo_path) }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.storeName}>{record.storeName}</Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {record.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.repName}>{record.salesName}</Text>
      <Text style={styles.meta}>Captured: {capturedAt}</Text>
      {record.distance_meters !== null ? (
        <Text style={styles.meta}>
          Distance from store: {Math.round(record.distance_meters)}m
        </Text>
      ) : null}
      {record.status === 'rejected' && record.rejection_reason ? (
        <Text style={styles.rejectionReason}>
          Reason: {record.rejection_reason}
        </Text>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {record.status === 'pending' && (
        <View style={styles.footer}>
          {isRejecting ? (
            <View style={styles.rejectPanel}>
              <TextInput
                style={styles.reasonInput}
                placeholder="Reason for rejection"
                placeholderTextColor="#94a3b8"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <View style={styles.rejectPanelActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsRejecting(false);
                    setReason('');
                    setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.rejectButton,
                    (isSubmitting || !reason.trim()) && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirmReject}
                  disabled={isSubmitting || !reason.trim()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.rejectButtonText}>Confirm Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.rejectButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => setIsRejecting(true)}
                disabled={isSubmitting}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.approveButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  repName: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  rejectionReason: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  rejectButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  rejectPanel: {
    gap: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  rejectPanelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});