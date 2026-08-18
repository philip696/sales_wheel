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
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';

const ATTENDANCE_BUCKET = 'attendance-photos';

/*
 * ================================================================
 * TYPES
 * ================================================================
 */

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

  photo_path?: string | null;

  photo_url?: string | null;

  latitude?: number | null;

  longitude?: number | null;

  gps_accuracy?: number | null;

  distance_meters?: number | null;

  client_captured_at?: string | null;

  rejection_reason?: string | null;

  store_id?: string | null;

  /*
   * IMPORTANT:
   *
   * We are NOT selecting attendance.order_placed.
   *
   * This optional frontend value allows the screen to
   * understand an order value if the backend already
   * returns one through another existing mechanism.
   *
   * It does not require a database migration.
   */
  orderStatus?: boolean | string | null;

  /*
   * Allow existing backend fields to remain available
   * without changing the backend.
   */
  [key: string]: unknown;
};

type DayStatus =
  | 'order'
  | 'no_order'
  | 'future';

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  status: DayStatus;
  attendance: Attendance[];
};

/*
 * ================================================================
 * CALENDAR CONSTANTS
 * ================================================================
 */

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

/*
 * ================================================================
 * DATE HELPERS
 * ================================================================
 */

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

/*
 * ================================================================
 * ORDER DETECTION
 * ================================================================
 *
 * IMPORTANT:
 *
 * We do NOT use:
 *
 * attendance.order_placed
 *
 * because that column does not exist in your current backend.
 *
 * Instead, this function checks whether the returned attendance
 * object already contains an order-related value.
 *
 * If nothing exists, it returns false.
 *
 * This keeps the existing attendance query intact.
 * ================================================================
 */

const getOrderStatus = (
  attendance: Attendance,
): boolean => {
  /*
   * Direct frontend value if available.
   */
  if (
    typeof attendance.orderStatus ===
    'boolean'
  ) {
    return attendance.orderStatus;
  }

  /*
   * Possible existing backend values.
   *
   * These are only read from the returned object.
   * They are NOT requested as columns.
   */

  const possibleValues = [
    attendance.order_status,
    attendance.shop_order,
    attendance.has_order,
    attendance.hasOrder,
    attendance.order,
    attendance.orderPlaced,
  ];

  for (const value of possibleValues) {
    if (
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (
      typeof value === 'number'
    ) {
      return value === 1;
    }

    if (
      typeof value === 'string'
    ) {
      const normalized =
        value
          .trim()
          .toLowerCase();

      if (
        [
          'yes',
          'true',
          'ordered',
          'order',
          'placed',
          '1',
        ].includes(normalized)
      ) {
        return true;
      }

      if (
        [
          'no',
          'false',
          'none',
          'no order',
          'not ordered',
          '0',
        ].includes(normalized)
      ) {
        return false;
      }
    }
  }

  /*
   * No order information exists in the
   * current attendance response.
   */
  return false;
};

/*
 * ================================================================
 * GET DAY STATUS
 * ================================================================
 *
 * New calendar meaning:
 *
 * 🟩 Green  = Order
 * 🟥 Red    = No Order
 * ⬜ White  = Future
 *
 * Multiple visits:
 *
 * If ANY visit on that date has an order,
 * the entire day becomes green.
 *
 * Otherwise the day is red.
 * ================================================================
 */

const getDayStatus = (
  records: Attendance[],
  date: Date,
): DayStatus => {
  if (
    isFutureDate(date) &&
    records.length === 0
  ) {
    return 'future';
  }

  if (records.length === 0) {
    return 'no_order';
  }

  const hasOrder =
    records.some(
      (record) =>
        getOrderStatus(record),
    );

  if (hasOrder) {
    return 'order';
  }

  return 'no_order';
};

/*
 * ================================================================
 * TIME FORMAT
 * ================================================================
 */

const formatAttendanceTime = (
  attendance: Attendance,
) => {
  const timestamp =
    attendance.server_created_at ??
    attendance.created_at;

  if (!timestamp) {
    return 'No recorded time';
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return timestamp;
  }

  return date.toLocaleString();
};

/*
 * ================================================================
 * PHOTO URL
 * ================================================================
 */

const getAttendancePhotoUrl =
  async (
    photoPath:
      | string
      | null
      | undefined,
  ): Promise<
    string | null
  > => {
    if (!photoPath) {
      return null;
    }

    try {
      const {
        data,
        error,
      } = await supabase.storage
        .from(
          ATTENDANCE_BUCKET,
        )
        .createSignedUrl(
          photoPath,
          60 * 60,
        );

      if (error) {
        console.error(
          'ATTENDANCE PHOTO ERROR:',
          {
            photoPath,
            message:
              error.message,
          },
        );

        return null;
      }

      return (
        data?.signedUrl ??
        null
      );
    } catch (error) {
      console.error(
        'ATTENDANCE PHOTO URL ERROR:',
        error,
      );

      return null;
    }
  };

/*
 * ================================================================
 * ADD PHOTO URLS
 * ================================================================
 */

const addPhotoUrls = async (
  records: Attendance[],
): Promise<
  Attendance[]
> => {
  return Promise.all(
    records.map(
      async (record) => {
        const photoUrl =
          await getAttendancePhotoUrl(
            record.photo_path,
          );

        return {
          ...record,
          photo_url:
            photoUrl,
        };
      },
    ),
  );
};

/*
 * ================================================================
 * MAIN SCREEN
 * ================================================================
 */

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
   * ==============================================================
   * LOAD DATA
   * ==============================================================
   *
   * Backend logic remains the same.
   *
   * We only read:
   *
   * sales
   * attendance
   *
   * No backend updates.
   * No migrations.
   * No order_placed column.
   * ==============================================================
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
          /*
           * Salesperson
           */
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

          /*
           * Attendance
           *
           * IMPORTANT:
           * This query deliberately uses the same
           * existing backend fields.
           */
          supabase
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
              rejection_reason
            `)
            .eq(
              'sales_id',
              salesId,
            )
            .order(
              'created_at',
              {
                ascending: false,
              },
            ),
        ]);

        if (
          salesResult.error
        ) {
          throw salesResult.error;
        }

        if (
          attendanceResult.error
        ) {
          throw attendanceResult.error;
        }

        const records =
          (attendanceResult.data ??
            []) as Attendance[];

        /*
         * Generate signed URLs.
         */
        const recordsWithPhotos =
          await addPhotoUrls(
            records,
          );

        setSalesUser(
          salesResult.data,
        );

        setAttendance(
          recordsWithPhotos,
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
   * ==============================================================
   * BACK
   * ==============================================================
   */

  const handleGoBack = () => {
    if (
      router.canGoBack()
    ) {
      router.back();
    } else {
      router.replace(
        '/admin/sales',
      );
    }
  };

  /*
   * ==============================================================
   * GROUP ATTENDANCE BY DATE
   * ==============================================================
   */

  const attendanceByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          Attendance[]
        >();

      for (
        const record of attendance
      ) {
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

        const existing =
          map.get(dateKey) ??
          [];

        existing.push(record);

        map.set(
          dateKey,
          existing,
        );
      }

      /*
       * Chronological order.
       */
      for (
        const [
          dateKey,
          records,
        ] of map.entries()
      ) {
        records.sort(
          (a, b) => {
            const aTime =
              new Date(
                a.server_created_at ??
                  a.created_at ??
                  0,
              ).getTime();

            const bTime =
              new Date(
                b.server_created_at ??
                  b.created_at ??
                  0,
              ).getTime();

            return (
              aTime - bTime
            );
          },
        );

        map.set(
          dateKey,
          records,
        );
      }

      return map;
    }, [attendance]);

  /*
   * ==============================================================
   * CALENDAR
   * ==============================================================
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
       * Empty cells before day 1.
       */
      for (
        let i = 0;
        i < firstDay.getDay();
        i++
      ) {
        days.push(null);
      }

      /*
       * Actual days.
       */
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

        const records =
          attendanceByDate.get(
            dateKey,
          ) ?? [];

        const status =
          getDayStatus(
            records,
            date,
          );

        days.push({
          date,
          dateKey,
          dayNumber: day,
          status,
          attendance:
            records,
        });
      }

      return days;
    }, [
      month,
      attendanceByDate,
    ]);

  /*
   * ==============================================================
   * OPEN DAY
   * ==============================================================
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

    if (!salesId) {
      return;
    }

    try {
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

      /*
       * Same backend fields.
       *
       * No order_placed.
       */
      const {
        data,
        error:
          attendanceError,
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
          rejection_reason
        `)
        .eq(
          'sales_id',
          salesId,
        )
        .gte(
          'created_at',
          startOfDay.toISOString(),
        )
        .lte(
          'created_at',
          endOfDay.toISOString(),
        )
        .order(
          'created_at',
          {
            ascending: true,
          },
        );

      if (
        attendanceError
      ) {
        throw attendanceError;
      }

      const exactAttendances =
        await addPhotoUrls(
          (data ??
            []) as Attendance[],
        );

      const exactStatus =
        getDayStatus(
          exactAttendances,
          day.date,
        );

      setSelectedDay({
        ...day,
        attendance:
          exactAttendances,
        status:
          exactStatus,
      });

      setModalVisible(true);
    } catch (err) {
      console.error(
        'Failed to fetch exact attendance:',
        err,
      );

      /*
       * Fallback to already loaded records.
       */
      setSelectedDay(day);
      setModalVisible(true);
    }
  };

  /*
   * ==============================================================
   * CLOSE MODAL
   * ==============================================================
   */

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDay(null);
  };

  /*
   * ==============================================================
   * MONTH NAVIGATION
   * ==============================================================
   */

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
   * ==============================================================
   * LOADING
   * ==============================================================
   */

  if (loading) {
    return (
      <ScreenContainer
        title="Sales Visit Calendar"
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
            Loading sales history...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==============================================================
   * ERROR
   * ==============================================================
   */

  if (error) {
    return (
      <ScreenContainer
        title="Sales Visit Calendar"
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
            Unable to load sales history
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

  /*
   * ==============================================================
   * MAIN UI
   * ==============================================================
   */

  return (
    <ScreenContainer
      title="Sales Visit Calendar"
      subtitle={
        salesUser?.name ??
        'Sales User'
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ===================================================== */}
        {/* BACK */}
        {/* ===================================================== */}

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

        {/* ===================================================== */}
        {/* SALES USER */}
        {/* ===================================================== */}

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

        {/* ===================================================== */}
        {/* LEGEND */}
        {/* ===================================================== */}

        <View
          style={
            styles.legendCard
          }
        >
          <Text
            style={
              styles.legendTitle
            }
          >
            VISIT STATUS
          </Text>

          <View
            style={
              styles.legend
            }
          >
            <LegendItem
              style={
                styles.order
              }
              label="Order"
            />

            <LegendItem
              style={
                styles.noOrder
              }
              label="No Order"
            />

            <LegendItem
              style={
                styles.future
              }
              label="Future"
            />
          </View>
        </View>

        {/* ===================================================== */}
        {/* CALENDAR */}
        {/* ===================================================== */}

        <View
          style={
            styles.calendarCard
          }
        >
          {/* Month header */}

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

          {/* Week header */}

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

          {/* Calendar grid */}

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
                  styles.noOrder;

                if (
                  day.status ===
                  'order'
                ) {
                  statusStyle =
                    styles.order;
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

                      {day.attendance
                        .length >
                        1 && (
                        <View
                          style={
                            styles.countBadge
                          }
                        >
                          <Text
                            style={
                              styles.countBadgeText
                            }
                          >
                            {
                              day
                                .attendance
                                .length
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </ScrollView>

      {/* ===================================================== */}
      {/* DAY DETAIL MODAL */}
      {/* ===================================================== */}

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
            {/* Header */}

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
                  Store Visits
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

            {/* Future */}

            {selectedDay &&
              selectedDay.status ===
                'future' && (
                <View
                  style={
                    styles.messageCard
                  }
                >
                  <View
                    style={[
                      styles.messageIcon,
                      styles.future,
                    ]}
                  >
                    <Text
                      style={
                        styles.messageIconText
                      }
                    >
                      —
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.messageTitle
                    }
                  >
                    Future date
                  </Text>

                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    No store visit can
                    exist for this date
                    yet.
                  </Text>
                </View>
              )}

            {/* No visits */}

            {selectedDay &&
              selectedDay.status ===
                'no_order' &&
              selectedDay.attendance
                .length ===
                0 && (
                <View
                  style={
                    styles.messageCard
                  }
                >
                  <View
                    style={[
                      styles.messageIcon,
                      styles.noOrder,
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
                    No store visit
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

            {/* Attendance records */}

            {selectedDay &&
              selectedDay.attendance
                .length >
                0 && (
                <ScrollView
                  style={
                    styles.attendanceList
                  }
                  contentContainerStyle={
                    styles.attendanceListContent
                  }
                  showsVerticalScrollIndicator={
                    true
                  }
                >
                  <View
                    style={
                      styles.recordsHeader
                    }
                  >
                    <Text
                      style={
                        styles.recordsTitle
                      }
                    >
                      {
                        selectedDay
                          .attendance
                          .length
                      }{' '}
                      store visit
                      {selectedDay
                        .attendance
                        .length ===
                      1
                        ? ''
                        : 's'}
                    </Text>

                    <Text
                      style={
                        styles.recordsSubtitle
                      }
                    >
                      All visits for this
                      date
                    </Text>
                  </View>

                  {selectedDay.attendance.map(
                    (
                      record,
                      index,
                    ) => (
                      <AttendanceCard
                        key={
                          record.id ??
                          `${selectedDay.dateKey}-${index}`
                        }
                        attendance={
                          record
                        }
                        index={
                          index
                        }
                        salesName={
                          salesUser?.name ||
                          'Sales User'
                        }
                      />
                    ),
                  )}
                </ScrollView>
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
 * ================================================================
 * LEGEND ITEM
 * ================================================================
 */

function LegendItem({
  style,
  label,
}: {
  style: object;
  label: string;
}) {
  return (
    <View
      style={
        styles.legendItem
      }
    >
      <View
        style={[
          styles.legendDot,
          style,
        ]}
      />

      <Text
        style={
          styles.legendText
        }
      >
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
  attendance,
  index,
  salesName,
}: {
  attendance: Attendance;
  index: number;
  salesName: string;
}) {
  const hasOrder =
    getOrderStatus(
      attendance,
    );

  return (
    <View
      style={
        styles.attendanceCard
      }
    >
      {/* Header */}

      <View
        style={
          styles.attendanceCardHeader
        }
      >
        <View
          style={
            styles.attendanceCardHeaderLeft
          }
        >
          <Text
            style={
              styles.attendanceCardTitle
            }
          >
            Visit #{index + 1}
          </Text>

          <Text
            style={
              styles.attendanceCardSubtitle
            }
          >
            {salesName}
          </Text>

          {attendance.store_id ? (
            <Text
              style={
                styles.storeIdText
              }
            >
              Store ID: {attendance.store_id}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.orderBadge,
            hasOrder
              ? styles.order
              : styles.noOrder,
          ]}
        >
          <Text
            style={[
              styles.orderBadgeText,
              hasOrder
                ? styles.orderBadgeTextGreen
                : styles.orderBadgeTextRed,
            ]}
          >
            {hasOrder
              ? 'ORDER'
              : 'NO ORDER'}
          </Text>
        </View>
      </View>

      <AttendanceDetails
        attendance={
          attendance
        }
      />
    </View>
  );
}

/*
 * ================================================================
 * ATTENDANCE DETAILS
 * ================================================================
 */

function AttendanceDetails({
  attendance,
}: {
  attendance: Attendance;
}) {
  const timestamp =
    attendance.server_created_at ??
    attendance.created_at;

  const parsedDate =
    timestamp
      ? new Date(timestamp)
      : null;

  const validDate =
    parsedDate &&
    !Number.isNaN(
      parsedDate.getTime(),
    );

  const formattedDate =
    validDate && parsedDate
      ? parsedDate.toLocaleDateString(
          undefined,
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        )
      : 'Not available';

  const formattedTime =
    validDate && parsedDate
      ? parsedDate.toLocaleTimeString()
      : 'Not available';

  const hasOrder =
    getOrderStatus(
      attendance,
    );

  return (
    <View
      style={
        styles.details
      }
    >
      {/* Photo */}

      <View
        style={
          styles.photoSection
        }
      >
        <Text
          style={
            styles.photoTitle
          }
        >
          Attendance photo
        </Text>

        <View
          style={
            styles.photoContainer
          }
        >
          {attendance.photo_url ? (
            <Image
              source={{
                uri:
                  attendance.photo_url,
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
      </View>

      {/* Order */}

      <View
        style={
          styles.orderResultBox
        }
      >
        <View
          style={[
            styles.orderResultIcon,
            hasOrder
              ? styles.order
              : styles.noOrder,
          ]}
        >
          <Text
            style={
              styles.orderResultIconText
            }
          >
            {hasOrder
              ? '✓'
              : '×'}
          </Text>
        </View>

        <View
          style={
            styles.orderResultContent
          }
        >
          <Text
            style={
              styles.orderResultLabel
            }
          >
            SHOP ORDER
          </Text>

          <Text
            style={[
              styles.orderResultValue,
              hasOrder
                ? styles.orderText
                : styles.noOrderText,
            ]}
          >
            {hasOrder
              ? 'ORDER'
              : 'NO ORDER'}
          </Text>
        </View>
      </View>

      {/* Date */}

      <DetailRow
        label="Date"
        value={
          formattedDate
        }
      />

      {/* Time */}

      <DetailRow
        label="Time"
        value={
          formattedTime
        }
      />

      {/* Status */}

      <DetailRow
        label="Attendance"
        value={
          attendance.status ||
          'Unknown'
        }
      />

      {/* Distance */}

      {attendance.distance_meters !=
        null && (
        <DetailRow
          label="Distance"
          value={`${attendance.distance_meters.toFixed(
            1,
          )} m`}
        />
      )}

      {/* GPS accuracy */}

      {attendance.gps_accuracy !=
        null && (
        <DetailRow
          label="GPS Accuracy"
          value={`${attendance.gps_accuracy.toFixed(
            1,
          )} m`}
        />
      )}

      {/* Rejection */}

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
    </View>
  );
}

/*
 * ================================================================
 * DETAIL ROW
 * ================================================================
 */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
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

/*
 * ================================================================
 * STYLES
 * ================================================================
 */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
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

  /* ========================================================= */
  /* LEGEND */
  /* ========================================================= */

  legendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  legendTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 10,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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
    fontWeight: '600',
  },

  /* ========================================================= */
  /* CALENDAR */
  /* ========================================================= */

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
    position: 'relative',
  },

  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  countBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },

  /* ========================================================= */
  /* ORDER COLORS */
  /* ========================================================= */

  order: {
    backgroundColor: '#bbf7d0',
  },

  noOrder: {
    backgroundColor: '#fecaca',
  },

  future: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  /* ========================================================= */
  /* ERROR */
  /* ========================================================= */

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

  /* ========================================================= */
  /* MODAL */
  /* ========================================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(15, 23, 42, 0.55)',
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

  /* ========================================================= */
  /* MESSAGE */
  /* ========================================================= */

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

  /* ========================================================= */
  /* ATTENDANCE LIST */
  /* ========================================================= */

  attendanceList: {
    maxHeight: 530,
  },

  attendanceListContent: {
    paddingBottom: 4,
    gap: 12,
  },

  recordsHeader: {
    marginBottom: 2,
  },

  recordsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  recordsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
  },

  /* ========================================================= */
  /* ATTENDANCE CARD */
  /* ========================================================= */

  attendanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },

  attendanceCardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  attendanceCardHeaderLeft: {
    flex: 1,
    marginRight: 10,
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

  storeIdText: {
    marginTop: 3,
    fontSize: 10,
    color: '#94a3b8',
  },

  /* ========================================================= */
  /* ORDER BADGE */
  /* ========================================================= */

  orderBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  orderBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },

  orderBadgeTextGreen: {
    color: '#166534',
  },

  orderBadgeTextRed: {
    color: '#991b1b',
  },

  /* ========================================================= */
  /* DETAILS */
  /* ========================================================= */

  details: {
    padding: 16,
  },

  photoSection: {
    marginBottom: 16,
  },

  photoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },

  photoContainer: {
    width: '100%',
    height: 240,
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

  /* ========================================================= */
  /* ORDER RESULT */
  /* ========================================================= */

  orderResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },

  orderResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  orderResultIconText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0f172a',
  },

  orderResultContent: {
    flex: 1,
  },

  orderResultLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },

  orderResultValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '900',
  },

  orderText: {
    color: '#15803d',
  },

  noOrderText: {
    color: '#b91c1c',
  },

  /* ========================================================= */
  /* DETAIL ROW */
  /* ========================================================= */

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

  /* ========================================================= */
  /* REJECTION */
  /* ========================================================= */

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

  /* ========================================================= */
  /* DONE */
  /* ========================================================= */

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