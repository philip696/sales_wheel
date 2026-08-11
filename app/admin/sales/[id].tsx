import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';

type SalesUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type Attendance = {
  id?: string;
  sales_id: string;
  status: string | null;
  created_at: string | null;
  server_created_at: string | null;

  /*
   * These fields are included when they exist
   * in the attendance table.
   */
  photo_path?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rejection_reason?: string | null;
};

type DayStatus =
  | 'attended'
  | 'pending'
  | 'none'
  | 'future';

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  status: DayStatus;
  attendance: Attendance | null;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isFutureDate = (date: Date) => {
  const today = new Date();

  return (
    formatDateKey(date) >
    formatDateKey(today)
  );
};

const getAttendanceStatus = (
  status: string | null,
): DayStatus => {
  if (!status) {
    return 'none';
  }

  const normalized =
    status.toLowerCase();

  if (
    normalized === 'approved' ||
    normalized === 'attended' ||
    normalized === 'present'
  ) {
    return 'attended';
  }

  if (normalized === 'pending') {
    return 'pending';
  }

  return 'none';
};

const formatAttendanceTime = (
  attendance: Attendance,
) => {
  const timestamp =
    attendance.server_created_at ??
    attendance.created_at;

  if (!timestamp) {
    return 'No recorded time';
  }

  const date = new Date(
    timestamp,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return timestamp;
  }

  return date.toLocaleString();
};

export default function AdminSalesCalendarScreen() {
  const params =
    useLocalSearchParams();

  const salesId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [salesUser, setSalesUser] =
    useState<SalesUser | null>(
      null,
    );

  const [attendance, setAttendance] =
    useState<Attendance[]>([]);

  const [month, setMonth] =
    useState(new Date());

  const [selectedDay, setSelectedDay] =
    useState<CalendarDay | null>(
      null,
    );

  const [modalVisible, setModalVisible] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Load the selected salesperson and
   * their attendance records.
   */
  const fetchData = useCallback(
    async () => {
      if (!salesId) {
        setError(
          'Sales user ID is missing. Please return to Sales and select a salesperson again.',
        );

        setLoading(false);

        return;
      }

      try {
        setError(null);

        const [
          salesResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from('sales')
            .select(
              'id, name, email',
            )
            .eq(
              'id',
              salesId,
            )
            .single(),

          supabase
            .from('attendance')
            .select('*')
            .eq(
              'sales_id',
              salesId,
            )
            .order(
              'server_created_at',
              {
                ascending: false,
              },
            ),
        ]);

        if (salesResult.error) {
          throw salesResult.error;
        }

        if (
          attendanceResult.error
        ) {
          throw attendanceResult.error;
        }

        setSalesUser(
          salesResult.data,
        );

        setAttendance(
          attendanceResult.data ??
            [],
        );
      } catch (err) {
        console.error(
          'Failed to load sales attendance:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load attendance data.',
        );
      } finally {
        setLoading(false);
      }
    },
    [salesId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /*
   * Back button.
   */
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(
        '/admin/sales',
      );
    }
  };

  /*
   * Build:
   *
   * YYYY-MM-DD -> latest attendance record
   *
   * This uses the actual timestamp stored by
   * the attendance system.
   */
  const attendanceByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          Attendance
        >();

      for (const record of attendance) {
        const timestamp =
          record.server_created_at ??
          record.created_at;

        if (!timestamp) {
          continue;
        }

        const date =
          new Date(timestamp);

        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          continue;
        }

        const dateKey =
          formatDateKey(date);

        /*
         * Attendance is fetched newest first,
         * so keep the first record for each date.
         */
        if (
          !map.has(dateKey)
        ) {
          map.set(
            dateKey,
            record,
          );
        }
      }

      return map;
    }, [attendance]);

  /*
   * Generate the calendar.
   */
  const calendarDays =
    useMemo(() => {
      const year =
        month.getFullYear();

      const monthIndex =
        month.getMonth();

      const firstDay =
        new Date(
          year,
          monthIndex,
          1,
        );

      const daysInMonth =
        new Date(
          year,
          monthIndex + 1,
          0,
        ).getDate();

      const days: (
        | CalendarDay
        | null
      )[] = [];

      /*
       * Empty cells before the first
       * day of the month.
       */
      for (
        let i = 0;
        i < firstDay.getDay();
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const date =
          new Date(
            year,
            monthIndex,
            day,
          );

        const dateKey =
          formatDateKey(date);

        const record =
          attendanceByDate.get(
            dateKey,
          );

        let status: DayStatus;

        if (record) {
          status =
            getAttendanceStatus(
              record.status,
            );
        } else if (
          isFutureDate(date)
        ) {
          /*
           * Tomorrow and all future days
           * remain white.
           */
          status = 'future';
        } else {
          /*
           * Today and previous days with
           * no attendance are red.
           */
          status = 'none';
        }

        days.push({
          date,
          dateKey,
          dayNumber: day,
          status,
          attendance:
            record ?? null,
        });
      }

      return days;
    }, [
      month,
      attendanceByDate,
    ]);

  /*
   * IMPORTANT:
   *
   * The admin selects a specific salesperson
   * through salesId and a specific date through
   * dateKey.
   *
   * We then query attendance again using BOTH
   * values so the popup is tied exactly to
   * that salesperson + that date.
   */
  const openDay = async (
    day: CalendarDay,
  ) => {
    if (
      day.status ===
      'future'
    ) {
      setSelectedDay(day);
      setModalVisible(true);
      return;
    }

    if (
      day.status ===
      'none'
    ) {
      setSelectedDay(day);
      setModalVisible(true);
      return;
    }

    if (!salesId) {
      return;
    }

    try {
      /*
       * Create the beginning and end of the
       * selected calendar day.
       *
       * This means an attendance from another
       * date cannot accidentally appear.
       */
      const startOfDay =
        new Date(
          day.date.getFullYear(),
          day.date.getMonth(),
          day.date.getDate(),
          0,
          0,
          0,
          0,
        );

      const endOfDay =
        new Date(
          day.date.getFullYear(),
          day.date.getMonth(),
          day.date.getDate(),
          23,
          59,
          59,
          999,
        );

      const {
        data,
        error: attendanceError,
      } = await supabase
        .from('attendance')
        .select('*')
        .eq(
          'sales_id',
          salesId,
        )
        .gte(
          'server_created_at',
          startOfDay.toISOString(),
        )
        .lte(
          'server_created_at',
          endOfDay.toISOString(),
        )
        .order(
          'server_created_at',
          {
            ascending: false,
          },
        )
        .limit(1);

      if (
        attendanceError
      ) {
        throw attendanceError;
      }

      /*
       * If the exact date has an attendance
       * record, use the fresh database result.
       */
      const exactAttendance =
        data &&
        data.length > 0
          ? data[0]
          : null;

      setSelectedDay({
        ...day,
        attendance:
          exactAttendance,
        status: exactAttendance
          ? getAttendanceStatus(
              exactAttendance.status,
            )
          : isFutureDate(
                day.date,
              )
            ? 'future'
            : 'none',
      });

      setModalVisible(true);
    } catch (err) {
      console.error(
        'Failed to fetch exact attendance:',
        err,
      );

      /*
       * Fall back to the record already loaded
       * for this exact calendar date.
       */
      setSelectedDay(day);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDay(null);
  };

  const goToPreviousMonth =
    () => {
      setMonth(
        new Date(
          month.getFullYear(),
          month.getMonth() - 1,
          1,
        ),
      );
    };

  const goToNextMonth =
    () => {
      setMonth(
        new Date(
          month.getFullYear(),
          month.getMonth() + 1,
          1,
        ),
      );
    };

  /*
   * Loading screen.
   */
  if (loading) {
    return (
      <ScreenContainer
        title="Attendance Monitoring"
      >
        <View
          style={
            styles.center
          }
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading attendance...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * Error screen.
   */
  if (error) {
    return (
      <ScreenContainer
        title="Attendance Monitoring"
      >
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load attendance
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>

          <Pressable
            style={
              styles.backButton
            }
            onPress={
              handleGoBack
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ← Go Back
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Attendance Monitoring"
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        {/* Back */}
        <Pressable
          onPress={
            handleGoBack
          }
          style={
            styles.backLink
          }
        >
          <Text
            style={
              styles.backLinkText
            }
          >
            ← Back to Sales
          </Text>
        </Pressable>

        {/* Selected salesperson */}
        <View
          style={
            styles.salesCard
          }
        >
          <Text
            style={
              styles.salesName
            }
          >
            {salesUser?.name ||
              'Unnamed Sales User'}
          </Text>

          <Text
            style={
              styles.salesEmail
            }
          >
            {salesUser?.email ||
              'No email'}
          </Text>
        </View>

        {/* Legend */}
        <View
          style={
            styles.legend
          }
        >
          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.noAttendance,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              No attendance
            </Text>
          </View>

          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.pending,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Pending
            </Text>
          </View>

          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.attended,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Attended
            </Text>
          </View>

          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.future,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Future
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View
          style={
            styles.calendarCard
          }
        >
          <View
            style={
              styles.monthHeader
            }
          >
            <Pressable
              style={
                styles.monthButton
              }
              onPress={
                goToPreviousMonth
              }
            >
              <Text
                style={
                  styles.monthButtonText
                }
              >
                ‹
              </Text>
            </Pressable>

            <Text
              style={
                styles.monthTitle
              }
            >
              {
                MONTH_NAMES[
                  month.getMonth()
                ]
              }{' '}
              {
                month.getFullYear()
              }
            </Text>

            <Pressable
              style={
                styles.monthButton
              }
              onPress={
                goToNextMonth
              }
            >
              <Text
                style={
                  styles.monthButtonText
                }
              >
                ›
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.weekHeader
            }
          >
            {WEEK_DAYS.map(
              (day) => (
                <View
                  key={day}
                  style={
                    styles.weekDay
                  }
                >
                  <Text
                    style={
                      styles.weekDayText
                    }
                  >
                    {day}
                  </Text>
                </View>
              ),
            )}
          </View>

          <View
            style={
              styles.calendarGrid
            }
          >
            {calendarDays.map(
              (
                day,
                index,
              ) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={
                        styles.dayCell
                      }
                    />
                  );
                }

                let statusStyle =
                  styles.noAttendance;

                if (
                  day.status ===
                  'attended'
                ) {
                  statusStyle =
                    styles.attended;
                } else if (
                  day.status ===
                  'pending'
                ) {
                  statusStyle =
                    styles.pending;
                } else if (
                  day.status ===
                  'future'
                ) {
                  statusStyle =
                    styles.future;
                }

                return (
                  <Pressable
                    key={
                      day.dateKey
                    }
                    style={
                      styles.dayCell
                    }
                    onPress={() =>
                      openDay(
                        day,
                      )
                    }
                  >
                    <View
                      style={[
                        styles.dayBox,
                        statusStyle,
                      ]}
                    >
                      <Text
                        style={
                          styles.dayNumber
                        }
                      >
                        {
                          day.dayNumber
                        }
                      </Text>
                    </View>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </ScrollView>

      {/* Attendance detail popup */}
      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
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
            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Attendance
                </Text>

                {selectedDay && (
                  <Text
                    style={
                      styles.modalDate
                    }
                  >
                    {selectedDay.date.toLocaleDateString(
                      undefined,
                      {
                        weekday:
                          'long',
                        year:
                          'numeric',
                        month:
                          'long',
                        day:
                          'numeric',
                      },
                    )}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={
                  closeModal
                }
                style={
                  styles.closeButton
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {/* No attendance */}
            {selectedDay &&
              (
                selectedDay.status ===
                  'none' ||
                selectedDay.status ===
                  'future'
              ) && (
                <View
                  style={
                    styles.messageCard
                  }
                >
                  <View
                    style={[
                      styles.messageIcon,
                      styles.noAttendance,
                    ]}
                  >
                    <Text
                      style={
                        styles.messageIconText
                      }
                    >
                      !
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.messageTitle
                    }
                  >
                    No attendance
                  </Text>

                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    No attendance record
                    exists for this
                    salesperson on
                    this date.
                  </Text>
                </View>
              )}

            {/* Pending */}
            {selectedDay &&
              selectedDay.status ===
                'pending' && (
                <View
                  style={
                    styles.messageCard
                  }
                >
                  <View
                    style={[
                      styles.messageIcon,
                      styles.pending,
                    ]}
                  >
                    <Text
                      style={
                        styles.messageIconText
                      }
                    >
                      …
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.messageTitle
                    }
                  >
                    Attendance is pending
                  </Text>

                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    This attendance record
                    has been submitted
                    and is waiting for
                    approval.
                  </Text>

                  {selectedDay.attendance && (
                    <AttendanceDetails
                      attendance={
                        selectedDay.attendance
                      }
                    />
                  )}
                </View>
              )}

            {/* Attended */}
            {selectedDay &&
              selectedDay.status ===
                'attended' &&
              selectedDay.attendance && (
                <View
                  style={
                    styles.attendanceCard
                  }
                >
                  <View
                    style={
                      styles.attendanceCardHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.attendanceCardTitle
                        }
                      >
                        Attendance Record
                      </Text>

                      <Text
                        style={
                          styles.attendanceCardSubtitle
                        }
                      >
                        {salesUser?.name ||
                          'Sales User'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.approvedBadge
                      }
                    >
                      <Text
                        style={
                          styles.approvedBadgeText
                        }
                      >
                        ATTENDED
                      </Text>
                    </View>
                  </View>

                  <AttendanceDetails
                    attendance={
                      selectedDay.attendance
                    }
                  />
                </View>
              )}

            <Pressable
              style={
                styles.doneButton
              }
              onPress={
                closeModal
              }
            >
              <Text
                style={
                  styles.doneButtonText
                }
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/*
 * Attendance details card.
 *
 * This is deliberately reusable for both
 * pending and attended records.
 */
function AttendanceDetails({
  attendance,
}: {
  attendance: Attendance;
}) {
  const timestamp =
    attendance.server_created_at ??
    attendance.created_at;

  const formattedDate =
    timestamp
      ? new Date(
          timestamp,
        ).toLocaleDateString(
          undefined,
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        )
      : 'Not available';

  const formattedTime =
    timestamp
      ? new Date(
          timestamp,
        ).toLocaleTimeString()
      : 'Not available';

  return (
    <View
      style={
        styles.details
      }
    >
      <View
        style={
          styles.detailRow
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          Date
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {formattedDate}
        </Text>
      </View>

      <View
        style={
          styles.detailRow
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          Time
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {formattedTime}
        </Text>
      </View>

      <View
        style={
          styles.detailRow
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          Status
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {attendance.status ||
            'Unknown'}
        </Text>
      </View>

      {attendance.latitude !=
        null && (
        <View
          style={
            styles.detailRow
          }
        >
          <Text
            style={
              styles.detailLabel
            }
          >
            Latitude
          </Text>

          <Text
            style={
              styles.detailValue
            }
          >
            {attendance.latitude}
          </Text>
        </View>
      )}

      {attendance.longitude !=
        null && (
        <View
          style={
            styles.detailRow
          }
        >
          <Text
            style={
              styles.detailLabel
            }
          >
            Longitude
          </Text>

          <Text
            style={
              styles.detailValue
            }
          >
            {attendance.longitude}
          </Text>
        </View>
      )}

      {attendance.rejection_reason && (
        <View
          style={
            styles.rejectionBox
          }
        >
          <Text
            style={
              styles.rejectionTitle
            }
          >
            Rejection reason
          </Text>

          <Text
            style={
              styles.rejectionText
            }
          >
            {
              attendance.rejection_reason
            }
          </Text>
        </View>
      )}

      {(attendance.photo_url ||
        attendance.photo_path) && (
        <View
          style={
            styles.photoBox
          }
        >
          <Text
            style={
              styles.photoTitle
            }
          >
            Attendance photo
          </Text>

          <Text
            style={
              styles.photoPath
            }
          >
            {attendance.photo_url ||
              attendance.photo_path}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },

  backLink: {
    marginBottom: 16,
  },

  backLinkText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },

  salesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  salesName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },

  salesEmail: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },

  legendText: {
    fontSize: 12,
    color: '#475569',
  },

  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  monthTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
  },

  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },

  monthButtonText: {
    fontSize: 26,
    color: '#0f172a',
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  weekDay: {
    width: '14.2857%',
    alignItems: 'center',
  },

  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
  },

  dayBox: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  noAttendance: {
    backgroundColor: '#fecaca',
  },

  pending: {
    backgroundColor: '#fde68a',
  },

  attended: {
    backgroundColor: '#bbf7d0',
  },

  future: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
  },

  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7f1d1d',
  },

  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },

  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },

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
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a',
  },

  modalDate: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },

  closeButtonText: {
    fontSize: 25,
    lineHeight: 28,
    color: '#334155',
  },

  messageCard: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },

  messageIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  messageIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },

  messageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },

  messageText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
  },

  attendanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },

  attendanceCardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },

  attendanceCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },

  attendanceCardSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748b',
  },

  approvedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#bbf7d0',
  },

  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },

  details: {
    padding: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'right',
  },

  rejectionBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },

  rejectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },

  rejectionText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#7f1d1d',
  },

  photoBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },

  photoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  photoPath: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748b',
  },

  doneButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },

  doneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});