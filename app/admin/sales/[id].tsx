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

import { LocationPathMap } from '@/src/components/LocationPathMap';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';
import { getLocationPath } from '@/src/services/locationService';
import type { LocationPing } from '@/src/types';

const ATTENDANCE_BUCKET =
  'attendance-photos';

/*
 * ================================================================
 * DEMO MODE
 * ================================================================
 *
 * Set to true for the client demo.
 *
 * In demo mode:
 * - Attendance and order results are FAKE frontend-only data.
 * - No fake attendance/spin records are written to Supabase.
 * - The salesperson profile can still be read from Supabase.
 *
 * Set to false when you are ready to use real backend data again.
 */
const DEMO_MODE = false;

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
  id: string;
  sales_id: string;
  store_id: string | null;
  store_name?: string | null;
  store_code?: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  distance_meters: number | null;
  photo_path: string | null;
  photo_url: string | null;
  client_captured_at: string | null;
  created_at: string | null;
  server_created_at?: string | null;
  status: string | null;
  rejection_reason: string | null;
};

type SpinRecord = {
  id: string;
  attendance_id: string | null;
};

type DayStatus =
  | 'order'
  | 'no_order'
  | 'absent'
  | 'no_attendance'
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

const formatDateKey = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isFutureDate = (
  date: Date,
) => {
  const today =
    new Date();

  return (
    formatDateKey(date) >
    formatDateKey(today)
  );
};

/*
 * ================================================================
 * ABSENCE DETECTION
 * ================================================================
 *
 * Yellow means:
 *
 * attendance record exists
 * +
 * attendance is absent/rejected
 * +
 * no order
 *
 * We support the status values currently used
 * by your attendance system.
 */

const isAbsentAttendance = (
  attendance: Attendance,
): boolean => {
  const status =
    attendance.status
      ?.trim()
      .toLowerCase();

  return (
    status === 'absent' ||
    status === 'rejected'
  );
};

/*
 * ================================================================
 * ORDER DETECTION
 * ================================================================
 *
 * A visit counts as ORDER when:
 *
 * spins.attendance_id === attendance.id
 *
 * This uses the same relationship already used
 * by your Sales History screen.
 */

const hasOrderForAttendance = (
  attendance: Attendance,
  orderAttendanceIds: Set<string>,
): boolean => {
  return orderAttendanceIds.has(
    attendance.id,
  );
};

/*
 * ================================================================
 * GET DAY STATUS
 * ================================================================
 *
 * GREEN:
 *   Attendance + order
 *
 * RED:
 *   Attendance + no order + normal attendance
 *
 * YELLOW:
 *   Attendance + absent/rejected + no order
 *
 * BROWN:
 *   No attendance
 *
 * WHITE:
 *   Future
 * ================================================================
 */

const getDayStatus = (
  records: Attendance[],
  date: Date,
  orderAttendanceIds: Set<string>,
): DayStatus => {
  /*
   * Future date always stays white.
   */

  if (isFutureDate(date)) {
    return 'future';
  }

  /*
   * No attendance at all.
   *
   * This is BROWN.
   */

  if (records.length === 0) {
    return 'no_attendance';
  }

  /*
   * If ANY attendance on this date
   * has an order, the day is GREEN.
   */

  const hasOrder =
    records.some(
      (record) =>
        hasOrderForAttendance(
          record,
          orderAttendanceIds,
        ),
    );

  if (hasOrder) {
    return 'order';
  }

  /*
   * If there is no order and the attendance
   * is absent/rejected, make it YELLOW.
   */

  const hasAbsent =
    records.some(
      (record) =>
        isAbsentAttendance(
          record,
        ),
    );

  if (hasAbsent) {
    return 'absent';
  }

  /*
   * Attendance exists but no order.
   *
   * This is RED.
   */

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
      } =
        await supabase.storage
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
          error,
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
 * DEMO DATA
 * ================================================================
 *
 * Frontend-only demo data.
 *
 * GREEN  = Order
 * RED    = No Order
 * YELLOW = Absent / No Order
 * BROWN  = No Attendance
 * WHITE  = Future
 *
 * We generate the dates dynamically for the currently displayed
 * month, so the demo continues to work even if the client opens it
 * in a different month.
 */

const createDemoAttendance = (
  salesId: string,
  year: number,
  monthIndex: number,
  day: number,
  status: 'approved' | 'absent',
  index: number,
): Attendance => {
  const date = new Date(
    year,
    monthIndex,
    day,
    9 + (index % 4),
    15,
    0,
    0,
  );

  const dateIso = date.toISOString();

  return {
    id: `demo-attendance-${year}-${monthIndex + 1}-${day}`,
    sales_id: salesId,
    store_id: `demo-store-${index + 1}`,
    latitude: -7.2575,
    longitude: 112.7521,
    gps_accuracy: status === 'absent' ? 18.4 : 7.2,
    distance_meters: status === 'absent' ? 42.5 : 8.6,
    photo_path: null,
    photo_url: null,
    client_captured_at: dateIso,
    created_at: dateIso,
    server_created_at: dateIso,
    status,
    rejection_reason:
      status === 'absent'
        ? 'Demo: salesperson was marked absent.'
        : null,
  };
};

const createDemoData = (
  salesId: string,
  year: number,
  monthIndex: number,
) => {
  /*
   * These dates are intentionally spread out so the client can
   * immediately see all four calendar states.
   *
   * Order dates:
   * 1, 7, 12, 18
   *
   * No-order dates:
   * 3, 9, 16
   *
   * Absent / no-order dates:
   * 5, 14
   *
   * Every other past date = No Attendance (brown).
   */
  const orderDays = [1, 7, 12, 18];
  const noOrderDays = [3, 9, 16];
  const absentDays = [5, 14];

  const demoAttendance: Attendance[] = [];
  const demoOrderIds = new Set<string>();

  let index = 0;

  for (const day of orderDays) {
    const record = createDemoAttendance(
      salesId,
      year,
      monthIndex,
      day,
      'approved',
      index++,
    );

    demoAttendance.push(record);
    demoOrderIds.add(record.id);
  }

  for (const day of noOrderDays) {
    demoAttendance.push(
      createDemoAttendance(
        salesId,
        year,
        monthIndex,
        day,
        'approved',
        index++,
      ),
    );
  }

  for (const day of absentDays) {
    demoAttendance.push(
      createDemoAttendance(
        salesId,
        year,
        monthIndex,
        day,
        'absent',
        index++,
      ),
    );
  }

  return {
    attendance: demoAttendance.sort(
      (a, b) =>
        new Date(
          b.server_created_at ?? b.created_at ?? 0,
        ).getTime() -
        new Date(
          a.server_created_at ?? a.created_at ?? 0,
        ).getTime(),
    ),
    orderIds: demoOrderIds,
  };
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
    useState<Attendance[]>(
      [],
    );

  const [
    orderAttendanceIds,
    setOrderAttendanceIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [month, setMonth] =
    useState(
      new Date(),
    );

  const [selectedDay, setSelectedDay] =
    useState<CalendarDay | null>(
      null,
    );

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [locationPings, setLocationPings] =
    useState<LocationPing[]>(
      [],
    );

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    locationError,
    setLocationError,
  ] = useState<string | null>(
    null,
  );

  /*
   * ==============================================================
   * LOAD DATA
   * ==============================================================
   */

  const fetchData =
    useCallback(
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

          /*
           * ----------------------------------------------------------
           * DEMO MODE
           * ----------------------------------------------------------
           *
           * Only the salesperson profile is read from Supabase.
           * Attendance and spin/order data are generated locally.
           */
          if (DEMO_MODE) {
            let demoSalesUser: SalesUser = {
              id: salesId,
              name: 'Demo Sales Representative',
              email: 'demo@sales.com',
            };

            /*
             * Try to use the real salesperson's name/email if the
             * account exists. If it does not, the demo still works.
             */
            const { data: salesResult } = await supabase
              .from('sales')
              .select('id, name, email')
              .eq('id', salesId)
              .maybeSingle();

            if (salesResult) {
              demoSalesUser = salesResult as SalesUser;
            }

            const now = new Date();

            const demoData = createDemoData(
              salesId,
              now.getFullYear(),
              now.getMonth(),
            );

            setSalesUser(demoSalesUser);
            setAttendance(demoData.attendance);
            setOrderAttendanceIds(demoData.orderIds);

            return;
          }

          /*
           * ----------------------------------------------------------
           * REAL BACKEND MODE
           * ----------------------------------------------------------
           *
           * Set DEMO_MODE to false to use this section.
           */

          const [
            salesResult,
            attendanceResult,
            spinsResult,
          ] =
            await Promise.all([
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
                    ascending:
                      false,
                  },
                ),

              supabase
                .from('spins')
                .select(
                  'id, attendance_id',
                )
                .eq(
                  'sales_id',
                  salesId,
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

          if (
            spinsResult.error
          ) {
            throw spinsResult.error;
          }

          const records =
            (attendanceResult.data ??
              []) as Attendance[];

          const spins =
            (spinsResult.data ??
              []) as SpinRecord[];

          const orderIds =
            new Set(
              spins
                .map(
                  (spin) =>
                    spin.attendance_id,
                )
                .filter(
                  (
                    id,
                  ): id is string =>
                    typeof id ===
                      'string' &&
                    id.length > 0,
                ),
            );

          /*
           * ----------------------------------------------------------
           * LOAD STORE NAMES
           * ----------------------------------------------------------
           *
           * Attendance stores only store_id. Load the corresponding
           * store names/codes from the real stores table separately.
           * This avoids depending on Supabase foreign-key relationship
           * inference in the client query.
           */

          const storeIds =
            Array.from(
              new Set(
                records
                  .map(
                    (record) =>
                      record.store_id,
                  )
                  .filter(
                    (
                      id,
                    ): id is string =>
                      typeof id ===
                        'string' &&
                      id.length > 0,
                  ),
              ),
            );

          const storeMap =
            new Map<
              string,
              {
                name: string | null;
                store_code: string | null;
              }
            >();

          if (
            storeIds.length >
            0
          ) {
            const {
              data: storeRows,
              error: storeError,
            } =
              await supabase
                .from('stores')
                .select(
                  'id, name, store_code',
                )
                .in(
                  'id',
                  storeIds,
                );

            if (
              storeError
            ) {
              throw storeError;
            }

            for (
              const store of
                storeRows ?? []
            ) {
              storeMap.set(
                store.id,
                {
                  name:
                    store.name ??
                    null,
                  store_code:
                    store.store_code ??
                    null,
                },
              );
            }
          }

          const recordsWithStores =
            records.map(
              (record) => {
                const store =
                  record.store_id
                    ? storeMap.get(
                        record.store_id,
                      )
                    : undefined;

                return {
                  ...record,
                  store_name:
                    store?.name ??
                    null,
                  store_code:
                    store?.store_code ??
                    null,
                };
              },
            );

          const recordsWithPhotos =
            await addPhotoUrls(
              recordsWithStores,
            );

          setSalesUser(
            salesResult.data,
          );

          setAttendance(
            recordsWithPhotos,
          );

          setOrderAttendanceIds(
            orderIds,
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

  const handleGoBack =
    () => {
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
       * Sort visits chronologically.
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
            orderAttendanceIds,
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
      orderAttendanceIds,
    ]);

  /*
   * ==============================================================
   * LOCATION PATH
   * ==============================================================
   *
   * Independent of DEMO_MODE / demo attendance data above -- pings are
   * always read from the real public.location_pings table via the
   * get_location_path() RPC (009_location_pings.sql), which already
   * restricts access to the rep themself or an admin and returns rows
   * ordered by recorded_at.
   *
   * Until the ping-sending client code exists and the migration has
   * been applied to Supabase, this will simply come back empty --
   * handled below as "No location pings recorded for this day."
   */

  useEffect(() => {
    if (
      !modalVisible ||
      !selectedDay ||
      !salesId ||
      selectedDay.status ===
        'future'
    ) {
      setLocationPings([]);
      setLocationError(null);
      return;
    }

    let cancelled = false;

    const fetchLocationPath =
      async () => {
        setLocationLoading(true);
        setLocationError(null);

        try {
          const pings =
            await getLocationPath(
              salesId,
              selectedDay.dateKey,
            );

          if (!cancelled) {
            setLocationPings(
              pings,
            );
          }
        } catch (err) {
          if (!cancelled) {
            setLocationPings([]);
            setLocationError(
              err instanceof
                Error
                ? err.message
                : 'Failed to load location path',
            );
          }
        } finally {
          if (!cancelled) {
            setLocationLoading(
              false,
            );
          }
        }
      };

    fetchLocationPath();

    return () => {
      cancelled = true;
    };
  }, [
    modalVisible,
    selectedDay,
    salesId,
  ]);

  /*
   * ==============================================================
   * OPEN DAY
   * ==============================================================
   */

  const openDay = async (
    day: CalendarDay,
  ) => {
    /*
     * Future dates don't need
     * another database request.
     */

    if (
      day.status ===
      'future'
    ) {
      setSelectedDay(day);
      setModalVisible(true);

      return;
    }

    /*
     * In demo mode, the calendar already contains all fake data.
     * Do NOT query Supabase when a day is opened, otherwise the real
     * backend response would replace the demo result.
     */
    if (DEMO_MODE) {
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
       * Get exact attendance
       * for selected day.
       */

      const {
        data,
        error:
          attendanceError,
      } =
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

      const exactRawAttendances =
        (data ??
          []) as Attendance[];

      const exactStoreIds =
        Array.from(
          new Set(
            exactRawAttendances
              .map(
                (record) =>
                  record.store_id,
              )
              .filter(
                (
                  id,
                ): id is string =>
                  typeof id ===
                    'string' &&
                  id.length > 0,
              ),
          ),
        );

      const exactStoreMap =
        new Map<
          string,
          {
            name: string | null;
            store_code: string | null;
          }
        >();

      if (
        exactStoreIds.length >
        0
      ) {
        const {
          data: exactStores,
          error: exactStoresError,
        } =
          await supabase
            .from('stores')
            .select(
              'id, name, store_code',
            )
            .in(
              'id',
              exactStoreIds,
            );

        if (
          exactStoresError
        ) {
          throw exactStoresError;
        }

        for (
          const store of
            exactStores ?? []
        ) {
          exactStoreMap.set(
            store.id,
            {
              name:
                store.name ??
                null,
              store_code:
                store.store_code ??
                null,
            },
          );
        }
      }

      const exactAttendancesWithStores =
        exactRawAttendances.map(
          (record) => {
            const store =
              record.store_id
                ? exactStoreMap.get(
                    record.store_id,
                  )
                : undefined;

            return {
              ...record,
              store_name:
                store?.name ??
                null,
              store_code:
                store?.store_code ??
                null,
            };
          },
        );

      const exactAttendances =
        await addPhotoUrls(
          exactAttendancesWithStores,
        );

      /*
       * Make sure we have
       * the latest order IDs.
       *
       * This is especially useful
       * if an order was created
       * after the initial screen load.
       */

      const exactAttendanceIds =
        exactAttendances.map(
          (record) =>
            record.id,
        );

      let exactOrderIds =
        orderAttendanceIds;

      if (
        exactAttendanceIds.length >
        0
      ) {
        const {
          data: exactSpins,
          error: exactSpinError,
        } =
          await supabase
            .from('spins')
            .select(
              'id, attendance_id',
            )
            .in(
              'attendance_id',
              exactAttendanceIds,
            );

        if (
          exactSpinError
        ) {
          throw exactSpinError;
        }

        exactOrderIds =
          new Set(
            (
              (exactSpins ??
                []) as SpinRecord[]
            )
              .map(
                (spin) =>
                  spin.attendance_id,
              )
              .filter(
                (
                  id,
                ): id is string =>
                  typeof id ===
                    'string' &&
                  id.length > 0,
              ),
          );
      }

      const exactStatus =
        getDayStatus(
          exactAttendances,
          day.date,
          exactOrderIds,
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
       * Fallback to already
       * loaded records.
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
      const nextMonth = new Date(
        month.getFullYear(),
        month.getMonth() - 1,
        1,
      );

      setMonth(nextMonth);

      if (DEMO_MODE && salesId) {
        const demoData = createDemoData(
          salesId,
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
        );

        setAttendance(demoData.attendance);
        setOrderAttendanceIds(demoData.orderIds);
      }
    };

  const goToNextMonth =
    () => {
      const nextMonth = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1,
      );

      setMonth(nextMonth);

      if (DEMO_MODE && salesId) {
        const demoData = createDemoData(
          salesId,
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
        );

        setAttendance(demoData.attendance);
        setOrderAttendanceIds(demoData.orderIds);
      }
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
            color="#2563eb"
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
                styles.absent
              }
              label="Absent"
            />

            <LegendItem
              style={
                styles.noAttendance
              }
              label="No Attendance"
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
                  styles.noAttendance;

                if (
                  day.status ===
                  'order'
                ) {
                  statusStyle =
                    styles.order;
                } else if (
                  day.status ===
                  'no_order'
                ) {
                  statusStyle =
                    styles.noOrder;
                } else if (
                  day.status ===
                  'absent'
                ) {
                  statusStyle =
                    styles.absent;
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

                      {day
                        .attendance
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

            {/* Location path */}

            {selectedDay &&
              selectedDay.status !==
                'future' && (
                <View
                  style={
                    styles.locationCard
                  }
                >
                  <Text
                    style={
                      styles.locationCardTitle
                    }
                  >
                    Location Path
                  </Text>

                  {locationLoading ? (
                    <ActivityIndicator
                      color="#2563eb"
                    />
                  ) : locationError ? (
                    <Text
                      style={
                        styles.locationCardEmptyText
                      }
                    >
                      Couldn't load
                      location data:{' '}
                      {locationError}
                    </Text>
                  ) : locationPings.length ===
                    0 ? (
                    <Text
                      style={
                        styles.locationCardEmptyText
                      }
                    >
                      No location
                      pings recorded
                      for this day.
                    </Text>
                  ) : (
                    <>
                      <LocationPathMap
                        pings={
                          locationPings
                        }
                      />

                      <Text
                        style={
                          styles.locationCardSubtitle
                        }
                      >
                        {
                          locationPings.length
                        }{' '}
                        ping
                        {locationPings.length ===
                        1
                          ? ''
                          : 's'}{' '}
                        ·{' '}
                        {new Date(
                          locationPings[0].recorded_at,
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute:
                              '2-digit',
                          },
                        )}{' '}
                        –{' '}
                        {new Date(
                          locationPings[
                            locationPings.length -
                              1
                          ].recorded_at,
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute:
                              '2-digit',
                          },
                        )}
                      </Text>
                    </>
                  )}
                </View>
              )}

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
                    exist for this
                    date yet.
                  </Text>
                </View>
              )}

            {/* No attendance */}

            {selectedDay &&
              selectedDay.status ===
                'no_attendance' &&
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
                      styles.noAttendance,
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
                    No Attendance
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
                        hasOrder={hasOrderForAttendance(
                          record,
                          orderAttendanceIds,
                        )}
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
  hasOrder,
}: {
  attendance: Attendance;
  index: number;
  salesName: string;
  hasOrder: boolean;
}) {
  const isAbsent =
    isAbsentAttendance(
      attendance,
    );

  /*
   * Determine badge.
   */

  let badgeStyle =
    styles.noOrder;

  let badgeTextStyle =
    styles.orderBadgeTextRed;

  let badgeText =
    'NO ORDER';

  if (hasOrder) {
    badgeStyle =
      styles.order;

    badgeTextStyle =
      styles.orderBadgeTextGreen;

    badgeText =
      'ORDER';
  } else if (isAbsent) {
    badgeStyle =
      styles.absent;

    badgeTextStyle =
      styles.orderBadgeTextYellow;

    badgeText =
      'ABSENT';
  }

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

          {attendance.store_name ? (
            <Text
              style={
                styles.storeIdText
              }
              numberOfLines={1}
            >
              {attendance.store_name}
              {attendance.store_code
                ? ` • ${attendance.store_code}`
                : ''}
            </Text>
          ) : attendance.store_id ? (
            <Text
              style={
                styles.storeIdText
              }
              numberOfLines={1}
            >
              Store ID:{' '}
              {attendance.store_id}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.orderBadge,
            badgeStyle,
          ]}
        >
          <Text
            style={[
              styles.orderBadgeText,
              badgeTextStyle,
            ]}
          >
            {badgeText}
          </Text>
        </View>
      </View>

      <AttendanceDetails
        attendance={
          attendance
        }
        hasOrder={
          hasOrder
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
  hasOrder,
}: {
  attendance: Attendance;
  hasOrder: boolean;
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

  const isAbsent =
    isAbsentAttendance(
      attendance,
    );

  /*
   * Determine order display.
   */

  let resultText =
    'NO ORDER';

  let resultStyle =
    styles.noOrderText;

  let resultIcon =
    '×';

  let resultIconStyle =
    styles.noOrder;

  if (hasOrder) {
    resultText =
      'ORDER';

    resultStyle =
      styles.orderText;

    resultIcon =
      '✓';

    resultIconStyle =
      styles.order;
  } else if (isAbsent) {
    resultText =
      'ABSENT / NO ORDER';

    resultStyle =
      styles.absentText;

    resultIcon =
      '—';

    resultIconStyle =
      styles.absent;
  }

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
            resultIconStyle,
          ]}
        >
          <Text
            style={
              styles.orderResultIconText
            }
          >
            {resultIcon}
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
            SHOP RESULT
          </Text>

          <Text
            style={[
              styles.orderResultValue,
              resultStyle,
            ]}
          >
            {resultText}
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

const styles =
  StyleSheet.create({
    container: {
      padding: 16,
      paddingBottom: 40,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
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
      backgroundColor:
        '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
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

    demoBadge: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: '#fef3c7',
      borderWidth: 1,
      borderColor: '#f59e0b',
    },

    demoBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#92400e',
      letterSpacing: 0.5,
    },

    /* =========================================================
     * LEGEND
     * ========================================================= */

    legendCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    legendTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#94a3b8',
      letterSpacing: 1,
      marginBottom: 10,
    },

    legend: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      gap: 16,
    },

    legendItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
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

    /* =========================================================
     * CALENDAR
     * ========================================================= */

    calendarCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    monthHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
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
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#f1f5f9',
    },

    monthButtonText: {
      fontSize: 26,
      color: '#0f172a',
    },

    weekHeader: {
      flexDirection:
        'row',
      marginBottom: 8,
    },

    weekDay: {
      width:
        '14.2857%',
      alignItems:
        'center',
    },

    weekDayText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#64748b',
    },

    calendarGrid: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
    },

    dayCell: {
      width:
        '14.2857%',
      aspectRatio: 1,
      padding: 3,
    },

    dayBox: {
      flex: 1,
      borderRadius: 8,
      alignItems:
        'center',
      justifyContent:
        'center',
      position:
        'relative',
    },

    dayNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: '#0f172a',
    },

    countBadge: {
      position:
        'absolute',
      top: 3,
      right: 3,
      minWidth: 17,
      height: 17,
      paddingHorizontal: 3,
      borderRadius: 9,
      backgroundColor:
        '#0f172a',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    countBadgeText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '800',
    },

    /* =========================================================
     * STATUS COLORS
     * ========================================================= */

    /*
     * GREEN = ORDER
     */

    order: {
      backgroundColor:
        '#bbf7d0',
    },

    /*
     * RED = ATTENDED BUT NO ORDER
     */

    noOrder: {
      backgroundColor:
        '#fecaca',
    },

    /*
     * YELLOW = ABSENT
     */

    absent: {
      backgroundColor:
        '#fef08a',
    },

    /*
     * BROWN = NO ATTENDANCE
     */

    noAttendance: {
      backgroundColor:
        '#d6b08a',
    },

    /*
     * WHITE = FUTURE
     */

    future: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    /* =========================================================
     * ERROR
     * ========================================================= */

    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#991b1b',
      textAlign:
        'center',
    },

    errorText: {
      marginTop: 8,
      textAlign:
        'center',
      color: '#7f1d1d',
    },

    backButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor:
        '#0f172a',
    },

    backButtonText: {
      color: '#ffffff',
      fontWeight: '600',
    },

    /* =========================================================
     * MODAL
     * ========================================================= */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(15, 23, 42, 0.55)',
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 20,
    },

    /* =========================================================
     * LOCATION PATH
     * ========================================================= */

    locationCard: {
      backgroundColor:
        '#f8fafc',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      alignItems:
        'center',
    },

    locationCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#0f172a',
      alignSelf:
        'flex-start',
      marginBottom: 10,
    },

    locationCardEmptyText: {
      fontSize: 13,
      color: '#64748b',
      paddingVertical: 12,
    },

    locationCardSubtitle: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 8,
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90%',
      backgroundColor:
        '#ffffff',
      borderRadius: 16,
      padding: 18,
    },

    modalHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
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
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#f1f5f9',
    },

    closeButtonText: {
      fontSize: 25,
      lineHeight: 28,
      color: '#334155',
    },

    /* =========================================================
     * MESSAGE
     * ========================================================= */

    messageCard: {
      padding: 18,
      borderRadius: 12,
      backgroundColor:
        '#f8fafc',
      alignItems:
        'center',
    },

    messageIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        'center',
      justifyContent:
        'center',
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
      textAlign:
        'center',
    },

    messageText: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: '#64748b',
      textAlign:
        'center',
    },

    /* =========================================================
     * ATTENDANCE LIST
     * ========================================================= */

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

    /* =========================================================
     * ATTENDANCE CARD
     * ========================================================= */

    attendanceCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      backgroundColor:
        '#ffffff',
      overflow:
        'hidden',
    },

    attendanceCardHeader: {
      padding: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      backgroundColor:
        '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor:
        '#e2e8f0',
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

    /* =========================================================
     * ORDER BADGE
     * ========================================================= */

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

    orderBadgeTextYellow: {
      color: '#854d0e',
    },

    /* =========================================================
     * DETAILS
     * ========================================================= */

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

    /* =========================================================
     * ORDER RESULT
     * ========================================================= */

    orderResultBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      padding: 12,
      borderRadius: 10,
      backgroundColor:
        '#f8fafc',
      marginBottom: 12,
    },

    orderResultIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems:
        'center',
      justifyContent:
        'center',
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

    absentText: {
      color: '#854d0e',
    },

    /* =========================================================
     * DETAIL ROW
     * ========================================================= */

    detailRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      gap: 16,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor:
        '#f1f5f9',
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
      textAlign:
        'right',
    },

    /* =========================================================
     * REJECTION
     * ========================================================= */

    rejectionBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 8,
      backgroundColor:
        '#fef2f2',
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

    /* =========================================================
     * DONE
     * ========================================================= */

    doneButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 9,
      alignItems:
        'center',
      backgroundColor:
        '#0f172a',
    },

    doneButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
  });