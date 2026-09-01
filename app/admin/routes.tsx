// app/admin/routes.tsx

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { supabase } from '@/src/lib/supabase';
import { getLocationPath } from '@/src/services/locationService';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LocationPing } from '@/src/types';

/*
 * ============================================================
 * WEB MAP
 * ============================================================
 *
 * Your existing LocationPathMap uses Leaflet and HTML elements,
 * so only load it on web.
 */

let LocationPathMap:
  | React.ComponentType<{
      pings: LocationPing[];
    }>
  | null = null;

if (
  Platform.OS === 'web'
) {
  try {
    LocationPathMap =
      require('@/src/components/LocationPathMap')
        .LocationPathMap;
  } catch (error) {
    console.warn(
      'Could not load LocationPathMap:',
      error
    );
  }
}

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type Filter =
  | 'today'
  | 'week'
  | 'month';

type Sale = {
  id: string;
  name: string;
  code: string;
};

type Visit = {
  id: string;
  salesId: string;
  date: string;
  time: string;
  store: string;
  storeCode:
    | string
    | null;
  order: boolean;
  distance: number;
  latitude:
    | number
    | null;
  longitude:
    | number
    | null;
  status:
    | string
    | null;
};

type AttendanceRow = {
  id: string;
  sales_id: string;
  store_id:
    | string
    | null;
  latitude:
    | number
    | null;
  longitude:
    | number
    | null;
  distance_meters:
    | number
    | null;
  created_at:
    | string
    | null;
  status:
    | string
    | null;
};

type StoreRow = {
  id: string;
  name:
    | string
    | null;
  store_code:
    | string
    | null;
};

type SalesRow = {
  id: string;
  name:
    | string
    | null;
  sales_code:
    | string
    | null;
};

type SpinRow = {
  id: string;
  attendance_id:
    | string
    | null;
};

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function formatDateKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function getTodayKey(): string {
  return formatDateKey(
    new Date()
  );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      weekday:
        'long',
      day:
        'numeric',
      month:
        'short',
      year:
        'numeric',
    }
  );
}

function dayName(
  value: string
): string {
  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      weekday:
        'short',
    }
  );
}

function dayNum(
  value: string
): string {
  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      day:
        'numeric',
    }
  );
}

function monthName(
  value: string
): string {
  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      month:
        'short',
    }
  );
}

function formatTime(
  value:
    | string
    | null
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleTimeString(
    'en-US',
    {
      hour:
        '2-digit',
      minute:
        '2-digit',
    }
  );
}

/*
 * ============================================================
 * PERIOD
 * ============================================================
 */

function getPeriodStart(
  filter: Filter
): Date {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  if (
    filter === 'today'
  ) {
    return today;
  }

  if (
    filter === 'week'
  ) {
    const start =
      new Date(
        today
      );

    start.setDate(
      start.getDate() -
        6
    );

    return start;
  }

  const start =
    new Date(
      today
    );

  start.setDate(
    start.getDate() -
      29
  );

  return start;
}

function getPeriodEnd(): Date {
  const today =
    new Date();

  today.setHours(
    23,
    59,
    59,
    999
  );

  return today;
}

/*
 * ============================================================
 * DISTANCE
 * ============================================================
 */

function averageGpsDistance(
  visits: Visit[]
): number {
  if (
    visits.length ===
    0
  ) {
    return 0;
  }

  const total =
    visits.reduce(
      (
        sum,
        visit
      ) =>
        sum +
        visit.distance,
      0
    );

  return (
    total /
    visits.length
  );
}

/*
 * ============================================================
 * LOAD SALES
 * ============================================================
 */

async function loadSales(): Promise<Sale[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from('sales')
      .select(
        `
        id,
        name,
        sales_code
        `
      )
      .order(
        'name',
        {
          ascending:
            true,
        }
      );

  if (
    error
  ) {
    throw new Error(
      `Could not load sales team: ${error.message}`
    );
  }

  return (
    (data ??
      []) as SalesRow[]
  ).map(
    (
      row
    ) => ({
      id:
        row.id,

      name:
        row.name ??
        'Unnamed Sales',

      code:
        row.sales_code ??
        '—',
    })
  );
}

/*
 * ============================================================
 * LOAD VISITS
 * ============================================================
 */

async function loadVisits(
  salesId: string,
  filter: Filter
): Promise<Visit[]> {
  const start =
    getPeriodStart(
      filter
    );

  const end =
    getPeriodEnd();

  /*
   * ----------------------------------------------------------
   * ATTENDANCE
   * ----------------------------------------------------------
   */

  const {
    data: attendanceData,
    error:
      attendanceError,
  } =
    await supabase
      .from('attendance')
      .select(
        `
        id,
        sales_id,
        store_id,
        latitude,
        longitude,
        distance_meters,
        created_at,
        status
        `
      )
      .eq(
        'sales_id',
        salesId
      )
      .gte(
        'created_at',
        start.toISOString()
      )
      .lte(
        'created_at',
        end.toISOString()
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        }
      );

  if (
    attendanceError
  ) {
    throw new Error(
      `Could not load attendance: ${attendanceError.message}`
    );
  }

  const attendance =
    (attendanceData ??
      []) as AttendanceRow[];

  /*
   * ----------------------------------------------------------
   * STORES
   * ----------------------------------------------------------
   */

  const storeIds =
    Array.from(
      new Set(
        attendance
          .map(
            (
              row
            ) =>
              row.store_id
          )
          .filter(
            (
              id
            ): id is string =>
              typeof id ===
                'string' &&
              id.length >
                0
          )
      )
    );

  const storeMap =
    new Map<
      string,
      StoreRow
    >();

  if (
    storeIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from('stores')
        .select(
          `
          id,
          name,
          store_code
          `
        )
        .in(
          'id',
          storeIds
        );

    if (
      error
    ) {
      throw new Error(
        `Could not load stores: ${error.message}`
      );
    }

    for (
      const store of
        (data ??
          []) as StoreRow[]
    ) {
      storeMap.set(
        store.id,
        store
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * SPINS
   * ----------------------------------------------------------
   */

  const attendanceIds =
    attendance.map(
      (
        row
      ) =>
        row.id
    );

  const orderAttendanceIds =
    new Set<string>();

  if (
    attendanceIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from('spins')
        .select(
          `
          id,
          attendance_id
          `
        )
        .in(
          'attendance_id',
          attendanceIds
        );

    if (
      error
    ) {
      throw new Error(
        `Could not load spin history: ${error.message}`
      );
    }

    for (
      const spin of
        (data ??
          []) as SpinRow[]
    ) {
      if (
        spin.attendance_id
      ) {
        orderAttendanceIds.add(
          spin.attendance_id
        );
      }
    }
  }

  /*
   * ----------------------------------------------------------
   * RESULT
   * ----------------------------------------------------------
   */

  return attendance.map(
    (
      row
    ) => {
      const store =
        row.store_id
          ? storeMap.get(
              row.store_id
            )
          : undefined;

      return {
        id:
          row.id,

        salesId:
          row.sales_id,

        date:
          row.created_at
            ? formatDateKey(
                new Date(
                  row.created_at
                )
              )
            : getTodayKey(),

        time:
          formatTime(
            row.created_at
          ),

        store:
          store?.name ??
          'Unknown Store',

        storeCode:
          store?.store_code ??
          null,

        order:
          orderAttendanceIds.has(
            row.id
          ),

        distance:
          row.distance_meters ??
          0,

        latitude:
          row.latitude,

        longitude:
          row.longitude,

        status:
          row.status ??
          null,
      };
    }
  );
}

/*
 * ============================================================
 * MAIN SCREEN
 * ============================================================
 */

export default function AdminRoutesScreen() {
  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      'today'
    );

  const [
    sales,
    setSales,
  ] =
    useState<Sale[]>(
      []
    );

  const [
    salesId,
    setSalesId,
  ] =
    useState<string | null>(
      null
    );

  const [
    visits,
    setVisits,
  ] =
    useState<Visit[]>(
      []
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      getTodayKey()
    );

  /*
   * MAP STATE
   */

  const [
    locationPings,
    setLocationPings,
  ] =
    useState<
      LocationPing[]
    >([]);

  const [
    loadingMap,
    setLoadingMap,
  ] =
    useState(false);

  const [
    mapError,
    setMapError,
  ] =
    useState<string | null>(
      null
    );

  const [
    mapVisible,
    setMapVisible,
  ] =
    useState(true);

  /*
   * GENERAL STATE
   */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * ==========================================================
   * SELECTED SALESPERSON
   * ==========================================================
   */

  const selectedSales =
    useMemo(
      () =>
        sales.find(
          (
            person
          ) =>
            person.id ===
            salesId
        ) ??
        null,
      [
        sales,
        salesId,
      ]
    );

  /*
   * ==========================================================
   * LOAD LOCATION PATH
   * ==========================================================
   */

  const loadMapPath =
    useCallback(
      async (
        selectedSalesId: string,
        date: string
      ) => {
        /*
         * Your existing map component is web-only.
         *
         * Don't make a Leaflet request on native.
         */

        if (
          Platform.OS !==
          'web'
        ) {
          setLocationPings(
            []
          );

          setMapError(
            'Route map is currently available on the web admin dashboard.'
          );

          return;
        }

        setLoadingMap(
          true
        );

        setMapError(
          null
        );

        try {
          console.log(
            'ADMIN ROUTES: loading location path',
            {
              salesId:
                selectedSalesId,

              date,
            }
          );

          const path =
            await getLocationPath(
              selectedSalesId,
              date
            );

          console.log(
            'ADMIN ROUTES: location pings loaded',
            path.length
          );

          setLocationPings(
            path
          );
        } catch (
          pathError
        ) {
          console.error(
            'ADMIN ROUTES MAP ERROR:',
            pathError
          );

          setLocationPings(
            []
          );

          setMapError(
            pathError instanceof Error
              ? pathError.message
              : 'Could not load location path.'
          );
        } finally {
          setLoadingMap(
            false
          );
        }
      },
      []
    );

  /*
   * ==========================================================
   * LOAD EVERYTHING
   * ==========================================================
   */

  const fetchData =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          setError(
            null
          );

          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          const salesList =
            await loadSales();

          setSales(
            salesList
          );

          if (
            salesList.length ===
            0
          ) {
            setSalesId(
              null
            );

            setVisits(
              []
            );

            setLocationPings(
              []
            );

            return;
          }

          const currentSelection =
            salesId &&
            salesList.some(
              (
                person
              ) =>
                person.id ===
                salesId
            )
              ? salesId
              : salesList[0].id;

          if (
            currentSelection !==
            salesId
          ) {
            setSalesId(
              currentSelection
            );
          }

          const visitRows =
            await loadVisits(
              currentSelection,
              filter
            );

          setVisits(
            visitRows
          );

          const today =
            getTodayKey();

          if (
            filter ===
            'today'
          ) {
            setSelectedDate(
              today
            );
          }

          /*
           * Load today's map.
           */

          await loadMapPath(
            currentSelection,
            filter ===
              'today'
              ? today
              : selectedDate
          );
        } catch (
          fetchError
        ) {
          console.error(
            'ADMIN ROUTES ERROR:',
            fetchError
          );

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Could not load route data.'
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        filter,
        salesId,
        selectedDate,
        loadMapPath,
      ]
    );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    fetchData();
  }, [
    filter,
  ]);

  /*
   * ==========================================================
   * SALESPERSON CHANGE
   * ==========================================================
   */

  useEffect(() => {
    if (
      !salesId
    ) {
      return;
    }

    let cancelled =
      false;

    const run =
      async () => {
        try {
          setLoading(
            true
          );

          const visitRows =
            await loadVisits(
              salesId,
              filter
            );

          if (
            cancelled
          ) {
            return;
          }

          setVisits(
            visitRows
          );

          const today =
            getTodayKey();

          setSelectedDate(
            today
          );

          await loadMapPath(
            salesId,
            filter ===
              'today'
              ? today
              : today
          );
        } catch (
          loadError
        ) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            'ADMIN ROUTES SALESPERSON ERROR:',
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load salesperson route.'
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };

    run();

    return () => {
      cancelled =
        true;
    };
  }, [
    salesId,
  ]);

  /*
   * ==========================================================
   * SELECTED DAY
   * ==========================================================
   */

  const selectedDay =
    useMemo(
      () =>
        visits.filter(
          (
            visit
          ) =>
            visit.date ===
            selectedDate
        ),
      [
        visits,
        selectedDate,
      ]
    );

  /*
   * ==========================================================
   * LOAD MAP WHEN DAY CHANGES
   * ==========================================================
   */

  useEffect(() => {
    if (
      !salesId
    ) {
      return;
    }

    loadMapPath(
      salesId,
      selectedDate
    );
  }, [
    selectedDate,
    salesId,
    loadMapPath,
  ]);

  /*
   * ==========================================================
   * METRICS
   * ==========================================================
   */

  const orders =
    visits.filter(
      (
        visit
      ) =>
        visit.order
    ).length;

  const stores =
    new Set(
      visits.map(
        (
          visit
        ) =>
          visit.store
      )
    ).size;

  const rate =
    visits.length >
    0
      ? Math.round(
          (orders /
            visits.length) *
            100
        )
      : 0;

  const gpsDistance =
    averageGpsDistance(
      visits
    );

  /*
   * ==========================================================
   * WEEK DAYS
   * ==========================================================
   */

  const weekDays =
    useMemo(() => {
      const result: string[] =
        [];

      const today =
        new Date();

      today.setHours(
        12,
        0,
        0,
        0
      );

      for (
        let index = 6;
        index >= 0;
        index--
      ) {
        const date =
          new Date(
            today
          );

        date.setDate(
          date.getDate() -
            index
        );

        result.push(
          formatDateKey(
            date
          )
        );
      }

      return result;
    }, []);

  /*
   * ==========================================================
   * MONTH DAYS
   * ==========================================================
   */

  const monthDays =
    useMemo(
      () =>
        Array.from(
          new Set(
            visits.map(
              (
                visit
              ) =>
                visit.date
            )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b.localeCompare(
              a
            )
        ),
      [
        visits,
      ]
    );

  /*
   * ==========================================================
   * FILTER
   * ==========================================================
   */

  const handleFilter =
    (
      nextFilter: Filter
    ) => {
      setFilter(
        nextFilter
      );

      setSelectedDate(
        getTodayKey()
      );
    };

  /*
   * ==========================================================
   * LOADING SCREEN
   * ==========================================================
   */

  if (
    loading &&
    sales.length ===
      0
  ) {
    return (
      <ScreenContainer
        title="Sales Routes"
        subtitle="Monitor each salesperson's daily route"
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="small"
            color="#2563eb"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading sales routes
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Reading live data from Supabase...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * EMPTY SALES
   * ==========================================================
   */

  if (
    !loading &&
    sales.length ===
      0
  ) {
    return (
      <ScreenContainer
        title="Sales Routes"
        subtitle="Monitor each salesperson's daily route"
      >
        <View
          style={
            styles.emptyRoute
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No sales representatives found
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Add sales representatives to Supabase
            first.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <ScreenContainer
      title="Sales Routes"
      subtitle="Monitor each salesperson's daily route"
    >
      <FlatList
        data={
          filter ===
          'month'
            ? []
            : selectedDay
        }
        keyExtractor={(
          item
        ) =>
          item.id
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              fetchData(
                true
              )
            }
          />
        }
        ListHeaderComponent={
          <>
            {/* =================================================
             * SALESPERSON
             * ================================================= */}

            <View
              style={
                styles.filterCard
              }
            >
              <Text
                style={
                  styles.overline
                }
              >
                SALESPERSON
              </Text>

              <View
                style={
                  styles.salesRow
                }
              >
                {sales.map(
                  (
                    person
                  ) => {
                    const active =
                      person.id ===
                      salesId;

                    return (
                      <Pressable
                        key={
                          person.id
                        }
                        onPress={() =>
                          setSalesId(
                            person.id
                          )
                        }
                        style={[
                          styles.salesChip,
                          active &&
                            styles.salesChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.salesName,
                            active &&
                              styles.salesNameActive,
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {
                            person.name
                          }
                        </Text>

                        <Text
                          style={[
                            styles.salesCode,
                            active &&
                              styles.salesCodeActive,
                          ]}
                        >
                          {
                            person.code
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>

            {/* =================================================
             * PERIOD
             * ================================================= */}

            <View
              style={
                styles.filterCard
              }
            >
              <Text
                style={
                  styles.overline
                }
              >
                PERIOD
              </Text>

              <View
                style={
                  styles.filterRow
                }
              >
                {(
                  [
                    'today',
                    'week',
                    'month',
                  ] as Filter[]
                ).map(
                  (
                    item
                  ) => (
                    <Pressable
                      key={
                        item
                      }
                      onPress={() =>
                        handleFilter(
                          item
                        )
                      }
                      style={[
                        styles.filterButton,
                        filter ===
                          item &&
                          styles.filterButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          filter ===
                            item &&
                            styles.filterTextActive,
                        ]}
                      >
                        {item ===
                        'today'
                          ? 'TODAY'
                          : item ===
                              'week'
                            ? '1 WEEK'
                            : '1 MONTH'}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            {/* =================================================
             * SALES PERSON HEADER
             * ================================================= */}

            <View
              style={
                styles.hero
              }
            >
              <View
                style={
                  styles.heroContent
                }
              >
                <Text
                  style={
                    styles.heroEyebrow
                  }
                >
                  LIVE ROUTE MONITORING
                </Text>

                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  {selectedSales
                    ?.name ??
                    'Sales Team'}
                </Text>

                <Text
                  style={
                    styles.heroText
                  }
                >
                  {selectedSales
                    ?.code ??
                    '—'}{' '}
                  • Sales
                </Text>
              </View>

              <View
                style={
                  styles.live
                }
              >
                <View
                  style={
                    styles.liveDot
                  }
                />

                <Text
                  style={
                    styles.liveText
                  }
                >
                  LIVE
                </Text>
              </View>
            </View>

            {/* =================================================
             * METRICS
             * ================================================= */}

            <View
              style={
                styles.metrics
              }
            >
              <Metric
                value={
                  orders
                }
                label="ORDERS"
              />

              <Metric
                value={
                  stores
                }
                label="STORES"
              />

              <Metric
                value={
                  visits.length
                }
                label="VISITS"
              />

              <Metric
                value={`${rate}%`}
                label="ORDER RATE"
              />
            </View>

            {/* =================================================
             * MAP
             * ================================================= */}

            <View
              style={
                styles.mapSection
              }
            >
              <View
                style={
                  styles.mapHeader
                }
              >
                <View
                  style={
                    styles.mapHeaderContent
                  }
                >
                  <Text
                    style={
                      styles.overline
                    }
                  >
                    GPS ROUTE
                  </Text>

                  <Text
                    style={
                      styles.mapTitle
                    }
                  >
                    {selectedDate ===
                    getTodayKey()
                      ? "Today's movement"
                      : formatDate(
                          selectedDate
                        )}
                  </Text>

                  <Text
                    style={
                      styles.mapSubtitle
                    }
                  >
                    {locationPings.length >
                    0
                      ? `${locationPings.length} GPS points recorded`
                      : 'No GPS path recorded for this date'}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    setMapVisible(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  style={
                    styles.mapToggle
                  }
                >
                  <Text
                    style={
                      styles.mapToggleText
                    }
                  >
                    {mapVisible
                      ? 'HIDE'
                      : 'SHOW'}
                  </Text>
                </Pressable>
              </View>

              {mapVisible ? (
                <View
                  style={
                    styles.mapContainer
                  }
                >
                  {Platform.OS !==
                  'web' ? (
                    <View
                      style={
                        styles.nativeMapMessage
                      }
                    >
                      <View
                        style={
                          styles.nativeMapIcon
                        }
                      >
                        <Text
                          style={
                            styles.nativeMapIconText
                          }
                        >
                          MAP
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.nativeMapTitle
                        }
                      >
                        Route map
                      </Text>

                      <Text
                        style={
                          styles.nativeMapText
                        }
                      >
                        The existing Leaflet map is
                        available on the web admin
                        dashboard.
                      </Text>

                      {locationPings.length >
                      0 ? (
                        <Text
                          style={
                            styles.nativeMapPoints
                          }
                        >
                          {
                            locationPings.length
                          }{' '}
                          GPS points loaded
                        </Text>
                      ) : null}
                    </View>
                  ) : loadingMap ? (
                    <View
                      style={
                        styles.mapLoading
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color="#2563eb"
                      />

                      <Text
                        style={
                          styles.mapLoadingText
                        }
                      >
                        Loading GPS route...
                      </Text>
                    </View>
                  ) : mapError ? (
                    <View
                      style={
                        styles.mapError
                      }
                    >
                      <Text
                        style={
                          styles.mapErrorTitle
                        }
                      >
                        Map unavailable
                      </Text>

                      <Text
                        style={
                          styles.mapErrorText
                        }
                      >
                        {mapError}
                      </Text>

                      <Pressable
                        onPress={() =>
                          salesId &&
                          loadMapPath(
                            salesId,
                            selectedDate
                          )
                        }
                        style={
                          styles.mapRetryButton
                        }
                      >
                        <Text
                          style={
                            styles.mapRetryText
                          }
                        >
                          RETRY
                        </Text>
                      </Pressable>
                    </View>
                  ) : locationPings.length ===
                    0 ? (
                    <View
                      style={
                        styles.mapEmpty
                      }
                    >
                      <View
                        style={
                          styles.mapEmptyIcon
                        }
                      >
                        <Text
                          style={
                            styles.mapEmptyIconText
                          }
                        >
                          GPS
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.mapEmptyTitle
                        }
                      >
                        No location history
                      </Text>

                      <Text
                        style={
                          styles.mapEmptyText
                        }
                      >
                        There are no GPS pings for
                        this salesperson on this date.
                      </Text>
                    </View>
                  ) : LocationPathMap ? (
                    <LocationPathMap
                      pings={
                        locationPings
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.mapEmpty
                      }
                    >
                      <Text
                        style={
                          styles.mapEmptyTitle
                        }
                      >
                        Map component unavailable
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            {/* =================================================
             * GPS SUMMARY
             * ================================================= */}

            {visits.length >
            0 ? (
              <View
                style={
                  styles.gpsSummary
                }
              >
                <View
                  style={
                    styles.gpsIcon
                  }
                >
                  <Text
                    style={
                      styles.gpsIconText
                    }
                  >
                    G
                  </Text>
                </View>

                <View
                  style={
                    styles.gpsSummaryContent
                  }
                >
                  <Text
                    style={
                      styles.gpsSummaryTitle
                    }
                  >
                    Attendance GPS accuracy
                  </Text>

                  <Text
                    style={
                      styles.gpsSummaryText
                    }
                  >
                    Average recorded distance between
                    salesperson GPS and the store.
                  </Text>
                </View>

                <Text
                  style={
                    styles.gpsSummaryValue
                  }
                >
                  {gpsDistance.toFixed(
                    1
                  )}
                  m
                </Text>
              </View>
            ) : null}

            {/* =================================================
             * WEEK
             * ================================================= */}

            {filter ===
            'week' ? (
              <View
                style={
                  styles.dayCard
                }
              >
                <Text
                  style={
                    styles.overline
                  }
                >
                  SELECT A DAY TO VIEW ROUTE
                </Text>

                <View
                  style={
                    styles.days
                  }
                >
                  {weekDays.map(
                    (
                      day
                    ) => {
                      const dayVisits =
                        visits.filter(
                          (
                            visit
                          ) =>
                            visit.date ===
                            day
                        );

                      const active =
                        selectedDate ===
                        day;

                      return (
                        <Pressable
                          key={
                            day
                          }
                          onPress={() => {
                            setSelectedDate(
                              day
                            );
                          }}
                          style={[
                            styles.dayButton,
                            active &&
                              styles.dayButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayName,
                              active &&
                                styles.dayTextActive,
                            ]}
                          >
                            {dayName(
                              day
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.dayNumber,
                              active &&
                                styles.dayTextActive,
                            ]}
                          >
                            {dayNum(
                              day
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.dayMonth,
                              active &&
                                styles.dayTextActive,
                            ]}
                          >
                            {monthName(
                              day
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.dayMeta,
                              active &&
                                styles.dayTextActive,
                            ]}
                          >
                            {
                              dayVisits.length
                            }{' '}
                            visits
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              </View>
            ) : null}

            {/* =================================================
             * MONTH
             * ================================================= */}

            {filter ===
            'month' ? (
              <View
                style={
                  styles.monthCard
                }
              >
                <Text
                  style={
                    styles.overline
                  }
                >
                  LAST 30 DAYS
                </Text>

                {monthDays.length ===
                0 ? (
                  <View
                    style={
                      styles.monthEmpty
                    }
                  >
                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      No visits in the last 30 days
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Recorded visits will appear here
                      automatically.
                    </Text>
                  </View>
                ) : (
                  monthDays.map(
                    (
                      day
                    ) => {
                      const rows =
                        visits.filter(
                          (
                            visit
                          ) =>
                            visit.date ===
                            day
                        );

                      const dayOrders =
                        rows.filter(
                          (
                            visit
                          ) =>
                            visit.order
                        ).length;

                      return (
                        <Pressable
                          key={
                            day
                          }
                          onPress={() => {
                            setSelectedDate(
                              day
                            );

                            setFilter(
                              'week'
                            );
                          }}
                          style={
                            styles.monthRow
                          }
                        >
                          <View>
                            <Text
                              style={
                                styles.monthDay
                              }
                            >
                              {dayName(
                                day
                              )}{' '}
                              {dayNum(
                                day
                              )}{' '}
                              {monthName(
                                day
                              )}
                            </Text>

                            <Text
                              style={
                                styles.monthSub
                              }
                            >
                              {
                                rows.length
                              }{' '}
                              visits •{' '}
                              {
                                dayOrders
                              }{' '}
                              orders
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.arrow
                            }
                          >
                            →
                          </Text>
                        </Pressable>
                      );
                    }
                  )
                )}
              </View>
            ) : null}

            {/* =================================================
             * DAILY ROUTE
             * ================================================= */}

            {filter !==
            'month' ? (
              <View
                style={
                  styles.routeCard
                }
              >
                <View
                  style={
                    styles.routeHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.overline
                      }
                    >
                      DAILY ROUTE
                    </Text>

                    <Text
                      style={
                        styles.routeTitle
                      }
                    >
                      {selectedDate ===
                      getTodayKey()
                        ? 'Today'
                        : formatDate(
                            selectedDate
                          )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.routeHeaderBadge
                    }
                  >
                    <Text
                      style={
                        styles.routeHeaderBadgeText
                      }
                    >
                      {
                        selectedDay.length
                      }{' '}
                      STOPS
                    </Text>
                  </View>
                </View>

                {selectedDay.length ===
                0 ? (
                  <View
                    style={
                      styles.emptyRoute
                    }
                  >
                    <View
                      style={
                        styles.emptyRouteIcon
                      }
                    >
                      <Text
                        style={
                          styles.emptyRouteIconText
                        }
                      >
                        —
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      No visits recorded
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      There is no attendance data for
                      this salesperson on this date.
                    </Text>
                  </View>
                ) : (
                  <>
                    <RouteStart />

                    {selectedDay.map(
                      (
                        visit,
                        index
                      ) => (
                        <RouteVisit
                          key={
                            visit.id
                          }
                          visit={
                            visit
                          }
                          last={
                            index ===
                            selectedDay.length -
                              1
                          }
                        />
                      )
                    )}

                    <RouteEnd
                      count={
                        selectedDay.length
                      }
                    />
                  </>
                )}
              </View>
            ) : null}

            {/* =================================================
             * LIST TITLE
             * ================================================= */}

            {filter !==
            'month' ? (
              <Text
                style={
                  styles.listTitle
                }
              >
                {
                  selectedDay.length
                }{' '}
                VISITS •{' '}
                {selectedDate ===
                getTodayKey()
                  ? 'TODAY'
                  : formatDate(
                      selectedDate
                    ).toUpperCase()}
              </Text>
            ) : null}
          </>
        }
        renderItem={({
          item,
        }) => (
          <VisitRow
            visit={
              item
            }
          />
        )}
      />
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * METRIC
 * ============================================================
 */

function Metric({
  value,
  label,
}: {
  value:
    | string
    | number;
  label: string;
}) {
  return (
    <View
      style={
        styles.metric
      }
    >
      <Text
        style={
          styles.metricValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * ROUTE START
 * ============================================================
 */

function RouteStart() {
  return (
    <View
      style={
        styles.routeItem
      }
    >
      <View
        style={
          styles.timeline
        }
      >
        <View
          style={[
            styles.dot,
            styles.edgeDot,
          ]}
        />

        <View
          style={
            styles.line
          }
        />
      </View>

      <View
        style={
          styles.routeInfo
        }
      >
        <View
          style={
            styles.routeTop
          }
        >
          <View
            style={
              styles.routeName
            }
          >
            <Text
              style={
                styles.routePoint
              }
            >
              Start Shift
            </Text>
          </View>

          <Text
            style={
              styles.time
            }
          >
            —
          </Text>
        </View>

        <Text
          style={
            styles.duration
          }
        >
          First recorded location appears below.
        </Text>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * ROUTE VISIT
 * ============================================================
 */

function RouteVisit({
  visit,
  last,
}: {
  visit: Visit;
  last: boolean;
}) {
  return (
    <View
      style={
        styles.routeItem
      }
    >
      <View
        style={
          styles.timeline
        }
      >
        <View
          style={[
            styles.dot,
            visit.order &&
              styles.orderDot,
          ]}
        />

        {!last ? (
          <View
            style={
              styles.line
            }
          />
        ) : null}
      </View>

      <View
        style={
          styles.routeInfo
        }
      >
        <View
          style={
            styles.routeTop
          }
        >
          <View
            style={
              styles.routeName
            }
          >
            <Text
              style={
                styles.routePoint
              }
              numberOfLines={
                2
              }
            >
              {
                visit.store
              }
            </Text>

            {visit.storeCode ? (
              <Text
                style={
                  styles.routeStoreCode
                }
              >
                {
                  visit.storeCode
                }
              </Text>
            ) : null}
          </View>

          <Text
            style={
              styles.time
            }
          >
            {
              visit.time
            }
          </Text>
        </View>

        <View
          style={
            styles.routeMetaRow
          }
        >
          <Text
            style={
              styles.routeMeta
            }
          >
            {visit.order
              ? 'Order recorded'
              : 'Visit recorded'}
          </Text>

          <View
            style={[
              styles.routeStatusBadge,
              visit.order
                ? styles.routeStatusBadgeYes
                : styles.routeStatusBadgeNo,
            ]}
          >
            <Text
              style={[
                styles.routeStatusText,
                visit.order
                  ? styles.routeStatusTextYes
                  : styles.routeStatusTextNo,
              ]}
            >
              {visit.order
                ? 'ORDER'
                : 'VISIT'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * ROUTE END
 * ============================================================
 */

function RouteEnd({
  count,
}: {
  count: number;
}) {
  return (
    <View
      style={
        styles.routeItem
      }
    >
      <View
        style={
          styles.timeline
        }
      >
        <View
          style={[
            styles.dot,
            styles.edgeDot,
          ]}
        />
      </View>

      <View
        style={
          styles.routeInfo
        }
      >
        <Text
          style={
            styles.routePoint
          }
        >
          End Route
        </Text>

        <Text
          style={
            styles.duration
          }
        >
          {count} recorded stop
          {count === 1
            ? ''
            : 's'}
        </Text>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * VISIT ROW
 * ============================================================
 */

function VisitRow({
  visit,
}: {
  visit: Visit;
}) {
  return (
    <View
      style={
        styles.visit
      }
    >
      <View
        style={
          styles.visitTop
        }
      >
        <View
          style={
            styles.icon
          }
        >
          <Text>
            🏪
          </Text>
        </View>

        <View
          style={
            styles.visitMain
          }
        >
          <Text
            style={
              styles.store
            }
          >
            {
              visit.store
            }
          </Text>

          <Text
            style={
              styles.visitDate
            }
          >
            {formatDate(
              visit.date
            )}{' '}
            • {visit.time}
          </Text>

          {visit.storeCode ? (
            <Text
              style={
                styles.storeCode
              }
            >
              {
                visit.storeCode
              }
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.badge,
            visit.order
              ? styles.badgeYes
              : styles.badgeNo,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              visit.order
                ? styles.badgeTextYes
                : styles.badgeTextNo,
            ]}
          >
            {visit.order
              ? 'ORDER'
              : 'NO ORDER'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.divider
        }
      />

      <View
        style={
          styles.statRow
        }
      >
        <Text
          style={
            styles.statText
          }
        >
          GPS DIST.{' '}
          {visit.distance.toFixed(
            1
          )}
          m
        </Text>

        <Text
          style={
            styles.statText
          }
        >
          {visit.status ??
            'RECORDED'}
        </Text>

        <Text
          style={
            styles.statText
          }
        >
          {visit.latitude !==
            null &&
          visit.longitude !==
            null
            ? 'GPS VERIFIED'
            : 'NO GPS'}
        </Text>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    content: {
      paddingBottom:
        32,
    },

    /*
     * FILTER
     */

    filterCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      padding: 12,
      marginBottom: 12,
    },

    overline: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#94a3b8',
      letterSpacing:
        1.2,
      marginBottom: 8,
    },

    salesRow: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 7,
    },

    salesChip: {
      width:
        '31.7%',
      minHeight: 54,
      borderRadius: 12,
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      padding: 8,
      justifyContent:
        'center',
    },

    salesChipActive: {
      backgroundColor:
        '#111827',
      borderColor:
        '#111827',
    },

    salesName: {
      fontSize: 9,
      fontWeight:
        '900',
      color:
        '#334155',
    },

    salesNameActive: {
      color:
        '#ffffff',
    },

    salesCode: {
      fontSize: 7,
      color:
        '#94a3b8',
      marginTop: 2,
    },

    salesCodeActive: {
      color:
        '#93c5fd',
    },

    filterRow: {
      flexDirection:
        'row',
      gap: 7,
    },

    filterButton: {
      flex: 1,
      minHeight: 38,
      borderRadius: 11,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#f1f5f9',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    filterButtonActive: {
      backgroundColor:
        '#2563eb',
      borderColor:
        '#2563eb',
    },

    filterText: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#64748b',
    },

    filterTextActive: {
      color:
        '#ffffff',
    },

    /*
     * HERO
     */

    hero: {
      backgroundColor:
        '#111827',
      borderRadius: 20,
      padding: 17,
      marginBottom: 12,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    heroContent: {
      flex: 1,
      paddingRight: 10,
    },

    heroEyebrow: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#60a5fa',
      letterSpacing:
        1.2,
      marginBottom: 4,
    },

    heroTitle: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#ffffff',
    },

    heroText: {
      fontSize: 9,
      color:
        '#94a3b8',
      marginTop: 3,
    },

    live: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor:
        '#1e293b',
    },

    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        '#34d399',
      marginRight: 5,
    },

    liveText: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#86efac',
    },

    /*
     * METRICS
     */

    metrics: {
      flexDirection:
        'row',
      gap: 8,
      marginBottom: 12,
    },

    metric: {
      flex: 1,
      minHeight: 72,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 15,
      padding: 10,
      justifyContent:
        'center',
    },

    metricValue: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#111827',
    },

    metricLabel: {
      fontSize: 7,
      fontWeight:
        '800',
      color:
        '#94a3b8',
      marginTop: 3,
    },

    /*
     * MAP
     */

    mapSection: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 19,
      overflow:
        'hidden',
      marginBottom: 14,
    },

    mapHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        '#f1f5f9',
    },

    mapHeaderContent: {
      flex: 1,
    },

    mapTitle: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        '#111827',
    },

    mapSubtitle: {
      fontSize: 8,
      color:
        '#94a3b8',
      marginTop: 3,
    },

    mapToggle: {
      backgroundColor:
        '#f1f5f9',
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginLeft: 8,
    },

    mapToggleText: {
      fontSize: 6.5,
      fontWeight:
        '900',
      color:
        '#475569',
      letterSpacing:
        0.5,
    },

    mapContainer: {
      minHeight: 320,
      backgroundColor:
        '#f1f5f9',
    },

    mapLoading: {
      height: 320,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    mapLoadingText: {
      fontSize: 9,
      color:
        '#64748b',
      marginTop: 8,
    },

    mapError: {
      minHeight: 320,
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 25,
    },

    mapErrorTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#991b1b',
      marginBottom: 4,
    },

    mapErrorText: {
      fontSize: 8,
      lineHeight: 13,
      color:
        '#b91c1c',
      textAlign:
        'center',
      maxWidth: 300,
    },

    mapRetryButton: {
      backgroundColor:
        '#991b1b',
      borderRadius: 8,
      paddingHorizontal: 11,
      paddingVertical: 7,
      marginTop: 10,
    },

    mapRetryText: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#ffffff',
    },

    mapEmpty: {
      minHeight: 320,
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 25,
    },

    mapEmptyIcon: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        '#ffffff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 10,
    },

    mapEmptyIconText: {
      fontSize: 9,
      fontWeight:
        '900',
      color:
        '#94a3b8',
    },

    mapEmptyTitle: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 4,
    },

    mapEmptyText: {
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
      textAlign:
        'center',
      maxWidth: 280,
    },

    /*
     * NATIVE MAP MESSAGE
     */

    nativeMapMessage: {
      minHeight: 320,
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 25,
    },

    nativeMapIcon: {
      width: 55,
      height: 55,
      borderRadius: 17,
      backgroundColor:
        '#ffffff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 10,
    },

    nativeMapIconText: {
      fontSize: 9,
      fontWeight:
        '900',
      color:
        '#2563eb',
    },

    nativeMapTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 4,
    },

    nativeMapText: {
      fontSize: 8,
      lineHeight: 13,
      color:
        '#94a3b8',
      textAlign:
        'center',
      maxWidth: 280,
    },

    nativeMapPoints: {
      fontSize: 8,
      fontWeight:
        '800',
      color:
        '#2563eb',
      marginTop: 8,
    },

    /*
     * GPS SUMMARY
     */

    gpsSummary: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 15,
      padding: 10,
      marginBottom: 14,
    },

    gpsIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        '#ecfeff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    gpsIconText: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#0891b2',
    },

    gpsSummaryContent: {
      flex: 1,
      paddingRight: 7,
    },

    gpsSummaryTitle: {
      fontSize: 9,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 2,
    },

    gpsSummaryText: {
      fontSize: 7,
      lineHeight: 11,
      color:
        '#94a3b8',
    },

    gpsSummaryValue: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#0891b2',
    },

    /*
     * DAYS
     */

    dayCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      padding: 12,
      marginBottom: 14,
    },

    days: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 6,
    },

    dayButton: {
      width:
        '31%',
      minHeight: 78,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      backgroundColor:
        '#f8fafc',
      padding: 8,
    },

    dayButtonActive: {
      backgroundColor:
        '#111827',
      borderColor:
        '#111827',
    },

    dayName: {
      fontSize: 7.5,
      fontWeight:
        '900',
      color:
        '#64748b',
    },

    dayNumber: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        '#111827',
      marginTop: 1,
    },

    dayMonth: {
      fontSize: 7,
      color:
        '#94a3b8',
    },

    dayMeta: {
      fontSize: 7,
      fontWeight:
        '800',
      color:
        '#475569',
      marginTop: 5,
    },

    dayTextActive: {
      color:
        '#ffffff',
    },

    /*
     * MONTH
     */

    monthCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      padding: 14,
      marginBottom: 14,
    },

    monthRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor:
        '#f1f5f9',
    },

    monthDay: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#1e293b',
    },

    monthSub: {
      fontSize: 7.5,
      color:
        '#94a3b8',
      marginTop: 3,
    },

    arrow: {
      fontSize: 17,
      color:
        '#94a3b8',
      fontWeight:
        '800',
    },

    /*
     * ROUTE
     */

    routeCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 18,
      padding: 15,
      marginBottom: 15,
    },

    routeHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 14,
    },

    routeTitle: {
      fontSize: 16,
      fontWeight:
        '900',
      color:
        '#111827',
    },

    routeHeaderBadge: {
      backgroundColor:
        '#eff6ff',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    routeHeaderBadgeText: {
      fontSize: 6.5,
      fontWeight:
        '900',
      color:
        '#2563eb',
    },

    routeItem: {
      flexDirection:
        'row',
      minHeight: 52,
    },

    timeline: {
      width: 23,
      alignItems:
        'center',
    },

    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        '#2563eb',
      marginTop: 4,
      zIndex: 2,
    },

    orderDot: {
      backgroundColor:
        '#16a34a',
    },

    edgeDot: {
      backgroundColor:
        '#111827',
    },

    line: {
      position:
        'absolute',
      top: 13,
      bottom: -3,
      width: 2,
      backgroundColor:
        '#dbeafe',
    },

    routeInfo: {
      flex: 1,
      paddingLeft: 8,
      paddingBottom: 12,
    },

    routeTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    routeName: {
      flex: 1,
      paddingRight: 8,
    },

    routePoint: {
      fontSize: 10.5,
      fontWeight:
        '800',
      color:
        '#1e293b',
    },

    routeStoreCode: {
      fontSize: 7,
      color:
        '#94a3b8',
      marginTop: 2,
    },

    routeMetaRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 4,
    },

    routeMeta: {
      fontSize: 8,
      color:
        '#94a3b8',
      marginRight: 6,
    },

    routeStatusBadge: {
      borderRadius:
        999,
      paddingHorizontal:
        5,
      paddingVertical:
        3,
    },

    routeStatusBadgeYes: {
      backgroundColor:
        '#dcfce7',
    },

    routeStatusBadgeNo: {
      backgroundColor:
        '#f1f5f9',
    },

    routeStatusText: {
      fontSize: 5.5,
      fontWeight:
        '900',
      letterSpacing:
        0.5,
    },

    routeStatusTextYes: {
      color:
        '#15803d',
    },

    routeStatusTextNo: {
      color:
        '#64748b',
    },

    time: {
      fontSize: 9.5,
      fontWeight:
        '900',
      color:
        '#64748b',
    },

    duration: {
      fontSize: 8,
      color:
        '#94a3b8',
      marginTop: 2,
    },

    /*
     * LIST
     */

    listTitle: {
      fontSize: 8.5,
      fontWeight:
        '900',
      color:
        '#94a3b8',
      letterSpacing:
        1.2,
      marginBottom: 8,
    },

    visit: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 16,
      padding: 13,
      marginBottom: 9,
    },

    visitTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    icon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        '#f1f5f9',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    visitMain: {
      flex: 1,
    },

    store: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#111827',
    },

    visitDate: {
      fontSize: 8,
      color:
        '#94a3b8',
      marginTop: 2,
    },

    storeCode: {
      fontSize: 7,
      color:
        '#c0c5ce',
      marginTop: 2,
    },

    badge: {
      borderRadius:
        999,
      paddingHorizontal:
        7,
      paddingVertical:
        5,
    },

    badgeYes: {
      backgroundColor:
        '#dcfce7',
    },

    badgeNo: {
      backgroundColor:
        '#f1f5f9',
    },

    badgeText: {
      fontSize: 6.8,
      fontWeight:
        '900',
    },

    badgeTextYes: {
      color:
        '#15803d',
    },

    badgeTextNo: {
      color:
        '#64748b',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#f1f5f9',
      marginVertical: 10,
    },

    statRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },

    statText: {
      fontSize: 6.5,
      fontWeight:
        '800',
      color:
        '#64748b',
    },

    /*
     * EMPTY
     */

    emptySales: {
      paddingVertical: 10,
    },

    emptyRoute: {
      alignItems:
        'center',
      paddingVertical: 25,
    },

    emptyRouteIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        '#f8fafc',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 8,
    },

    emptyRouteIconText: {
      fontSize: 18,
      color:
        '#94a3b8',
    },

    monthEmpty: {
      paddingVertical: 20,
      alignItems:
        'center',
    },

    emptyTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#334155',
      textAlign:
        'center',
    },

    emptyText: {
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
      textAlign:
        'center',
      marginTop: 4,
    },

    /*
     * LOADING
     */

    loadingContainer: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 80,
    },

    loadingTitle: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        '#111827',
      marginTop: 14,
      marginBottom: 3,
    },

    loadingText: {
      fontSize: 9,
      color:
        '#94a3b8',
      textAlign:
        'center',
    },
  });