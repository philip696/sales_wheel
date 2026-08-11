
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';

const ATTENDANCE_BUCKET =
  'attendance-photos';

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
  const [records, setRecords] =
    useState<AttendanceRecord[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Record currently being rejected.
   */
  const [rejectingRecord, setRejectingRecord] =
    useState<AttendanceRecord | null>(
      null,
    );

  /*
   * Rejection reason entered by admin.
   */
  const [rejectionReason, setRejectionReason] =
    useState('');

  /*
   * Loading state for approve/reject.
   */
  const [actionLoading, setActionLoading] =
    useState(false);

  /*
   * Small success/error message after
   * an approval/rejection.
   */
  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  const loadAttendance =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            `Authentication error: ${authError.message}`,
          );
        }

        if (!user) {
          throw new Error(
            'You are not authenticated.',
          );
        }

        console.log(
          'ADMIN ATTENDANCE USER:',
          {
            id: user.id,
            email: user.email,
          },
        );

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
          .order(
            'created_at',
            {
              ascending: false,
            },
          );

        if (attendanceError) {
          console.error(
            'ADMIN ATTENDANCE DATABASE ERROR:',
            attendanceError,
          );

          throw new Error(
            `Could not read attendance: ${attendanceError.message}`,
          );
        }

        /*
         * Create signed URLs for attendance
         * photos using the exact same storage
         * logic already used in the repository.
         */
        const recordsWithPhotos =
          await Promise.all(
            (data ?? []).map(
              async (
                record: any,
              ) => {
                let photoUrl:
                  | string
                  | null = null;

                if (
                  record.photo_path
                ) {
                  const {
                    data: signedUrl,
                    error: photoError,
                  } =
                    await supabase.storage
                      .from(
                        ATTENDANCE_BUCKET,
                      )
                      .createSignedUrl(
                        record.photo_path,
                        60 * 60,
                      );

                  if (
                    photoError
                  ) {
                    console.error(
                      'ATTENDANCE PHOTO ERROR:',
                      {
                        attendanceId:
                          record.id,
                        photoPath:
                          record.photo_path,
                        message:
                          photoError.message,
                      },
                    );
                  } else {
                    photoUrl =
                      signedUrl?.signedUrl ??
                      null;
                  }
                }

                return {
                  ...record,
                  photo_url:
                    photoUrl,
                };
              },
            ),
          );

        setRecords(
          recordsWithPhotos,
        );
      } catch (err) {
        console.error(
          'ADMIN ATTENDANCE PAGE ERROR:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load attendance',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  /*
   * APPROVE
   *
   * Updates the exact attendance record
   * selected by its primary key.
   */
  const approveAttendance =
    async (
      record: AttendanceRecord,
    ) => {
      if (
        actionLoading
      ) {
        return;
      }

      try {
        setActionLoading(
          true,
        );

        setActionMessage(
          null,
        );

        const {
          error: updateError,
        } = await supabase
          .from('attendance')
          .update({
            status:
              'approved',

            /*
             * An approved record should
             * not retain a rejection reason.
             */
            rejection_reason:
              null,
          })
          .eq(
            'id',
            record.id,
          );

        if (updateError) {
          throw updateError;
        }

        /*
         * Update local state immediately so
         * the UI changes without waiting for
         * another full page load.
         */
        setRecords(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                record.id
                  ? {
                      ...item,
                      status:
                        'approved',
                      rejection_reason:
                        null,
                    }
                  : item,
            ),
        );

        setActionMessage(
          'Attendance approved successfully.',
        );
      } catch (err) {
        console.error(
          'APPROVE ATTENDANCE ERROR:',
          err,
        );

        setActionMessage(
          err instanceof Error
            ? err.message
            : 'Failed to approve attendance.',
        );
      } finally {
        setActionLoading(
          false,
        );
      }
    };

  /*
   * Open rejection modal.
   */
  const openRejectModal =
    (
      record: AttendanceRecord,
    ) => {
      if (
        actionLoading
      ) {
        return;
      }

      setRejectingRecord(
        record,
      );

      setRejectionReason(
        '',
      );

      setActionMessage(
        null,
      );
    };

  /*
   * Close rejection modal.
   */
  const closeRejectModal =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setRejectingRecord(
        null,
      );

      setRejectionReason(
        '',
      );
    };

  /*
   * REJECT
   *
   * Requires an explicit reason and writes
   * both status and rejection_reason.
   */
  const rejectAttendance =
    async () => {
      if (
        !rejectingRecord ||
        actionLoading
      ) {
        return;
      }

      const reason =
        rejectionReason.trim();

      if (!reason) {
        setActionMessage(
          'Please enter a rejection reason.',
        );

        return;
      }

      try {
        setActionLoading(
          true,
        );

        setActionMessage(
          null,
        );

        const {
          error: updateError,
        } = await supabase
          .from('attendance')
          .update({
            status:
              'rejected',
            rejection_reason:
              reason,
          })
          .eq(
            'id',
            rejectingRecord.id,
          );

        if (updateError) {
          throw updateError;
        }

        /*
         * Update local state immediately.
         */
        setRecords(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                rejectingRecord.id
                  ? {
                      ...item,
                      status:
                        'rejected',
                      rejection_reason:
                        reason,
                    }
                  : item,
            ),
        );

        setRejectingRecord(
          null,
        );

        setRejectionReason(
          '',
        );

        setActionMessage(
          'Attendance rejected successfully.',
        );
      } catch (err) {
        console.error(
          'REJECT ATTENDANCE ERROR:',
          err,
        );

        setActionMessage(
          err instanceof Error
            ? err.message
            : 'Failed to reject attendance.',
        );
      } finally {
        setActionLoading(
          false,
        );
      }
    };

  const total =
    records.length;

  const approved =
    records.filter(
      (record) =>
        record.status?.toLowerCase() ===
        'approved',
    ).length;

  const rejected =
    records.filter(
      (record) =>
        record.status?.toLowerCase() ===
        'rejected',
    ).length;

  const pending =
    records.filter(
      (record) =>
        record.status?.toLowerCase() ===
        'pending',
    ).length;

  return (
    <ScreenContainer
      title="Attendance Monitoring"
      subtitle="Monitor sales attendance and verification"
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.container
        }
      >
        {/* Summary */}
        <View
          style={
            styles.summaryRow
          }
        >
          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {loading
                ? '—'
                : total}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Total
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={[
                styles.summaryNumber,
                styles.approved,
              ]}
            >
              {loading
                ? '—'
                : approved}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Approved
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={[
                styles.summaryNumber,
                styles.rejected,
              ]}
            >
              {loading
                ? '—'
                : rejected}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Rejected
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={[
                styles.summaryNumber,
                styles.pending,
              ]}
            >
              {loading
                ? '—'
                : pending}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Pending
            </Text>
          </View>
        </View>

        {/* Filters / section */}
        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Attendance Records
          </Text>

          <View
            style={
              styles.filterRow
            }
          >
            <View
              style={
                styles.filter
              }
            >
              <Text
                style={
                  styles.filterText
                }
              >
                All Status
              </Text>
            </View>

            <View
              style={
                styles.filter
              }
            >
              <Text
                style={
                  styles.filterText
                }
              >
                Today
              </Text>
            </View>
          </View>
        </View>

        {/* Action result */}
        {actionMessage && (
          <View
            style={
              styles.actionMessage
            }
          >
            <Text
              style={
                styles.actionMessageText
              }
            >
              {actionMessage}
            </Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View
            style={
              styles.emptyCard
            }
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Loading Attendance
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Reading attendance
              records...
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading &&
          error && (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                ⚠️
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Unable to load
                attendance
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {error}
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={
                  loadAttendance
                }
              >
                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

        {/* Empty */}
        {!loading &&
          !error &&
          records.length ===
            0 && (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                📋
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Attendance Records
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Attendance records,
                verification
                photos, GPS data,
                approval status,
                and rejection
                reasons will
                appear here.
              </Text>
            </View>
          )}

        {/* Records */}
        {!loading &&
          !error &&
          records.length >
            0 && (
            <View
              style={
                styles.recordsContainer
              }
            >
              {records.map(
                (record) => (
                  <AttendanceCard
                    key={
                      record.id
                    }
                    record={
                      record
                    }
                    actionLoading={
                      actionLoading
                    }
                    onApprove={() =>
                      approveAttendance(
                        record,
                      )
                    }
                    onReject={() =>
                      openRejectModal(
                        record,
                      )
                    }
                  />
                ),
              )}
            </View>
          )}

        {/* Information */}
        <View
          style={
            styles.infoCard
          }
        >
          <Text
            style={
              styles.infoTitle
            }
          >
            Verification Details
          </Text>

          <Text
            style={
              styles.infoItem
            }
          >
            📍 GPS location
            verification
          </Text>

          <Text
            style={
              styles.infoItem
            }
          >
            📷 Attendance photo
          </Text>

          <Text
            style={
              styles.infoItem
            }
          >
            ✅ Approval /
            rejection status
          </Text>

          <Text
            style={
              styles.infoItem
            }
          >
            📝 Rejection reason
          </Text>
        </View>
      </ScrollView>

      {/* Reject modal */}
      <Modal
        visible={
          rejectingRecord !==
          null
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeRejectModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              Reject Attendance
            </Text>

            {rejectingRecord && (
              <View
                style={
                  styles.modalRecord
                }
              >
                <Text
                  style={
                    styles.modalPerson
                  }
                >
                  {
                    rejectingRecord
                      .sales
                      ?.name
                  }
                </Text>

                <Text
                  style={
                    styles.modalEmail
                  }
                >
                  {
                    rejectingRecord
                      .sales
                      ?.email
                  }
                </Text>
              </View>
            )}

            <Text
              style={
                styles.inputLabel
              }
            >
              Rejection reason
            </Text>

            <TextInput
              value={
                rejectionReason
              }
              onChangeText={
                setRejectionReason
              }
              placeholder="Enter the reason for rejecting this attendance..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              editable={
                !actionLoading
              }
              style={
                styles.reasonInput
              }
            />

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                disabled={
                  actionLoading
                }
                onPress={
                  closeRejectModal
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmRejectButton,
                  actionLoading &&
                    styles.disabledButton,
                ]}
                disabled={
                  actionLoading
                }
                onPress={
                  rejectAttendance
                }
              >
                {actionLoading ? (
                  <ActivityIndicator
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.confirmRejectButtonText
                    }
                  >
                    Reject Attendance
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function AttendanceCard({
  record,
  actionLoading,
  onApprove,
  onReject,
}: {
  record: AttendanceRecord;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
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
          record.client_captured_at,
        ).toLocaleString()
      : 'Unknown';

  const submittedAt =
    record.created_at
      ? new Date(
          record.created_at,
        ).toLocaleString()
      : 'Unknown';

  return (
    <View
      style={
        styles.attendanceCard
      }
    >
      {/* Header */}
      <View
        style={
          styles.attendanceHeader
        }
      >
        <View
          style={
            styles.person
          }
        >
          <Text
            style={
              styles.personName
            }
          >
            {record.sales
              ?.name ??
              'Unknown salesperson'}
          </Text>

          <Text
            style={
              styles.personEmail
            }
          >
            {record.sales
              ?.email ?? '—'}
          </Text>

          {record.sales
            ?.sales_code ? (
            <Text
              style={
                styles.salesCode
              }
            >
              Sales code:{' '}
              {
                record.sales
                  .sales_code
              }
            </Text>
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

      <View
        style={
          styles.recordSeparator
        }
      />

      {/* Main record */}
      <View
        style={
          styles.recordContent
        }
      >
        {/* Photo */}
        <View
          style={
            styles.photoContainer
          }
        >
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
          ) : (
            <View
              style={
                styles.noPhoto
              }
            >
              <Text
                style={
                  styles.noPhotoText
                }
              >
                No photo
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View
          style={
            styles.details
          }
        >
          <Detail
            label="Store"
            value={
              record.store
                ?.name ??
              'Unknown store'
            }
          />

          <Detail
            label="Captured"
            value={
              capturedAt
            }
          />

          <Detail
            label="Submitted"
            value={
              submittedAt
            }
          />

          <Detail
            label="Distance"
            value={
              record.distance_meters !==
              null
                ? `${record.distance_meters.toFixed(
                    1,
                  )} m`
                : '—'
            }
          />

          <Detail
            label="GPS accuracy"
            value={
              record.gps_accuracy !==
              null
                ? `${record.gps_accuracy.toFixed(
                    1,
                  )} m`
                : '—'
            }
          />

          <Detail
            label="Latitude"
            value={
              record.latitude !==
              null
                ? record.latitude.toFixed(
                    6,
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
                    6,
                  )
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

      {/* Admin actions */}
      {isPending && (
        <>
          <View
            style={
              styles.actionSeparator
            }
          />

          <View
            style={
              styles.actionSection
            }
          >
            <Text
              style={
                styles.actionTitle
              }
            >
              Admin Decision
            </Text>

            <View
              style={
                styles.actionButtons
              }
            >
              <Pressable
                disabled={
                  actionLoading
                }
                onPress={
                  onApprove
                }
                style={[
                  styles.approveButton,
                  actionLoading &&
                    styles.disabledButton,
                ]}
              >
                {actionLoading ? (
                  <ActivityIndicator
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.approveButtonText
                    }
                  >
                    ✓ Approve
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={
                  actionLoading
                }
                onPress={
                  onReject
                }
                style={[
                  styles.rejectButton,
                  actionLoading &&
                    styles.disabledButton,
                ]}
              >
                <Text
                  style={
                    styles.rejectButtonText
                  }
                >
                  ✕ Reject
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Approved state */}
      {isApproved && (
        <View
          style={
            styles.finalState
          }
        >
          <Text
            style={
              styles.finalStateApproved
            }
          >
            ✓ This attendance has
            been approved.
          </Text>
        </View>
      )}

      {/* Rejected state */}
      {isRejected && (
        <View
          style={
            styles.finalState
          }
        >
          <Text
            style={
              styles.finalStateRejected
            }
          >
            ✕ This attendance has
            been rejected.
          </Text>
        </View>
      )}
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
    <View
      style={
        styles.detail
      }
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

const styles =
  StyleSheet.create({
    container: {
      paddingBottom: 24,
    },

    summaryRow: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },

    summaryCard: {
      flex: 1,
      minWidth: 130,
      backgroundColor:
        '#f8fafc',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
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

    pending: {
      color: '#ca8a04',
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
      flexDirection:
        'row',
      gap: 10,
    },

    filter: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },

    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#475569',
    },

    actionMessage: {
      backgroundColor:
        '#eff6ff',
      borderWidth: 1,
      borderColor:
        '#bfdbfe',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },

    actionMessageText: {
      fontSize: 13,
      color: '#1d4ed8',
      fontWeight: '600',
    },

    emptyCard: {
      backgroundColor:
        '#f8fafc',
      borderRadius: 16,
      padding: 28,
      alignItems:
        'center',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
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
      textAlign:
        'center',
    },

    retryButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 9,
      backgroundColor:
        '#111827',
    },

    retryButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },

    infoCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
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

    recordsContainer: {
      gap: 16,
    },

    attendanceCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    attendanceHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
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
      backgroundColor:
        '#dcfce7',
    },

    rejectedBadge: {
      backgroundColor:
        '#fee2e2',
    },

    pendingBadge: {
      backgroundColor:
        '#fef3c7',
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

    pendingText: {
      color: '#92400e',
    },

    recordSeparator: {
      height: 1,
      backgroundColor:
        '#e2e8f0',
      marginVertical: 16,
    },

    recordContent: {
      flexDirection:
        'row',
      gap: 18,
    },

    photoContainer: {
      width: 280,
      height: 210,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor:
        '#f1f5f9',
    },

    photo: {
      width: '100%',
      height: '100%',
    },

    noPhoto: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
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

    actionSeparator: {
      height: 1,
      backgroundColor:
        '#e2e8f0',
      marginTop: 18,
      marginBottom: 16,
    },

    actionSection: {
      backgroundColor:
        '#f8fafc',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    actionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 10,
    },

    actionButtons: {
      flexDirection:
        'row',
      gap: 10,
    },

    approveButton: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      borderRadius: 9,
      backgroundColor:
        '#16a34a',
    },

    approveButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },

    rejectButton: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      borderRadius: 9,
      backgroundColor:
        '#dc2626',
    },

    rejectButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },

    disabledButton: {
      opacity: 0.55,
    },

    finalState: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        '#e2e8f0',
    },

    finalStateApproved: {
      color: '#166534',
      fontSize: 13,
      fontWeight: '600',
    },

    finalStateRejected: {
      color: '#991b1b',
      fontSize: 13,
      fontWeight: '600',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(15, 23, 42, 0.55)',
      justifyContent:
        'center',
      alignItems:
        'center',
      padding: 20,
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      backgroundColor:
        '#ffffff',
      borderRadius: 16,
      padding: 20,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#111827',
      marginBottom: 16,
    },

    modalRecord: {
      backgroundColor:
        '#f8fafc',
      borderRadius: 10,
      padding: 12,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    modalPerson: {
      fontSize: 15,
      fontWeight: '700',
      color: '#111827',
    },

    modalEmail: {
      marginTop: 3,
      fontSize: 13,
      color: '#64748b',
    },

    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 8,
    },

    reasonInput: {
      minHeight: 120,
      borderWidth: 1,
      borderColor:
        '#cbd5e1',
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: '#111827',
      backgroundColor:
        '#ffffff',
      marginBottom: 18,
    },

    modalActions: {
      flexDirection:
        'row',
      gap: 10,
    },

    cancelButton: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      borderRadius: 9,
      backgroundColor:
        '#f1f5f9',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    cancelButtonText: {
      color: '#334155',
      fontSize: 14,
      fontWeight: '700',
    },

    confirmRejectButton: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      borderRadius: 9,
      backgroundColor:
        '#dc2626',
    },

    confirmRejectButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
  });