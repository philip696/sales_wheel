import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

type FilterOption =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'all';

const FILTERS: {
  label: string;
  value: FilterOption;
}[] = [
  {
    label: 'Pending',
    value: 'pending',
  },
  {
    label: 'Approved',
    value: 'approved',
  },
  {
    label: 'Rejected',
    value: 'rejected',
  },
  {
    label: 'All',
    value: 'all',
  },
];

export default function AdminAttendanceScreen() {
  const [records, setRecords] =
    useState<AttendanceRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterOption>('pending');

  /*
   * Rejection modal state
   */
  const [rejectModalVisible, setRejectModalVisible] =
    useState(false);

  const [selectedRecord, setSelectedRecord] =
    useState<AttendanceRecord | null>(null);

  const [rejectionReason, setRejectionReason] =
    useState('');

  const [isSubmittingReject, setIsSubmittingReject] =
    useState(false);

  /*
   * Load attendance records
   */
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
        throw new Error(
          `Could not read attendance: ${attendanceError.message}`
        );
      }

      const recordsWithPhotos =
        await Promise.all(
          (data ?? []).map(async (record: any) => {
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
                  photoError
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
          })
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

  /*
   * Pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadAttendance();
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * Approve attendance
   */
  const handleApprove = (
    record: AttendanceRecord
  ) => {
    Alert.alert(
      'Approve Attendance',
      `Are you sure you want to approve the attendance request from ${
        record.sales?.name ??
        'this salesperson'
      }?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const {
                error: updateError,
              } = await supabase
                .from('attendance')
                .update({
                  status: 'approved',
                  rejection_reason: null,
                })
                .eq('id', record.id);

              if (updateError) {
                throw new Error(
                  updateError.message
                );
              }

              await loadAttendance();

              Alert.alert(
                'Success',
                'Attendance approved successfully.'
              );
            } catch (err) {
              console.error(
                'APPROVE ATTENDANCE ERROR:',
                err
              );

              Alert.alert(
                'Update Failed',
                err instanceof Error
                  ? err.message
                  : 'Could not approve attendance.'
              );
            }
          },
        },
      ]
    );
  };

  /*
   * Open rejection modal
   */
  const openRejectModal = (
    record: AttendanceRecord
  ) => {
    setSelectedRecord(record);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  /*
   * Close rejection modal
   */
  const closeRejectModal = () => {
    if (isSubmittingReject) {
      return;
    }

    setRejectModalVisible(false);
    setSelectedRecord(null);
    setRejectionReason('');
  };

  /*
   * Submit rejection
   */
  const handleRejectSubmit = async () => {
    const trimmedReason =
      rejectionReason.trim();

    if (!trimmedReason) {
      Alert.alert(
        'Reason Required',
        'Please enter a reason for rejecting this attendance request.'
      );

      return;
    }

    if (!selectedRecord) {
      return;
    }

    try {
      setIsSubmittingReject(true);

      const {
        error: updateError,
      } = await supabase
        .from('attendance')
        .update({
          status: 'rejected',
          rejection_reason: trimmedReason,
        })
        .eq('id', selectedRecord.id);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setRejectModalVisible(false);
      setSelectedRecord(null);
      setRejectionReason('');

      await loadAttendance();

      Alert.alert(
        'Success',
        'Attendance rejected successfully.'
      );
    } catch (err) {
      console.error(
        'REJECT ATTENDANCE ERROR:',
        err
      );

      Alert.alert(
        'Update Failed',
        err instanceof Error
          ? err.message
          : 'Could not reject attendance.'
      );
    } finally {
      setIsSubmittingReject(false);
    }
  };

  /*
   * Summary counts
   */
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

  const pending = records.filter(
    (record) =>
      record.status?.toLowerCase() ===
      'pending'
  ).length;

  /*
   * Filter records
   */
  const filteredRecords =
    records.filter((record) => {
      if (filter === 'all') {
        return true;
      }

      return (
        record.status?.toLowerCase() ===
        filter
      );
    });

  return (
    <>
      <ScreenContainer
        title="Attendance Monitoring"
        subtitle="Monitor sales attendance and verification"
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
          {/* Summary */}
          <View style={styles.summaryRow}>
            <SummaryCard
              number={loading ? '—' : total}
              label="Total"
            />

            <SummaryCard
              number={loading ? '—' : pending}
              label="Pending"
              numberStyle={
                styles.pendingNumber
              }
            />

            <SummaryCard
              number={
                loading ? '—' : approved
              }
              label="Approved"
              numberStyle={
                styles.approvedNumber
              }
            />

            <SummaryCard
              number={
                loading ? '—' : rejected
              }
              label="Rejected"
              numberStyle={
                styles.rejectedNumber
              }
            />
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.filterChip,
                  filter === f.value &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setFilter(f.value)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f.value &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section Header */}
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Attendance Records
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Latest attendance submissions
              </Text>
            </View>

            <View
              style={styles.countBadge}
            >
              <Text
                style={styles.countBadgeText}
              >
                {filteredRecords.length}
              </Text>
            </View>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="large"
                color="#2563eb"
              />

              <Text
                style={styles.stateTitle}
              >
                Loading Attendance
              </Text>

              <Text
                style={styles.stateText}
              >
                Reading attendance records...
              </Text>
            </View>
          )}

          {/* Error */}
          {!loading && error && (
            <View style={styles.stateCard}>
              <Text
                style={styles.stateIcon}
              >
                ⚠️
              </Text>

              <Text
                style={styles.stateTitle}
              >
                Unable to load attendance
              </Text>

              <Text
                style={styles.stateText}
              >
                {error}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadAttendance}
              >
                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty */}
          {!loading &&
            !error &&
            filteredRecords.length === 0 && (
              <View
                style={styles.stateCard}
              >
                <Text
                  style={styles.stateIcon}
                >
                  📋
                </Text>

                <Text
                  style={styles.stateTitle}
                >
                  No Attendance Records
                </Text>

                <Text
                  style={styles.stateText}
                >
                  No attendance records found
                  for this filter.
                </Text>
              </View>
            )}

          {/* Records */}
          {!loading &&
            !error &&
            filteredRecords.length > 0 && (
              <View
                style={styles.recordsContainer}
              >
                {filteredRecords.map(
                  (record) => (
                    <AttendanceCard
                      key={record.id}
                      record={record}
                      onApprove={
                        handleApprove
                      }
                      onReject={
                        openRejectModal
                      }
                    />
                  )
                )}
              </View>
            )}
        </ScrollView>
      </ScreenContainer>

      {/* 
        CROSS-PLATFORM REJECTION MODAL

        Works on:
        - Android
        - iOS
        - Web
      */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={
          closeRejectModal
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View
              style={styles.modalHeader}
            >
              <View
                style={styles.modalIcon}
              >
                <Text
                  style={styles.modalIconText}
                >
                  ⚠️
                </Text>
              </View>

              <Text
                style={styles.modalTitle}
              >
                Reject Attendance
              </Text>

              <Text
                style={styles.modalSubtitle}
              >
                {selectedRecord?.sales
                  ?.name
                  ? `Reject attendance from ${selectedRecord.sales.name}`
                  : 'Reject this attendance request'}
              </Text>
            </View>

            <Text
              style={styles.inputLabel}
            >
              Rejection Reason
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter the reason for rejection..."
              placeholderTextColor="#94a3b8"
              value={rejectionReason}
              onChangeText={
                setRejectionReason
              }
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSubmittingReject}
              autoFocus={
                Platform.OS !== 'web'
              }
            />

            <Text
              style={styles.reasonHint}
            >
              This reason will be saved with
              the attendance record.
            </Text>

            <View
              style={styles.modalActions}
            >
              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={
                  closeRejectModal
                }
                disabled={
                  isSubmittingReject
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalRejectButton,
                  isSubmittingReject &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleRejectSubmit
                }
                disabled={
                  isSubmittingReject
                }
                activeOpacity={0.8}
              >
                {isSubmittingReject ? (
                  <ActivityIndicator
                    color="#ffffff"
                  />
                ) : (
                  <Text
                    style={
                      styles.modalRejectText
                    }
                  >
                    Reject Attendance
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/*
 * SUMMARY CARD
 */
function SummaryCard({
  number,
  label,
  numberStyle,
}: {
  number: string | number;
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

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * ATTENDANCE CARD
 */
function AttendanceCard({
  record,
  onApprove,
  onReject,
}: {
  record: AttendanceRecord;

  onApprove: (
    record: AttendanceRecord
  ) => void;

  onReject: (
    record: AttendanceRecord
  ) => void;
}) {
  const status =
    record.status?.toUpperCase() ??
    'UNKNOWN';

  const isApproved =
    status === 'APPROVED';

  const isRejected =
    status === 'REJECTED';

  const isPending =
    status === 'PENDING';

  const capturedAt =
    record.client_captured_at
      ? new Date(
          record.client_captured_at
        ).toLocaleString()
      : 'Unknown';

  const submittedAt =
    record.created_at
      ? new Date(
          record.created_at
        ).toLocaleString()
      : 'Unknown';

  return (
    <View
      style={styles.attendanceCard}
    >
      {/* Top */}
      <View style={styles.cardTop}>
        <View
          style={styles.personContainer}
        >
          <Text
            style={styles.personName}
          >
            {record.sales?.name ??
              'Unknown salesperson'}
          </Text>

          <Text
            style={styles.personEmail}
            numberOfLines={1}
          >
            {record.sales?.email ?? '—'}
          </Text>

          {record.sales
            ?.sales_code ? (
            <View
              style={
                styles.salesCodeBadge
              }
            >
              <Text
                style={
                  styles.salesCodeText
                }
              >
                {record.sales.sales_code}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            isApproved
              ? styles.approvedBadge
              : isRejected
              ? styles.rejectedBadge
              : styles.pendingBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isApproved
                ? styles.approvedText
                : isRejected
                ? styles.rejectedText
                : styles.pendingText,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* Store */}
      <View style={styles.storeBox}>
        <Text
          style={styles.storeLabel}
        >
          STORE
        </Text>

        <Text
          style={styles.storeName}
        >
          {record.store?.name ??
            'Unknown store'}
        </Text>
      </View>

      {/* Photo */}
      <View
        style={styles.photoContainer}
      >
        {record.photo_url ? (
          <Image
            source={{
              uri: record.photo_url,
            }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View
            style={styles.noPhoto}
          >
            <Text
              style={
                styles.noPhotoIcon
              }
            >
              📷
            </Text>

            <Text
              style={
                styles.noPhotoText
              }
            >
              No attendance photo
            </Text>
          </View>
        )}
      </View>

      {/* GPS */}
      <View
        style={styles.sectionBox}
      >
        <Text
          style={styles.boxTitle}
        >
          📍 GPS Verification
        </Text>

        <View
          style={styles.detailGrid}
        >
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
            label="Accuracy"
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

        <View
          style={styles.coordinateBox}
        >
          <Detail
            label="Latitude"
            value={
              record.latitude !==
              null
                ? record.latitude.toFixed(
                    6
                  )
                : '—'
            }
          />

          <Detail
            label="Longitude"
            value={
              record.longitude !==
              null
                ? record.longitude.toFixed(
                    6
                  )
                : '—'
            }
          />
        </View>
      </View>

      {/* Time */}
      <View
        style={styles.sectionBox}
      >
        <Text
          style={styles.boxTitle}
        >
          🕒 Attendance Time
        </Text>

        <Detail
          label="Photo Captured"
          value={capturedAt}
        />

        <View
          style={styles.detailSpacing}
        />

        <Detail
          label="Submitted"
          value={submittedAt}
        />
      </View>

      {/* Rejection Reason */}
      {isRejected &&
        record.rejection_reason ? (
        <View
          style={styles.rejectionBox}
        >
          <Text
            style={
              styles.rejectionTitle
            }
          >
            ⚠️ Rejection Reason
          </Text>

          <Text
            style={
              styles.rejectionText
            }
          >
            {record.rejection_reason}
          </Text>
        </View>
      ) : null}

      {/* Admin Actions */}
      {isPending && (
        <View
          style={styles.actionRow}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.rejectButton,
            ]}
            onPress={() =>
              onReject(record)
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.rejectButtonText
              }
            >
              Reject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.approveButton,
            ]}
            onPress={() =>
              onApprove(record)
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.approveButtonText
              }
            >
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/*
 * DETAIL COMPONENT
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
      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.detailValue}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * STYLES
 */
const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    minHeight: 90,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },

  pendingNumber: {
    color: '#a16207',
  },

  approvedNumber: {
    color: '#16a34a',
  },

  rejectedNumber: {
    color: '#dc2626',
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },

  filterChipActive: {
    backgroundColor: '#0f172a',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  filterChipTextActive: {
    color: '#ffffff',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748b',
  },

  countBadge: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },

  stateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },

  stateIcon: {
    fontSize: 32,
    marginBottom: 10,
  },

  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 12,
  },

  stateText: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  recordsContainer: {
    gap: 14,
  },

  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    overflow: 'hidden',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  personContainer: {
    flex: 1,
    minWidth: 0,
  },

  personName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  personEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },

  salesCodeBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },

  salesCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  approvedBadge: {
    backgroundColor: '#dcfce7',
  },

  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },

  pendingBadge: {
    backgroundColor: '#fef3c7',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  approvedText: {
    color: '#15803d',
  },

  rejectedText: {
    color: '#b91c1c',
  },

  pendingText: {
    color: '#a16207',
  },

  storeBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },

  storeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.7,
  },

  storeName: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },

  photoContainer: {
    width: '100%',
    height: 220,
    marginTop: 14,
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

  noPhotoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  noPhotoText: {
    color: '#64748b',
    fontSize: 13,
  },

  sectionBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  boxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
  },

  detailGrid: {
    flexDirection: 'row',
    gap: 20,
  },

  coordinateBox: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

  detail: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  detailValue: {
    fontSize: 13,
    color: '#334155',
    marginTop: 3,
    lineHeight: 18,
  },

  detailSpacing: {
    height: 10,
  },

  rejectionBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  rejectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 6,
  },

  rejectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7f1d1d',
  },

  /*
   * Admin action buttons
   */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  approveButton: {
    backgroundColor: '#16a34a',
  },

  rejectButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  approveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  rejectButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },

  /*
   * Rejection modal
   */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },

  modalHeader: {
    alignItems: 'center',
  },

  modalIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  modalIconText: {
    fontSize: 26,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    textAlign: 'center',
  },

  inputLabel: {
    marginTop: 20,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  reasonInput: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },

  reasonHint: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
    color: '#94a3b8',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  modalCancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },

  modalRejectButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  modalRejectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },
});