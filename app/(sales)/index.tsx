// app/(sales)/index.tsx

import {
  router,
} from 'expo-router';

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

import {
  PrimaryButton,
} from '@/src/components/PrimaryButton';

import {
  ScreenContainer,
} from '@/src/components/ScreenContainer';

import {
  useAttendanceFlow,
} from '@/src/features/attendance/AttendanceFlowContext';

import {
  useAuth,
} from '@/src/features/auth/useAuth';

import {
  supabase,
} from '@/src/lib/supabase';

import {
  getRewardMode,
} from '@/src/services/rewardModeService';

/*
 * ============================================================
 * DEMO CONFIG
 * ============================================================
 *
 * If the backend has no attendance data for today, the app
 * uses the demo route below so the client presentation still
 * has a populated dashboard.
 */

const USE_DEMO_FALLBACK =
  true;

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type RouteVisit = {
  id: string;

  storeId: string | null;

  storeName: string;

  time: string;

  orderPlaced: boolean;

  latitude: number | null;

  longitude: number | null;

  status: string | null;
};

type SalesDashboardData = {
  visits: RouteVisit[];

  totalPlannedStops: number;

  source: 'backend' | 'demo';
};

/*
 * ============================================================
 * DEMO DATA
 * ============================================================
 *
 * This matches the populated Sales Home presentation you
 * showed in the screen recording.
 */

const DEMO_ROUTE: RouteVisit[] = [
  {
    id: 'demo-001',

    storeId: 'demo-store-001',

    storeName:
      'Toko Sumber Jaya',

    time: '08:14',

    orderPlaced: true,

    latitude:
      -7.2575,

    longitude:
      112.7521,

    status: 'approved',
  },

  {
    id: 'demo-002',

    storeId: 'demo-store-002',

    storeName:
      'ABC Stationery',

    time: '09:02',

    orderPlaced: true,

    latitude:
      -7.2591,

    longitude:
      112.7542,

    status: 'approved',
  },

  {
    id: 'demo-003',

    storeId: 'demo-store-003',

    storeName:
      'Maju Makmur',

    time: '09:51',

    orderPlaced: false,

    latitude:
      -7.2613,

    longitude:
      112.7584,

    status: 'approved',
  },

  {
    id: 'demo-004',

    storeId: 'demo-store-004',

    storeName:
      'Coffee Corner',

    time: '11:03',

    orderPlaced: false,

    latitude:
      -7.2648,

    longitude:
      112.7627,

    status: 'planned',
  },

  {
    id: 'demo-005',

    storeId: 'demo-store-005',

    storeName:
      'Prima Jaya',

    time: '14:32',

    orderPlaced: false,

    latitude:
      -7.2672,

    longitude:
      112.7661,

    status: 'planned',
  },

  {
    id: 'demo-006',

    storeId: 'demo-store-006',

    storeName:
      'Central Stationery',

    time: '15:24',

    orderPlaced: false,

    latitude:
      -7.2695,

    longitude:
      112.7698,

    status: 'planned',
  },

  {
    id: 'demo-007',

    storeId: 'demo-store-007',

    storeName:
      'Sinar Baru',

    time: '16:05',

    orderPlaced: false,

    latitude:
      -7.2721,

    longitude:
      112.7724,

    status: 'planned',
  },

  {
    id: 'demo-008',

    storeId: 'demo-store-008',

    storeName:
      'Mitra Dagang',

    time: '16:42',

    orderPlaced: false,

    latitude:
      -7.2742,

    longitude:
      112.7758,

    status: 'planned',
  },
];

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function getDateKey(
  date: Date
) {
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
  value: string
) {
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
 * BACKEND DATA
 * ============================================================
 */

async function loadBackendDashboard(
  userId: string
): Promise<SalesDashboardData> {
  /*
   * ----------------------------------------------------------
   * SALES PROFILE
   * ----------------------------------------------------------
   *
   * Current project structure uses the authenticated user's
   * ID as the sales profile ID.
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
        email,
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
    error: attendanceError,
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
        created_at,
        store:store_id (
          id,
          name
        )
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
      `Could not load today's attendance: ${attendanceError.message}`
    );
  }

  /*
   * ----------------------------------------------------------
   * SPINS / ORDERS
   * ----------------------------------------------------------
   *
   * Existing project relationship:
   *
   * spins.attendance_id
   *        ↓
   * attendance.id
   *
   * This is how previous history code determined that a visit
   * resulted in an order.
   */

  const {
    data: spins,
    error: spinsError,
  } =
    await supabase
      .from('spins')
      .select(
        `
        id,
        attendance_id
        `
      )
      .eq(
        'sales_id',
        sales.id
      );

  if (
    spinsError
  ) {
    throw new Error(
      `Could not load today's order information: ${spinsError.message}`
    );
  }

  /*
   * Create a fast lookup for attendance records that have
   * corresponding spins.
   */

  const orderAttendanceIds =
    new Set(
      (spins ?? [])
        .map(
          (
            spin
          ) =>
            spin.attendance_id
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
   * MAP TO DASHBOARD
   * ----------------------------------------------------------
   */

  type AttendanceRow =
    {
      id: string;

      store_id:
        | string
        | null;

      latitude:
        | number
        | null;

      longitude:
        | number
        | null;

      status:
        | string
        | null;

      created_at:
        | string
        | null;

      store:
        | {
            id: string;

            name: string;
          }
        | null;
    };

  const rows =
    (attendance ??
      []) as unknown as AttendanceRow[];

  const visits:
    RouteVisit[] =
    rows.map(
      (
        row
      ) => ({
        id:
          row.id,

        storeId:
          row.store?.id ??
          row.store_id ??
          null,

        storeName:
          row.store?.name ??
          'Store visit',

        time:
          row.created_at
            ? formatTime(
                row.created_at
              )
            : '—',

        orderPlaced:
          orderAttendanceIds.has(
            row.id
          ),

        latitude:
          row.latitude,

        longitude:
          row.longitude,

        status:
          row.status,
      })
    );

  /*
   * If the backend has real data, use the real attendance
   * count as the completed count.
   *
   * Planned stop count is not currently stored in the
   * attendance table, so the demo uses 8 when real route
   * planning data isn't available.
   */

  return {
    visits,

    totalPlannedStops:
      Math.max(
        visits.length,
        8
      ),

    source:
      'backend',
  };
}

/*
 * ============================================================
 * DEMO DATA LOADER
 * ============================================================
 */

function getDemoDashboard():
  SalesDashboardData {
  return {
    visits:
      DEMO_ROUTE,

    totalPlannedStops:
      DEMO_ROUTE.length,

    source:
      'demo',
  };
}

/*
 * ============================================================
 * MAIN SCREEN
 * ============================================================
 */

export default function SalesHomeScreen() {
  const {
    profile,
    signOut,
  } = useAuth();

  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
  } =
    useAttendanceFlow();

  /*
   * ----------------------------------------------------------
   * REWARD MODE
   * ----------------------------------------------------------
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
   * ----------------------------------------------------------
   * DASHBOARD DATA
   * ----------------------------------------------------------
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
          const mode =
            await getRewardMode();

          setRewardEnabled(
            mode.enabled
          );
        } catch (
          loadError
        ) {
          console.warn(
            'SALES REWARD MODE ERROR:',
            loadError
          );

          /*
           * Keep rewards available if the frontend
           * local setting cannot be read.
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
        isRefresh =
          false
      ) => {
        if (
          !profile
        ) {
          return;
        }

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

        try {
          /*
           * ----------------------------------------------------
           * REAL BACKEND
           * ----------------------------------------------------
           */

          const backendData =
            await loadBackendDashboard(
              profile.id
            );

          /*
           * If today's backend has data, display it.
           */

          if (
            backendData.visits
              .length >
              0
          ) {
            setDashboard(
              backendData
            );

            return;
          }

          /*
           * ----------------------------------------------------
           * DEMO FALLBACK
           * ----------------------------------------------------
           *
           * This is useful for client presentation when
           * the database currently has no visits today.
           */

          if (
            USE_DEMO_FALLBACK
          ) {
            setDashboard(
              getDemoDashboard()
            );

            return;
          }

          setDashboard(
            backendData
          );
        } catch (
          loadError
        ) {
          console.error(
            'SALES DASHBOARD ERROR:',
            loadError
          );

          /*
           * Keep the demo working even if the backend is
           * currently unavailable.
           */

          if (
            USE_DEMO_FALLBACK
          ) {
            setDashboard(
              getDemoDashboard()
            );

            setError(
              'Showing demo activity because live data is currently unavailable.'
            );
          } else {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Could not load your dashboard.'
            );
          }
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
        profile,
      ]
    );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    loadRewardMode();

    loadDashboard();
  }, [
    loadRewardMode,
    loadDashboard,
  ]);

  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const handleRefresh =
    async () => {
      await Promise.all([
        loadRewardMode(),
        loadDashboard(
          true
        ),
      ]);
    };

  /*
   * ==========================================================
   * WAIT FOR PROFILE
   * ==========================================================
   */

  if (
    !profile
  ) {
    return (
      <ScreenContainer
        title="Loading..."
        subtitle="Preparing your dashboard"
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
            Loading your account
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Please wait...
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

  const totalPlannedStops =
    dashboard?.totalPlannedStops ??
    8;

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
    visitCount > 0
      ? (
          (orderCount /
            visitCount) *
          100
        ).toFixed(1)
      : '0.0';

  const remainingStops =
    Math.max(
      totalPlannedStops -
        visitCount,
      0
    );

  /*
   * We show a maximum of five route entries in the compact
   * preview.
   */

  const routePreview =
    visits.slice(
      0,
      5
    );

  /*
   * The first incomplete visit becomes the next stop.
   */

  const nextStop =
    visits.find(
      (
        visit
      ) =>
        !visit.orderPlaced
    ) ??
    visits[
      visitCount
    ];

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading &&
    !dashboard
  ) {
    return (
      <ScreenContainer
        title={`Hi, ${firstName}`}
        subtitle="Loading your sales activity"
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
            Loading today's route
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Preparing your field activity...
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
            onRefresh={
              handleRefresh
            }
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
                  : "complete today's route."}
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
         * DATA SOURCE
         * ==================================================== */}

        {dashboard?.source ===
        'demo' ? (
          <View
            style={
              styles.demoIndicator
            }
          >
            <View
              style={
                styles.demoIndicatorDot
              }
            />

            <Text
              style={
                styles.demoIndicatorText
              }
            >
              DEMO DATA
            </Text>

            <Text
              style={
                styles.demoIndicatorHint
              }
            >
              Live database activity will appear
              automatically when available.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={
              styles.notice
            }
          >
            <Text
              style={
                styles.noticeText
              }
            >
              {error}
            </Text>
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

          <Text
            style={
              styles.progressDemo
            }
          >
            {dashboard?.source ===
            'demo'
              ? 'DEMO'
              : 'LIVE'}
          </Text>
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
                  {visitCount}
                </Text>

                <Text
                  style={
                    styles.progressTotal
                  }
                >
                  {' '}
                  / {totalPlannedStops}
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.progressPercent
              }
            >
              {totalPlannedStops >
              0
                ? Math.round(
                    (visitCount /
                      totalPlannedStops) *
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
                  width: `${Math.min(
                    (visitCount /
                      Math.max(
                        totalPlannedStops,
                        1
                      )) *
                      100,
                    100
                  )}%`,
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
                {orderCount}
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
                {conversionRate}%
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
                {remainingStops}
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
              Register a new location
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

          <Pressable
            onPress={() =>
              router.push(
                '/(sales)/history'
              )
            }
          >
            <Text
              style={
                styles.viewMapText
              }
            >
              VIEW MAP →
            </Text>
          </Pressable>
        </View>

        <View
          style={
            styles.routeCard
          }
        >
          {/* ROUTE SUMMARY */}

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
                {visitCount} of{' '}
                {
                  totalPlannedStops
                }{' '}
                stops completed
              </Text>

              <Text
                style={
                  styles.routeSummarySubtitle
                }
              >
                {remainingStops >
                0
                  ? `${remainingStops} stops remaining`
                  : 'Route completed'}
              </Text>
            </View>
          </View>

          {/* ROUTE TIMELINE */}

          <View
            style={
              styles.timeline
            }
          >
            {routePreview.map(
              (
                visit,
                index
              ) => {
                const completed =
                  index <
                  visitCount;

                const isLast =
                  index ===
                  routePreview.length -
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
                    {/* LINE */}

                    <View
                      style={
                        styles.timelineRail
                      }
                    >
                      <View
                        style={[
                          styles.timelineDot,
                          completed
                            ? styles.timelineDotCompleted
                            : styles.timelineDotUpcoming,
                        ]}
                      />

                      {!isLast ? (
                        <View
                          style={[
                            styles.timelineLine,
                            completed
                              ? styles.timelineLineCompleted
                              : styles.timelineLineUpcoming,
                          ]}
                        />
                      ) : null}
                    </View>

                    {/* CONTENT */}

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
                        <Text
                          style={
                            styles.timelineStore
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            visit.storeName
                          }
                        </Text>

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

                      <Text
                        style={
                          styles.timelineMeta
                        }
                      >
                        {visit.orderPlaced
                          ? 'Order recorded'
                          : completed
                            ? 'Visit completed'
                            : 'Upcoming stop'}
                      </Text>
                    </View>

                    {/* STATUS */}

                    <View
                      style={
                        styles.timelineStatus
                      }
                    >
                      {visit.orderPlaced ? (
                        <Text
                          style={
                            styles.timelineCheck
                          }
                        >
                          ✓
                        </Text>
                      ) : completed ? (
                        <Text
                          style={
                            styles.timelineVisited
                          }
                        >
                          •
                        </Text>
                      ) : (
                        <Text
                          style={
                            styles.timelineUpcoming
                          }
                        >
                          ○
                        </Text>
                      )}
                    </View>
                  </View>
                );
              }
            )}
          </View>

          {/* FULL ROUTE */}

          <Pressable
            style={
              styles.fullRouteButton
            }
            onPress={() =>
              router.push(
                '/(sales)/history'
              )
            }
          >
            <Text
              style={
                styles.fullRouteButtonText
              }
            >
              VIEW FULL ROUTE
            </Text>

            <Text
              style={
                styles.fullRouteArrow
              }
            >
              →
            </Text>
          </Pressable>
        </View>

        {/* ====================================================
         * NEXT STOP
         * ==================================================== */}

        {nextStop ? (
          <>
            <Text
              style={
                styles.sectionLabel
              }
            >
              NEXT STOP
            </Text>

            <Pressable
              style={({
                pressed,
              }) => [
                styles.nextStopCard,
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
                style={
                  styles.nextStopIcon
                }
              >
                <Text
                  style={
                    styles.nextStopIconText
                  }
                >
                  →
                </Text>
              </View>

              <View
                style={
                  styles.nextStopContent
                }
              >
                <Text
                  style={
                    styles.nextStopEyebrow
                  }
                >
                  CONTINUE ROUTE
                </Text>

                <Text
                  style={
                    styles.nextStopTitle
                  }
                >
                  {
                    nextStop.storeName
                  }
                </Text>

                <Text
                  style={
                    styles.nextStopText
                  }
                >
                  {dashboard?.source ===
                    'demo' &&
                  nextStop.storeName ===
                    'Maju Makmur'
                    ? '2.4 km away • 6 min'
                    : 'Next scheduled store visit'}
                </Text>
              </View>

              <View
                style={
                  styles.nextStopBadge
                }
              >
                <Text
                  style={
                    styles.nextStopBadgeText
                  }
                >
                  GO
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}

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
                      Your order has still been recorded.
                    </Text>
                  </View>
                </View>
              ) : null}

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
            Attendance and rewards are securely
            validated by the server.
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

      marginBottom: 5,
    },

    loadingText: {
      fontSize: 11,

      color:
        '#94a3b8',
    },

    /*
     * HERO
     */

    hero: {
      backgroundColor:
        '#171a38',

      borderRadius: 22,

      padding: 20,

      marginBottom: 14,

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

      letterSpacing:
        -0.6,
    },

    heroSubtitle: {
      fontSize: 10,

      lineHeight: 16,

      color:
        '#d0d3e4',

      marginTop: 7,
    },

    heroOrb: {
      width: 65,

      height: 65,

      borderRadius: 33,

      backgroundColor:
        '#2b315c',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    heroOrbInner: {
      width: 45,

      height: 45,

      borderRadius: 23,

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
     * DEMO
     */

    demoIndicator: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#fffbeb',

      borderWidth: 1,

      borderColor:
        '#fde68a',

      borderRadius: 10,

      paddingHorizontal: 9,

      paddingVertical: 7,

      marginBottom: 15,
    },

    demoIndicatorDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        '#f59e0b',

      marginRight: 6,
    },

    demoIndicatorText: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#92400e',

      letterSpacing:
        0.8,

      marginRight: 6,
    },

    demoIndicatorHint: {
      flex: 1,

      fontSize: 7,

      color:
        '#a16207',
    },

    notice: {
      backgroundColor:
        '#fff7ed',

      borderWidth: 1,

      borderColor:
        '#fed7aa',

      borderRadius: 10,

      padding: 8,

      marginBottom: 14,
    },

    noticeText: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#9a3412',
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

      marginBottom: 8,
    },

    sectionEyebrow: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#c5c8cf',

      letterSpacing:
        1.3,

      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 16,

      fontWeight:
        '900',

      color:
        '#182033',
    },

    progressDemo: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#d4b468',

      letterSpacing:
        1.1,
    },

    sectionLabel: {
      fontSize: 8,

      fontWeight:
        '900',

      color:
        '#c5c8cf',

      letterSpacing:
        1.3,

      marginBottom: 8,
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
      height: '100%',

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
     * ACTIONS
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

    sectionLabelSmall: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#c5c8cf',

      letterSpacing:
        1.3,

      marginBottom: 4,
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

    viewMapText: {
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

      zIndex: 2,
    },

    timelineDotCompleted: {
      backgroundColor:
        '#6176e9',
    },

    timelineDotUpcoming: {
      backgroundColor:
        '#d9dde5',
    },

    timelineLine: {
      width: 1,

      flex: 1,

      marginTop: -1,
    },

    timelineLineCompleted: {
      backgroundColor:
        '#9ba8ed',
    },

    timelineLineUpcoming: {
      backgroundColor:
        '#e5e7eb',
    },

    timelineContent: {
      flex: 1,

      paddingBottom: 10,
    },

    timelineMain: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    timelineStore: {
      flex: 1,

      fontSize: 10,

      fontWeight:
        '800',

      color:
        '#253047',

      paddingRight: 8,
    },

    timelineTime: {
      fontSize: 8,

      color:
        '#a7adb7',
    },

    timelineMeta: {
      fontSize: 7.5,

      color:
        '#b3b8c1',

      marginTop: 2,
    },

    timelineStatus: {
      width: 22,

      alignItems:
        'center',

      justifyContent:
        'flex-start',

      paddingTop: 1,
    },

    timelineCheck: {
      fontSize: 12,

      fontWeight:
        '900',

      color:
        '#40b77d',
    },

    timelineVisited: {
      fontSize: 15,

      color:
        '#6176e9',
    },

    timelineUpcoming: {
      fontSize: 13,

      color:
        '#d0d4db',
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

    /*
     * NEXT STOP
     */

    nextStopCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#171a38',

      borderRadius: 16,

      padding: 12,

      marginBottom: 22,
    },

    nextStopIcon: {
      width: 35,

      height: 35,

      borderRadius: 11,

      backgroundColor:
        '#2d3158',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    nextStopIconText: {
      fontSize: 17,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },

    nextStopContent: {
      flex: 1,
    },

    nextStopEyebrow: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#9da5cf',

      letterSpacing:
        0.8,

      marginBottom: 2,
    },

    nextStopTitle: {
      fontSize: 12,

      fontWeight:
        '900',

      color:
        '#ffffff',

      marginBottom: 2,
    },

    nextStopText: {
      fontSize: 7.5,

      color:
        '#a5aac2',
    },

    nextStopBadge: {
      backgroundColor:
        '#657af0',

      borderRadius: 9,

      paddingHorizontal: 9,

      paddingVertical: 6,

      marginLeft: 7,
    },

    nextStopBadgeText: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#ffffff',

      letterSpacing:
        0.7,
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