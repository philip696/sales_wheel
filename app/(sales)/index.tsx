// app/(sales)/index.tsx

import { router } from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';

import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useAuth } from '@/src/features/auth/useAuth';

import { supabase } from '@/src/lib/supabase';

import {
  getRewardMode,
} from '@/src/services/rewardService';

/*
 * ============================================================
 * CONFIG
 * ============================================================
 *
 * No fake dashboard data.
 *
 * Everything below is read from Supabase.
 */

const REFRESH_INTERVAL = 30000;

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type RouteVisit = {
  id: string;

  storeId: string | null;

  storeName: string;

  storeCode: string | null;

  time: string;

  orderPlaced: boolean;

  latitude: number | null;

  longitude: number | null;

  status: string | null;
};

type SalesDashboardData = {
  visits: RouteVisit[];

  totalPlannedStops: number;

  source: 'backend';
};

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function getDateKey(
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
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

/*
 * ============================================================
 * LOAD SALES DASHBOARD
 * ============================================================
 */

async function loadBackendDashboard(
  userId: string
): Promise<SalesDashboardData> {
  /*
   * ----------------------------------------------------------
   * SALES PROFILE
   * ----------------------------------------------------------
   */

  const {
    data: sales,
    error: salesError,
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
      .eq(
        'id',
        userId
      )
      .maybeSingle();

  if (
    salesError
  ) {
    throw new Error(
      `Could not load sales profile: ${salesError.message}`
    );
  }

  if (
    !sales
  ) {
    throw new Error(
      'Sales profile not found for this account.'
    );
  }

  /*
   * ----------------------------------------------------------
   * TODAY
   * ----------------------------------------------------------
   */

  const now =
    new Date();

  const startOfDay =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

  const endOfDay =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

  /*
   * ----------------------------------------------------------
   * ATTENDANCE
   * ----------------------------------------------------------
   */

  const {
    data: attendance,
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
        status,
        order_confirmed,
        created_at
        `
      )
      .eq(
        'sales_id',
        sales.id
      )
      .gte(
        'created_at',
        startOfDay.toISOString()
      )
      .lte(
        'created_at',
        endOfDay.toISOString()
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
      `Could not load today's visits: ${attendanceError.message}`
    );
  }

  /*
   * ----------------------------------------------------------
   * STORE DATA
   * ----------------------------------------------------------
   */

  const attendanceRows =
    attendance ?? [];

  const storeIds =
    Array.from(
      new Set(
        attendanceRows
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
      {
        name: string;
        storeCode:
          | string
          | null;
      }
    >();

  if (
    storeIds.length >
    0
  ) {
    const {
      data: stores,
      error:
        storesError,
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
      storesError
    ) {
      throw new Error(
        `Could not load stores: ${storesError.message}`
      );
    }

    for (
      const store of
        stores ?? []
    ) {
      storeMap.set(
        store.id,
        {
          name:
            store.name ??
            'Unknown Store',

          storeCode:
            store.store_code ??
            null,
        }
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * ORDERS
   * ----------------------------------------------------------
   *
   * "Order" means attendance.order_confirmed === true -- not
   * whether a spin exists for that visit. A visit can be
   * order_confirmed without ever reaching the spin step, so
   * this reads the flag directly off today's attendance rows
   * instead of joining through spins.attendance_id.
   */

  const orderAttendanceIds =
    new Set<string>(
      attendanceRows
        .filter(
          (
            row
          ) =>
            row.order_confirmed ===
            true
        )
        .map(
          (
            row
          ) =>
            row.id
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
    );

  /*
   * ----------------------------------------------------------
   * BUILD VISITS
   * ----------------------------------------------------------
   */

  const visits:
    RouteVisit[] =
    attendanceRows.map(
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

          storeId:
            row.store_id ??
            null,

          storeName:
            store?.name ??
            'Unknown Store',

          storeCode:
            store?.storeCode ??
            null,

          time:
            formatTime(
              row.created_at
            ),

          orderPlaced:
            orderAttendanceIds.has(
              row.id
            ),

          latitude:
            row.latitude,

          longitude:
            row.longitude,

          status:
            row.status ??
            null,

          /*
           * This is the attendance GPS/store distance if your
           * current query exposes it later.
           *
           * For now we keep the dashboard focused on actual
           * attendance/order data.
           */
        } as RouteVisit;
      }
    );

  /*
   * ----------------------------------------------------------
   * RETURN
   * ----------------------------------------------------------
   *
   * The current database does not contain a route-planning
   * table in this screen, so the planned stop count is the
   * number of actual visits recorded today.
   */

  return {
    visits,

    totalPlannedStops:
      visits.length,

    source:
      'backend',
  };
}

/*
 * ============================================================
 * SALES HOME
 * ============================================================
 */

export default function SalesHomeScreen() {
  const {
    profile,
    signOut,
  } =
    useAuth();

  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
  } =
    useAttendanceFlow();

  /*
   * ==========================================================
   * REWARD MODE
   * ==========================================================
   */

  const [
    rewardEnabled,
    setRewardEnabled,
  ] =
    useState(true);

  const [
    rewardModeLoading,
    setRewardModeLoading,
  ] =
    useState(true);

  /*
   * ==========================================================
   * DASHBOARD
   * ==========================================================
   */

  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      SalesDashboardData | null
    >(null);

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
   * ROLE REDIRECT
   * ==========================================================
   */

  useEffect(() => {
    if (
      profile?.role ===
      'admin'
    ) {
      router.replace(
        '/admin'
      );
    }
  }, [
    profile?.role,
  ]);

  /*
   * ==========================================================
   * LOAD REWARD MODE
   * ==========================================================
   */

  const loadRewardMode =
    useCallback(
      async () => {
        try {
          setRewardModeLoading(
            true
          );

          const mode =
            await getRewardMode();

          setRewardEnabled(
            mode.enabled
          );
        } catch (
          rewardError
        ) {
          console.warn(
            'SALES HOME REWARD MODE ERROR:',
            rewardError
          );

          /*
           * Keep the sales screen usable if the reward event
           * cannot be loaded.
           */
          setRewardEnabled(
            true
          );
        } finally {
          setRewardModeLoading(
            false
          );
        }
      },
      []
    );

  /*
   * ==========================================================
   * LOAD DASHBOARD
   * ==========================================================
   */

  const loadDashboard =
    useCallback(
      async (
        isRefresh = false
      ) => {
        if (
          !profile?.id
        ) {
          return;
        }

        try {
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

          setError(
            null
          );

          const data =
            await loadBackendDashboard(
              profile.id
            );

          setDashboard(
            data
          );
        } catch (
          dashboardError
        ) {
          console.error(
            'SALES HOME DASHBOARD ERROR:',
            dashboardError
          );

          setDashboard(
            null
          );

          setError(
            dashboardError instanceof Error
              ? dashboardError.message
              : 'Could not load your dashboard.'
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
        profile?.id,
      ]
    );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    if (
      !profile?.id
    ) {
      return;
    }

    loadDashboard();

    loadRewardMode();
  }, [
    profile?.id,
    loadDashboard,
    loadRewardMode,
  ]);

  /*
   * ==========================================================
   * AUTO REFRESH
   * ==========================================================
   */

  useEffect(() => {
    const interval =
      setInterval(
        () => {
          loadDashboard(
            true
          );

          loadRewardMode();
        },
        REFRESH_INTERVAL
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    loadDashboard,
    loadRewardMode,
  ]);

  /*
   * ==========================================================
   * FIRST NAME
   * ==========================================================
   */

  const firstName =
    useMemo(() => {
      const name =
        profile?.name?.trim();

      if (
        !name
      ) {
        return 'Sales';
      }

      return name.split(
        ' '
      )[0];
    }, [
      profile?.name,
    ]);

  /*
   * ==========================================================
   * DASHBOARD VALUES
   * ==========================================================
   */

  const visits =
    dashboard?.visits ??
    [];

  const totalStops =
    dashboard?.totalPlannedStops ??
    0;

  const visitCount =
    visits.length;

  const orderCount =
    visits.filter(
      (
        visit
      ) =>
        visit.orderPlaced
    ).length;

  const conversionRate =
    visitCount >
    0
      ? (
          (orderCount /
            visitCount) *
          100
        ).toFixed(1)
      : '0.0';

  const remainingStops =
    Math.max(
      totalStops -
        visitCount,
      0
    );

  const selectedDate =
    getDateKey(
      new Date()
    );

  const routeVisits =
    visits.filter(
      (
        visit
      ) =>
        visit.storeName
    );

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    !profile ||
    loading &&
      !dashboard
  ) {
    return (
      <ScreenContainer
        title={
          profile
            ? `Hi, ${firstName}`
            : 'Loading...'
        }
        subtitle={
          profile
            ? 'Your sales activity at a glance'
            : 'Preparing your dashboard'
        }
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
            Loading your sales dashboard
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
   * ADMIN
   * ==========================================================
   */

  if (
    profile.role ===
    'admin'
  ) {
    return (
      <ScreenContainer
        title="Admin"
        subtitle="Opening dashboard..."
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
            Opening Admin Dashboard
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Redirecting...
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
      title={`Hi, ${firstName}`}
      subtitle="Your sales activity at a glance"
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              loadDashboard(
                true
              );

              loadRewardMode();
            }}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >
        {/* ====================================================
         * HERO
         * ==================================================== */}

        <View
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroTopRow
            }
          >
            <View
              style={
                styles.heroText
              }
            >
              <Text
                style={
                  styles.heroEyebrow
                }
              >
                TODAY
              </Text>

              <Text
                style={
                  styles.heroTitle
                }
              >
                Ready to make a visit?
              </Text>

              <Text
                style={
                  styles.heroSubtitle
                }
              >
                Check in at a store and{' '}
                {rewardEnabled
                  ? "unlock today's reward."
                  : "record today's order."}
              </Text>
            </View>

            <View
              style={
                styles.heroOrb
              }
            >
              <View
                style={
                  styles.heroOrbInner
                }
              >
                <Text
                  style={
                    styles.heroOrbText
                  }
                >
                  S
                </Text>
              </View>
            </View>
          </View>

          <View
            style={
              styles.heroDivider
            }
          />

          <View
            style={
              styles.heroBottom
            }
          >
            <View>
              <Text
                style={
                  styles.heroSmallLabel
                }
              >
                CURRENT STATUS
              </Text>

              <Text
                style={
                  styles.heroStatus
                }
              >
                {spinCompleted
                  ? 'Reward completed'
                  : lastSubmission
                    ? orderPlaced
                      ? 'Order recorded'
                      : 'Visit completed'
                    : 'Ready for attendance'}
              </Text>
            </View>

            <View
              style={[
                styles.statusDot,
                spinCompleted
                  ? styles.statusDotComplete
                  : lastSubmission
                    ? styles.statusDotActive
                    : styles.statusDotReady,
              ]}
            />
          </View>
        </View>

        {/* ====================================================
         * REWARD STATUS
         * ==================================================== */}

        {!rewardModeLoading ? (
          <View
            style={[
              styles.rewardBanner,
              rewardEnabled
                ? styles.rewardBannerOn
                : styles.rewardBannerOff,
            ]}
          >
            <View
              style={[
                styles.rewardBannerIcon,
                rewardEnabled
                  ? styles.rewardBannerIconOn
                  : styles.rewardBannerIconOff,
              ]}
            >
              <Text
                style={[
                  styles.rewardBannerIconText,
                  rewardEnabled
                    ? styles.rewardBannerIconTextOn
                    : styles.rewardBannerIconTextOff,
                ]}
              >
                {rewardEnabled
                  ? '✓'
                  : '—'}
              </Text>
            </View>

            <View
              style={
                styles.rewardBannerContent
              }
            >
              <Text
                style={[
                  styles.rewardBannerTitle,
                  rewardEnabled
                    ? styles.rewardBannerTitleOn
                    : styles.rewardBannerTitleOff,
                ]}
              >
                {rewardEnabled
                  ? 'REWARD SYSTEM ACTIVE'
                  : 'REWARD SYSTEM PAUSED'}
              </Text>

              <Text
                style={
                  styles.rewardBannerText
                }
              >
                {rewardEnabled
                  ? 'Orders can continue to the Spin Wheel.'
                  : 'Orders are still recorded, but the reward step is skipped.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ====================================================
         * TODAY'S PROGRESS
         * ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              TODAY'S PROGRESS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Field activity
            </Text>
          </View>

          <View
            style={
              styles.liveBadge
            }
          >
            <View
              style={
                styles.liveBadgeDot
              }
            />

            <Text
              style={
                styles.liveBadgeText
              }
            >
              LIVE
            </Text>
          </View>
        </View>

        <View
          style={
            styles.progressCard
          }
        >
          <View
            style={
              styles.progressTop
            }
          >
            <View>
              <Text
                style={
                  styles.progressLabel
                }
              >
                STORE VISITS
              </Text>

              <View
                style={
                  styles.progressCountRow
                }
              >
                <Text
                  style={
                    styles.progressCount
                  }
                >
                  {
                    visitCount
                  }
                </Text>

                <Text
                  style={
                    styles.progressTotal
                  }
                >
                  {' '}
                  / {totalStops}
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.progressPercent
              }
            >
              {totalStops >
              0
                ? Math.round(
                    (visitCount /
                      totalStops) *
                      100
                  )
                : 0}
              %
            </Text>
          </View>

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    totalStops >
                    0
                      ? Math.min(
                          (visitCount /
                            totalStops) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.progressBottom
            }
          >
            <View
              style={
                styles.progressStat
              }
            >
              <Text
                style={
                  styles.progressStatValue
                }
              >
                {
                  orderCount
                }
              </Text>

              <Text
                style={
                  styles.progressStatLabel
                }
              >
                ORDERS
              </Text>
            </View>

            <View
              style={
                styles.progressStat
              }
            >
              <Text
                style={
                  styles.progressStatValue
                }
              >
                {
                  conversionRate
                }
                %
              </Text>

              <Text
                style={
                  styles.progressStatLabel
                }
              >
                CONVERSION
              </Text>
            </View>

            <View
              style={
                styles.progressStat
              }
            >
              <Text
                style={
                  styles.progressStatValue
                }
              >
                {
                  remainingStops
                }
              </Text>

              <Text
                style={
                  styles.progressStatLabel
                }
              >
                REMAINING
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
         * QUICK ACTIONS
         * ==================================================== */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          QUICK ACTIONS
        </Text>

        <View
          style={
            styles.actionGrid
          }
        >
          {/* CHECK IN */}

          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed &&
                styles.pressed,
            ]}
            onPress={() =>
              router.push(
                '/(sales)/stores'
              )
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.actionIconBlue,
              ]}
            >
              <Text
                style={
                  styles.actionIconText
                }
              >
                +
              </Text>
            </View>

            <Text
              style={
                styles.actionTitle
              }
            >
              Check In
            </Text>

            <Text
              style={
                styles.actionSubtitle
              }
            >
              Start a store visit
            </Text>

            <View
              style={
                styles.actionArrow
              }
            >
              <Text
                style={
                  styles.arrowText
                }
              >
                →
              </Text>
            </View>
          </Pressable>

          {/* ADD STORE */}

          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed &&
                styles.pressed,
            ]}
            onPress={() =>
              router.push(
                '/(sales)/add-store'
              )
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.actionIconDark,
              ]}
            >
              <Text
                style={
                  styles.storeIcon
                }
              >
                +
              </Text>
            </View>

            <Text
              style={
                styles.actionTitle
              }
            >
              Add Store
            </Text>

            <Text
              style={
                styles.actionSubtitle
              }
            >
              Register a new customer
            </Text>

            <View
              style={
                styles.actionArrow
              }
            >
              <Text
                style={
                  styles.arrowText
                }
              >
                →
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ====================================================
         * TODAY'S ROUTE
         * ==================================================== */}

        <View
          style={
            styles.routeHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionLabelSmall
              }
            >
              FIELD ROUTE
            </Text>

            <Text
              style={
                styles.routeTitle
              }
            >
              Today's route
            </Text>
          </View>

          <Text
            style={
              styles.routeLiveText
            }
          >
            {routeVisits.length} STOPS
          </Text>
        </View>

        <View
          style={
            styles.routeCard
          }
        >
          {routeVisits.length ===
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
                  styles.emptyRouteTitle
                }
              >
                No visits recorded today
              </Text>

              <Text
                style={
                  styles.emptyRouteText
                }
              >
                Your completed store visits will
                appear here automatically.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.routeSummary
                }
              >
                <View
                  style={
                    styles.routeSummaryIcon
                  }
                >
                  <Text
                    style={
                      styles.routeSummaryIconText
                    }
                  >
                    R
                  </Text>
                </View>

                <View
                  style={
                    styles.routeSummaryText
                  }
                >
                  <Text
                    style={
                      styles.routeSummaryTitle
                    }
                  >
                    {
                      routeVisits.length
                    }{' '}
                    recorded stops
                  </Text>

                  <Text
                    style={
                      styles.routeSummarySubtitle
                    }
                  >
                    Live attendance route for{' '}
                    {
                      selectedDate
                    }
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.timeline
                }
              >
                {routeVisits.map(
                  (
                    visit,
                    index
                  ) => {
                    const last =
                      index ===
                      routeVisits.length -
                        1;

                    return (
                      <View
                        key={
                          visit.id
                        }
                        style={
                          styles.timelineRow
                        }
                      >
                        <View
                          style={
                            styles.timelineRail
                          }
                        >
                          <View
                            style={[
                              styles.timelineDot,
                              visit.orderPlaced &&
                                styles.timelineDotOrder,
                            ]}
                          />

                          {!last ? (
                            <View
                              style={
                                styles.timelineLine
                              }
                            />
                          ) : null}
                        </View>

                        <View
                          style={
                            styles.timelineContent
                          }
                        >
                          <View
                            style={
                              styles.timelineMain
                            }
                          >
                            <View
                              style={
                                styles.timelineStoreContainer
                              }
                            >
                              <Text
                                style={
                                  styles.timelineStore
                                }
                                numberOfLines={
                                  2
                                }
                              >
                                {
                                  visit.storeName
                                }
                              </Text>

                              {visit.storeCode ? (
                                <Text
                                  style={
                                    styles.timelineCode
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
                                styles.timelineTime
                              }
                            >
                              {
                                visit.time
                              }
                            </Text>
                          </View>

                          <View
                            style={
                              styles.timelineMetaRow
                            }
                          >
                            <Text
                              style={
                                styles.timelineMeta
                              }
                            >
                              {visit.orderPlaced
                                ? 'Order recorded'
                                : 'Visit recorded'}
                            </Text>

                            {visit.orderPlaced ? (
                              <View
                                style={
                                  styles.orderMiniBadge
                                }
                              >
                                <Text
                                  style={
                                    styles.orderMiniBadgeText
                                  }
                                >
                                  ORDER
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  }
                )}
              </View>

              <Pressable
                style={
                  styles.fullRouteButton
                }
                onPress={() =>
                  router.push(
                    '/admin/routes'
                  )
                }
              >
                <Text
                  style={
                    styles.fullRouteButtonText
                  }
                >
                  VIEW ROUTE
                </Text>

                <Text
                  style={
                    styles.fullRouteArrow
                  }
                >
                  →
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ====================================================
         * CURRENT VISIT
         * ==================================================== */}

        {lastSubmission ? (
          <>
            <Text
              style={
                styles.sectionLabel
              }
            >
              CURRENT VISIT
            </Text>

            <View
              style={
                styles.visitCard
              }
            >
              <View
                style={
                  styles.visitHeader
                }
              >
                <View
                  style={
                    styles.visitHeaderLeft
                  }
                >
                  <View
                    style={
                      styles.liveIndicator
                    }
                  >
                    <View
                      style={
                        styles.liveDot
                      }
                    />
                  </View>

                  <View>
                    <Text
                      style={
                        styles.visitEyebrow
                      }
                    >
                      VISIT ACTIVE
                    </Text>

                    <Text
                      style={
                        styles.visitTitle
                      }
                    >
                      {selectedStore?.name ??
                        'Store Visit'}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.checkCircle
                  }
                >
                  <Text
                    style={
                      styles.checkText
                    }
                  >
                    ✓
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.visitInfoRow
                }
              >
                <View
                  style={
                    styles.visitInfo
                  }
                >
                  <Text
                    style={
                      styles.visitInfoLabel
                    }
                  >
                    ATTENDANCE
                  </Text>

                  <Text
                    style={
                      styles.visitInfoValue
                    }
                  >
                    Submitted
                  </Text>
                </View>

                <View
                  style={
                    styles.visitInfo
                  }
                >
                  <Text
                    style={
                      styles.visitInfoLabel
                    }
                  >
                    ORDER
                  </Text>

                  <Text
                    style={[
                      styles.visitInfoValue,
                      orderPlaced
                        ? styles.orderGreen
                        : styles.orderGray,
                    ]}
                  >
                    {orderPlaced ===
                    null
                      ? '—'
                      : orderPlaced
                        ? 'YES'
                        : 'NO'}
                  </Text>
                </View>
              </View>

              {orderPlaced !==
              null ? (
                <View
                  style={[
                    styles.orderBanner,
                    orderPlaced
                      ? styles.orderBannerYes
                      : styles.orderBannerNo,
                  ]}
                >
                  <View
                    style={[
                      styles.orderBannerIcon,
                      orderPlaced
                        ? styles.orderBannerIconYes
                        : styles.orderBannerIconNo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderBannerIconText,
                        orderPlaced
                          ? styles.orderBannerIconTextYes
                          : styles.orderBannerIconTextNo,
                      ]}
                    >
                      {orderPlaced
                        ? '✓'
                        : '—'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.orderBannerContent
                    }
                  >
                    <Text
                      style={[
                        styles.orderBannerTitle,
                        orderPlaced
                          ? styles.orderBannerTitleYes
                          : styles.orderBannerTitleNo,
                      ]}
                    >
                      {orderPlaced
                        ? 'Order recorded'
                        : 'No order recorded'}
                    </Text>

                    <Text
                      style={
                        styles.orderBannerText
                      }
                    >
                      {orderPlaced
                        ? rewardModeLoading
                          ? 'Checking reward availability...'
                          : rewardEnabled
                            ? 'This visit qualifies for the reward wheel.'
                            : 'The order was recorded. Rewards are currently paused.'
                        : 'No reward spin is available for this visit.'}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* REWARD ACTIVE */}

              {orderPlaced ===
                true &&
              rewardEnabled &&
              !rewardModeLoading &&
              !spinCompleted ? (
                <PrimaryButton
                  title="OPEN REWARD WHEEL"
                  onPress={() =>
                    router.push(
                      '/(sales)/spin'
                    )
                  }
                  style={
                    styles.spinButton
                  }
                />
              ) : null}

              {/* REWARD OFF */}

              {orderPlaced ===
                true &&
              !rewardEnabled &&
              !rewardModeLoading &&
              !spinCompleted ? (
                <View
                  style={
                    styles.rewardPausedStrip
                  }
                >
                  <View
                    style={
                      styles.rewardPausedBadge
                    }
                  >
                    <Text
                      style={
                        styles.rewardPausedBadgeText
                      }
                    >
                      —
                    </Text>
                  </View>

                  <View
                    style={
                      styles.rewardPausedContent
                    }
                  >
                    <Text
                      style={
                        styles.rewardPausedTitle
                      }
                    >
                      Order completed
                    </Text>

                    <Text
                      style={
                        styles.rewardPausedText
                      }
                    >
                      Rewards are currently paused.
                      Your order has still been
                      recorded.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* COMPLETED */}

              {spinCompleted ? (
                <View
                  style={
                    styles.completedStrip
                  }
                >
                  <View
                    style={
                      styles.completedBadge
                    }
                  >
                    <Text
                      style={
                        styles.completedBadgeText
                      }
                    >
                      ✓
                    </Text>
                  </View>

                  <View
                    style={
                      styles.completedContent
                    }
                  >
                    <Text
                      style={
                        styles.completedTitle
                      }
                    >
                      Reward claimed
                    </Text>

                    <Text
                      style={
                        styles.completedText
                      }
                    >
                      This visit has been completed.
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ====================================================
         * HISTORY
         * ==================================================== */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          ACTIVITY
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.historyCard,
            pressed &&
              styles.pressed,
          ]}
          onPress={() =>
            router.push(
              '/(sales)/history'
            )
          }
        >
          <View
            style={
              styles.historyIcon
            }
          >
            <Text
              style={
                styles.historyIconText
              }
            >
              ↗
            </Text>
          </View>

          <View
            style={
              styles.historyContent
            }
          >
            <Text
              style={
                styles.historyTitle
              }
            >
              Visit History
            </Text>

            <Text
              style={
                styles.historyText
              }
            >
              Review previous visits and orders
            </Text>
          </View>

          <Text
            style={
              styles.historyArrow
            }
          >
            →
          </Text>
        </Pressable>

        {/* ====================================================
         * SIGN OUT
         * ==================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed &&
              styles.pressed,
          ]}
          onPress={
            signOut
          }
        >
          <Text
            style={
              styles.signOutText
            }
          >
            Sign out
          </Text>
        </Pressable>

        {/* ====================================================
         * FOOTER
         * ==================================================== */}

        <View
          style={
            styles.footer
          }
        >
          <View
            style={
              styles.footerDot
            }
          />

          <Text
            style={
              styles.footerText
            }
          >
            Attendance, orders and rewards are
            connected to the live database.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    container: {
      paddingBottom: 35,
    },

    /*
     * LOADING
     */

    loadingContainer: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        80,
    },

    loadingTitle: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        '#111827',
      marginTop: 14,
      marginBottom: 5,
    },

    loadingText: {
      fontSize: 10,
      color:
        '#94a3b8',
      textAlign:
        'center',
    },

    /*
     * HERO
     */

    hero: {
      backgroundColor:
        '#171a38',
      borderRadius: 22,
      padding: 20,
      marginBottom: 15,
      overflow:
        'hidden',
    },

    heroTopRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    heroText: {
      flex: 1,
      paddingRight: 12,
    },

    heroEyebrow: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#a5b4fc',
      letterSpacing:
        1.5,
      marginBottom: 6,
    },

    heroTitle: {
      fontSize: 23,
      lineHeight: 28,
      fontWeight:
        '900',
      color:
        '#ffffff',
    },

    heroSubtitle: {
      fontSize: 10,
      lineHeight: 16,
      color:
        '#d0d3e4',
      marginTop: 7,
    },

    heroOrb: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor:
        '#2b315c',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    heroOrbInner: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        '#6d7df3',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    heroOrbText: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#ffffff',
    },

    heroDivider: {
      height: 1,
      backgroundColor:
        '#373b59',
      marginVertical: 17,
    },

    heroBottom: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    heroSmallLabel: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#8b91ad',
      letterSpacing:
        1.2,
      marginBottom: 3,
    },

    heroStatus: {
      fontSize: 11,
      fontWeight:
        '800',
      color:
        '#ffffff',
    },

    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },

    statusDotReady: {
      backgroundColor:
        '#b9c2ff',
    },

    statusDotActive: {
      backgroundColor:
        '#34d399',
    },

    statusDotComplete: {
      backgroundColor:
        '#a78bfa',
    },

    /*
     * REWARD BANNER
     */

    rewardBanner: {
      flexDirection:
        'row',
      alignItems:
        'center',
      borderRadius: 15,
      padding: 11,
      marginBottom: 22,
    },

    rewardBannerOn: {
      backgroundColor:
        '#f0fdf4',
      borderWidth: 1,
      borderColor:
        '#bbf7d0',
    },

    rewardBannerOff: {
      backgroundColor:
        '#f8fafc',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    rewardBannerIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    rewardBannerIconOn: {
      backgroundColor:
        '#dcfce7',
    },

    rewardBannerIconOff: {
      backgroundColor:
        '#e2e8f0',
    },

    rewardBannerIconText: {
      fontSize: 14,
      fontWeight:
        '900',
    },

    rewardBannerIconTextOn: {
      color:
        '#16a34a',
    },

    rewardBannerIconTextOff: {
      color:
        '#64748b',
    },

    rewardBannerContent: {
      flex: 1,
    },

    rewardBannerTitle: {
      fontSize: 8,
      fontWeight:
        '900',
      letterSpacing:
        0.8,
      marginBottom: 2,
    },

    rewardBannerTitleOn: {
      color:
        '#15803d',
    },

    rewardBannerTitleOff: {
      color:
        '#64748b',
    },

    rewardBannerText: {
      fontSize: 8.5,
      lineHeight: 13,
      color:
        '#94a3b8',
    },

    /*
     * SECTION
     */

    sectionHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      marginBottom: 9,
    },

    sectionEyebrow: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#b4b9c3',
      letterSpacing:
        1.25,
      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight:
        '900',
      color:
        '#182033',
    },

    sectionLabel: {
      fontSize: 8,
      fontWeight:
        '900',
      color:
        '#b8bdc6',
      letterSpacing:
        1.3,
      marginBottom: 8,
    },

    sectionLabelSmall: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#b8bdc6',
      letterSpacing:
        1.3,
      marginBottom: 3,
    },

    liveBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ecfdf5',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    liveBadgeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        '#22c55e',
      marginRight: 5,
    },

    liveBadgeText: {
      fontSize: 6.5,
      fontWeight:
        '900',
      color:
        '#15803d',
      letterSpacing:
        0.7,
    },

    /*
     * PROGRESS
     */

    progressCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#edf0f4',
      borderRadius: 18,
      padding: 16,
      marginBottom: 22,
    },

    progressTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-end',
    },

    progressLabel: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#b2b7c1',
      letterSpacing:
        1.1,
      marginBottom: 3,
    },

    progressCountRow: {
      flexDirection:
        'row',
      alignItems:
        'baseline',
    },

    progressCount: {
      fontSize: 27,
      fontWeight:
        '900',
      color:
        '#1c2436',
      letterSpacing:
        -0.8,
    },

    progressTotal: {
      fontSize: 13,
      fontWeight:
        '700',
      color:
        '#c5c9d0',
    },

    progressPercent: {
      fontSize: 16,
      fontWeight:
        '800',
      color:
        '#6176e9',
      marginBottom: 3,
    },

    progressTrack: {
      height: 7,
      borderRadius: 999,
      backgroundColor:
        '#edf0f5',
      overflow:
        'hidden',
      marginTop: 8,
      marginBottom: 16,
    },

    progressFill: {
      height:
        '100%',
      borderRadius: 999,
      backgroundColor:
        '#6278eb',
    },

    progressBottom: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    progressStat: {
      flex: 1,
      alignItems:
        'center',
    },

    progressStatValue: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#1c2436',
      marginBottom: 2,
    },

    progressStatLabel: {
      fontSize: 6,
      fontWeight:
        '800',
      color:
        '#b5bac3',
      letterSpacing:
        0.8,
    },

    /*
     * QUICK ACTIONS
     */

    actionGrid: {
      flexDirection:
        'row',
      gap: 10,
      marginBottom: 23,
    },

    actionCard: {
      flex: 1,
      minHeight: 145,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#edf0f4',
      borderRadius: 18,
      padding: 14,
      position:
        'relative',
    },

    pressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    actionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 17,
    },

    actionIconBlue: {
      backgroundColor:
        '#f0f3ff',
    },

    actionIconDark: {
      backgroundColor:
        '#f3f4f6',
    },

    actionIconText: {
      fontSize: 23,
      fontWeight:
        '300',
      color:
        '#6176e9',
    },

    storeIcon: {
      fontSize: 23,
      fontWeight:
        '300',
      color:
        '#4b5563',
    },

    actionTitle: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#182033',
      marginBottom: 4,
    },

    actionSubtitle: {
      fontSize: 9,
      lineHeight: 14,
      color:
        '#b0b5bf',
      paddingRight: 10,
    },

    actionArrow: {
      position:
        'absolute',
      right: 11,
      bottom: 11,
    },

    arrowText: {
      fontSize: 15,
      fontWeight:
        '800',
      color:
        '#d1d5db',
    },

    /*
     * ROUTE
     */

    routeHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      marginBottom: 8,
    },

    routeTitle: {
      fontSize: 19,
      fontWeight:
        '900',
      color:
        '#182033',
      letterSpacing:
        -0.4,
    },

    routeLiveText: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#6176e9',
      letterSpacing:
        0.8,
      marginBottom: 2,
    },

    routeCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#edf0f4',
      borderRadius: 19,
      padding: 14,
      marginBottom: 22,
    },

    routeSummary: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingBottom: 13,
      borderBottomWidth: 1,
      borderBottomColor:
        '#f1f3f6',
    },

    routeSummaryIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        '#f1f0ff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    routeSummaryIconText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#7469d6',
    },

    routeSummaryText: {
      flex: 1,
    },

    routeSummaryTitle: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#253047',
      marginBottom: 2,
    },

    routeSummarySubtitle: {
      fontSize: 8,
      color:
        '#b1b6bf',
    },

    timeline: {
      paddingTop: 13,
      paddingBottom: 4,
    },

    timelineRow: {
      flexDirection:
        'row',
      minHeight: 49,
    },

    timelineRail: {
      width: 24,
      alignItems:
        'center',
      marginRight: 7,
    },

    timelineDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        '#6176e9',
      zIndex: 2,
      marginTop: 2,
    },

    timelineDotOrder: {
      backgroundColor:
        '#22a56d',
    },

    timelineLine: {
      width: 1,
      flex: 1,
      marginTop: -1,
      backgroundColor:
        '#dce2f7',
    },

    timelineContent: {
      flex: 1,
      paddingBottom: 10,
    },

    timelineMain: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
    },

    timelineStoreContainer: {
      flex: 1,
      paddingRight: 8,
    },

    timelineStore: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#253047',
    },

    timelineCode: {
      fontSize: 7,
      color:
        '#b4b9c2',
      marginTop: 2,
    },

    timelineTime: {
      fontSize: 8,
      color:
        '#a7adb7',
    },

    timelineMetaRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 3,
    },

    timelineMeta: {
      fontSize: 7,
      color:
        '#b3b8c1',
    },

    orderMiniBadge: {
      backgroundColor:
        '#ecfdf5',
      borderRadius: 999,
      paddingHorizontal: 5,
      paddingVertical: 3,
      marginLeft: 6,
    },

    orderMiniBadgeText: {
      fontSize: 5.5,
      fontWeight:
        '900',
      color:
        '#15803d',
      letterSpacing:
        0.5,
    },

    fullRouteButton: {
      height: 42,
      borderRadius: 11,
      backgroundColor:
        '#1a1e42',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    fullRouteButtonText: {
      fontSize: 7.5,
      fontWeight:
        '900',
      color:
        '#ffffff',
      letterSpacing:
        1,
    },

    fullRouteArrow: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#ffffff',
      marginLeft: 7,
    },

    emptyRoute: {
      alignItems:
        'center',
      paddingVertical: 25,
    },

    emptyRouteIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        '#f8fafc',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 9,
    },

    emptyRouteIconText: {
      fontSize: 18,
      color:
        '#94a3b8',
    },

    emptyRouteTitle: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 4,
    },

    emptyRouteText: {
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
      textAlign:
        'center',
      maxWidth: 270,
    },

    /*
     * CURRENT VISIT
     */

    visitCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 20,
      padding: 16,
      marginBottom: 22,
    },

    visitHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    visitHeaderLeft: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flex: 1,
    },

    liveIndicator: {
      width: 37,
      height: 37,
      borderRadius: 12,
      backgroundColor:
        '#ecfdf5',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        '#10b981',
    },

    visitEyebrow: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#10b981',
      letterSpacing:
        0.9,
      marginBottom: 2,
    },

    visitTitle: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#111827',
    },

    checkCircle: {
      width: 31,
      height: 31,
      borderRadius: 16,
      backgroundColor:
        '#dcfce7',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    checkText: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#16a34a',
    },

    visitInfoRow: {
      flexDirection:
        'row',
      marginTop: 17,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        '#f1f5f9',
    },

    visitInfo: {
      flex: 1,
    },

    visitInfoLabel: {
      fontSize: 7,
      fontWeight:
        '900',
      color:
        '#94a3b8',
      letterSpacing:
        0.7,
      marginBottom: 4,
    },

    visitInfoValue: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#334155',
    },

    orderGreen: {
      color:
        '#16a34a',
    },

    orderGray: {
      color:
        '#64748b',
    },

    orderBanner: {
      flexDirection:
        'row',
      alignItems:
        'center',
      borderRadius: 13,
      padding: 10,
      marginTop: 13,
    },

    orderBannerYes: {
      backgroundColor:
        '#f0fdf4',
    },

    orderBannerNo: {
      backgroundColor:
        '#f8fafc',
    },

    orderBannerIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    orderBannerIconYes: {
      backgroundColor:
        '#dcfce7',
    },

    orderBannerIconNo: {
      backgroundColor:
        '#e2e8f0',
    },

    orderBannerIconText: {
      fontSize: 14,
      fontWeight:
        '900',
    },

    orderBannerIconTextYes: {
      color:
        '#16a34a',
    },

    orderBannerIconTextNo: {
      color:
        '#64748b',
    },

    orderBannerContent: {
      flex: 1,
    },

    orderBannerTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      marginBottom: 2,
    },

    orderBannerTitleYes: {
      color:
        '#166534',
    },

    orderBannerTitleNo: {
      color:
        '#475569',
    },

    orderBannerText: {
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
    },

    spinButton: {
      marginTop: 11,
    },

    /*
     * REWARD PAUSED
     */

    rewardPausedStrip: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f8fafc',
      borderRadius: 13,
      padding: 10,
      marginTop: 11,
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
    },

    rewardPausedBadge: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor:
        '#e2e8f0',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    rewardPausedBadgeText: {
      color:
        '#64748b',
      fontSize: 14,
      fontWeight:
        '900',
    },

    rewardPausedContent: {
      flex: 1,
    },

    rewardPausedTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#334155',
      marginBottom: 2,
    },

    rewardPausedText: {
      fontSize: 8,
      lineHeight: 12,
      color:
        '#94a3b8',
    },

    /*
     * COMPLETED
     */

    completedStrip: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#faf5ff',
      borderRadius: 13,
      padding: 10,
      marginTop: 11,
    },

    completedBadge: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor:
        '#ede9fe',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    completedBadgeText: {
      color:
        '#7c3aed',
      fontSize: 14,
      fontWeight:
        '900',
    },

    completedContent: {
      flex: 1,
    },

    completedTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#6d28d9',
      marginBottom: 2,
    },

    completedText: {
      fontSize: 8,
      color:
        '#94a3b8',
    },

    /*
     * HISTORY
     */

    historyCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e2e8f0',
      borderRadius: 17,
      padding: 13,
      marginBottom: 17,
    },

    historyIcon: {
      width: 41,
      height: 41,
      borderRadius: 12,
      backgroundColor:
        '#f1f5f9',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    historyIconText: {
      fontSize: 19,
      fontWeight:
        '600',
      color:
        '#475569',
    },

    historyContent: {
      flex: 1,
    },

    historyTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#1e293b',
      marginBottom: 3,
    },

    historyText: {
      fontSize: 9,
      color:
        '#94a3b8',
    },

    historyArrow: {
      fontSize: 17,
      fontWeight:
        '700',
      color:
        '#94a3b8',
      marginLeft: 8,
    },

    /*
     * SIGN OUT
     */

    signOutButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 12,
      marginBottom: 15,
    },

    signOutText: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#a1a5ae',
    },

    /*
     * FOOTER
     */

    footer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 15,
      paddingBottom: 10,
    },

    footerDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        '#10b981',
      marginRight: 6,
    },

    footerText: {
      fontSize: 7.5,
      color:
        '#a1a1aa',
      textAlign:
        'center',
    },
  });