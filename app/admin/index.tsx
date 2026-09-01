// app/admin/index.tsx

import {
  router,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  ScreenContainer,
} from '@/src/components/ScreenContainer';

import {
  useAuth,
} from '@/src/features/auth/useAuth';

import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '@/src/services/adminStatsService';

import {
  getRewardMode,
  setRewardMode,
} from '@/src/services/rewardModeService';

/*
 * ============================================================
 * ADMIN MODULES
 * ============================================================
 */

const ADMIN_SECTIONS = [
  {
    title:
      'Attendance',

    description:
      'Monitor visits, GPS and photo evidence',

    shortLabel:
      'A',

    accent:
      '#2563eb',

    background:
      '#eff6ff',

    route:
      '/admin/attendance',
  },

  {
    title:
      'Sales Routes',

    description:
      'View each salesperson route by day',

    shortLabel:
      'R',

    accent:
      '#0891b2',

    background:
      '#ecfeff',

    route:
      '/admin/routes',
  },

  {
    title:
      'Spin History',

    description:
      'Review rewards and sales activity',

    shortLabel:
      'S',

    accent:
      '#7c3aed',

    background:
      '#f5f3ff',

    route:
      '/admin/spins',
  },

  {
    title:
      'Stores',

    description:
      'Manage registered store locations',

    shortLabel:
      'L',

    accent:
      '#059669',

    background:
      '#ecfdf5',

    route:
      '/admin/stores',
  },

  {
    title:
      'Sales Team',

    description:
      'Manage sales representatives',

    shortLabel:
      'T',

    accent:
      '#ea580c',

    background:
      '#fff7ed',

    route:
      '/admin/sales',
  },

  {
    title:
      'Rewards',

    description:
      'Configure rewards and probabilities',

    shortLabel:
      'G',

    accent:
      '#db2777',

    background:
      '#fdf2f8',

    route:
      '/admin/rewards',
  },
];

/*
 * ============================================================
 * MAIN SCREEN
 * ============================================================
 */

export default function AdminDashboard() {
  const {
    profile,
    signOut,
  } = useAuth();

  /*
   * ==========================================================
   * DASHBOARD STATE
   * ==========================================================
   */

  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      AdminDashboardStats | null
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
   * REWARD STATE
   * ==========================================================
   */

  const [
    rewardEnabled,
    setRewardEnabled,
  ] =
    useState(false);

  const [
    loadingRewardMode,
    setLoadingRewardMode,
  ] =
    useState(true);

  const [
    savingRewardMode,
    setSavingRewardMode,
  ] =
    useState(false);

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
            await getAdminDashboardStats();

          setDashboard(
            data
          );
        } catch (
          loadError
        ) {
          console.error(
            'ADMIN DASHBOARD ERROR:',
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load dashboard data.'
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
      []
    );

  /*
   * ==========================================================
   * LOAD REWARD MODE
   * ==========================================================
   */

  const loadReward =
    useCallback(
      async () => {
        try {
          setLoadingRewardMode(
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
          console.error(
            'ADMIN REWARD MODE ERROR:',
            rewardError
          );
        } finally {
          setLoadingRewardMode(
            false
          );
        }
      },
      []
    );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    loadDashboard();
    loadReward();
  }, [
    loadDashboard,
    loadReward,
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

          loadReward();
        },
        30000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    loadDashboard,
    loadReward,
  ]);

  /*
   * ==========================================================
   * ROLE SAFETY
   * ==========================================================
   */

  useEffect(() => {
    if (
      profile &&
      profile.role !==
        'admin'
    ) {
      router.replace(
        '/(sales)'
      );
    }
  }, [
    profile,
  ]);

  /*
   * ==========================================================
   * REWARD TOGGLE
   * ==========================================================
   */

  const handleRewardToggle =
    async (
      enabled: boolean
    ) => {
      if (
        savingRewardMode
      ) {
        return;
      }

      const previous =
        rewardEnabled;

      setRewardEnabled(
        enabled
      );

      setSavingRewardMode(
        true
      );

      try {
        await setRewardMode(
          enabled
        );
      } catch (
        rewardError
      ) {
        console.error(
          'SAVE REWARD MODE ERROR:',
          rewardError
        );

        setRewardEnabled(
          previous
        );
      } finally {
        setSavingRewardMode(
          false
        );
      }
    };

  /*
   * ==========================================================
   * LOADING PROFILE
   * ==========================================================
   */

  if (
    !profile
  ) {
    return (
      <ScreenContainer
        title="Admin"
        subtitle="Loading dashboard..."
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
            Loading dashboard
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
   * ADMIN CHECK
   * ==========================================================
   */

  if (
    profile.role !==
    'admin'
  ) {
    return (
      <ScreenContainer
        title="Redirecting"
        subtitle="Opening sales dashboard..."
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={
              styles.loadingTitle
            }
          >
            Admin access required
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
   * DERIVED VALUES
   * ==========================================================
   */

  const firstName =
    profile.name?.trim()
      ? profile.name
          .trim()
          .split(
            ' '
          )[0]
      : 'Admin';

  const stats =
    dashboard;

  const salesCount =
    stats?.salesCount ??
    0;

  const storesCount =
    stats?.storesCount ??
    0;

  const todayVisits =
    stats?.todayVisits ??
    0;

  const todayOrders =
    stats?.todayOrders ??
    0;

  const todayRoutes =
    stats?.todayRoutes ??
    0;

  const conversionRate =
    stats?.conversionRate ??
    0;

  const topSales =
    stats?.topSales ??
    [];

  const routeAlerts =
    stats?.routeAlerts ??
    [];

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <ScreenContainer
      title="Admin"
      subtitle={`Welcome back, ${firstName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadDashboard(
                true
              )
            }
          />
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
              styles.heroTop
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
                SALES OPERATIONS
              </Text>

              <Text
                style={
                  styles.heroTitle
                }
              >
                Control Center
              </Text>

              <Text
                style={
                  styles.heroDescription
                }
              >
                Monitor today's sales
                performance, routes, orders
                and reward activity.
              </Text>
            </View>

            <View
              style={
                styles.heroMark
              }
            >
              <Text
                style={
                  styles.heroMarkText
                }
              >
                A
              </Text>
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
                  styles.heroStatusLabel
                }
              >
                SYSTEM STATUS
              </Text>

              <View
                style={
                  styles.systemStatus
                }
              >
                <View
                  style={
                    styles.onlineDot
                  }
                />

                <Text
                  style={
                    styles.systemStatusText
                  }
                >
                  {error
                    ? 'Connection issue'
                    : 'Operational'}
                </Text>
              </View>
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
                LIVE DATA
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
         * ERROR
         * ==================================================== */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Dashboard could not load
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
                styles.retryButton
              }
              onPress={() =>
                loadDashboard()
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                TRY AGAIN
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ====================================================
         * REWARD CONTROL
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
              EVENT CONTROL
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Reward system
            </Text>
          </View>
        </View>

        <View
          style={
            styles.rewardControlCard
          }
        >
          <View
            style={
              styles.rewardControlTop
            }
          >
            <View
              style={
                styles.rewardIcon
              }
            >
              <Text
                style={
                  styles.rewardIconText
                }
              >
                %
              </Text>
            </View>

            <View
              style={
                styles.rewardControlContent
              }
            >
              <Text
                style={
                  styles.rewardControlTitle
                }
              >
                Reward wheel
              </Text>

              <Text
                style={
                  styles.rewardControlDescription
                }
              >
                Control whether sales can
                access the reward wheel after
                a confirmed order.
              </Text>
            </View>

            <Switch
              value={
                rewardEnabled
              }
              onValueChange={
                handleRewardToggle
              }
              disabled={
                loadingRewardMode ||
                savingRewardMode
              }
              trackColor={{
                false:
                  '#cbd5e1',
                true:
                  '#93c5fd',
              }}
              thumbColor={
                rewardEnabled
                  ? '#2563eb'
                  : '#f8fafc'
              }
              ios_backgroundColor="#cbd5e1"
            />
          </View>

          <View
            style={[
              styles.rewardStatus,
              rewardEnabled
                ? styles.rewardStatusOn
                : styles.rewardStatusOff,
            ]}
          >
            <View
              style={[
                styles.rewardStatusDot,
                rewardEnabled
                  ? styles.rewardStatusDotOn
                  : styles.rewardStatusDotOff,
              ]}
            />

            <View
              style={
                styles.rewardStatusContent
              }
            >
              <Text
                style={[
                  styles.rewardStatusTitle,
                  rewardEnabled
                    ? styles.rewardStatusTitleOn
                    : styles.rewardStatusTitleOff,
                ]}
              >
                {rewardEnabled
                  ? 'REWARD EVENT ACTIVE'
                  : 'REWARD EVENT OFF'}
              </Text>

              <Text
                style={
                  styles.rewardStatusText
                }
              >
                {rewardEnabled
                  ? 'Sales can spin after a confirmed order.'
                  : 'Sales can continue recording orders without spinning.'}
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
         * PERFORMANCE
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
              TODAY
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Performance
            </Text>
          </View>

          <View
            style={
              styles.dataBadge
            }
          >
            <View
              style={
                styles.dataBadgeDot
              }
            />

            <Text
              style={
                styles.dataBadgeText
              }
            >
              LIVE
            </Text>
          </View>
        </View>

        {loading &&
        !stats ? (
          <View
            style={
              styles.loadingCard
            }
          >
            <ActivityIndicator
              size="small"
              color="#2563eb"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading today's performance...
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              icon="V"
              value={
                todayVisits.toLocaleString()
              }
              label="VISITS"
              hint="Store visits today"
            />

            <StatCard
              icon="O"
              value={
                todayOrders.toLocaleString()
              }
              label="ORDERS"
              hint="Confirmed orders today"
            />

            <StatCard
              icon="S"
              value={
                salesCount.toLocaleString()
              }
              label="SALES"
              hint="Sales representatives"
            />

            <StatCard
              icon="L"
              value={
                storesCount.toLocaleString()
              }
              label="STORES"
              hint="Registered stores"
            />
          </View>
        )}

        {/* ====================================================
         * CONVERSION
         * ==================================================== */}

        <View
          style={
            styles.conversionCard
          }
        >
          <View
            style={
              styles.conversionTop
            }
          >
            <View>
              <Text
                style={
                  styles.conversionEyebrow
                }
              >
                VISIT → ORDER
              </Text>

              <Text
                style={
                  styles.conversionTitle
                }
              >
                Order conversion
              </Text>
            </View>

            <Text
              style={
                styles.conversionPercent
              }
            >
              {conversionRate.toFixed(
                1
              )}
              %
            </Text>
          </View>

          <View
            style={
              styles.conversionBarBackground
            }
          >
            <View
              style={[
                styles.conversionBarFill,
                {
                  width: `${Math.min(
                    conversionRate,
                    100
                  )}%`,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.conversionBottom
            }
          >
            <Text
              style={
                styles.conversionText
              }
            >
              {todayOrders} orders from{' '}
              {todayVisits} visits
            </Text>

            <Text
              style={
                styles.conversionTarget
              }
            >
              TODAY
            </Text>
          </View>
        </View>

        {/* ====================================================
         * TOP SALES
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
              TEAM PERFORMANCE
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Top sales today
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push(
                '/admin/sales'
              )
            }
          >
            <Text
              style={
                styles.viewAllText
              }
            >
              VIEW ALL →
            </Text>
          </Pressable>
        </View>

        <View
          style={
            styles.rankingCard
          }
        >
          {topSales.length ===
          0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                No sales activity today
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Sales performance will appear
                here once visits are recorded.
              </Text>
            </View>
          ) : (
            topSales.map(
              (
                sales,
                index
              ) => (
                <Pressable
                  key={
                    sales.salesId
                  }
                  style={({ pressed }) => [
                    styles.salesRow,
                    pressed &&
                      styles.rowPressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname:
                        '/admin/sales/[id]',
                      params: {
                        id:
                          sales.salesId,
                      },
                    })
                  }
                >
                  <View
                    style={
                      styles.rankNumber
                    }
                  >
                    <Text
                      style={
                        styles.rankNumberText
                      }
                    >
                      {String(
                        index +
                          1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.avatar
                    }
                  >
                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {sales.salesName
                        .charAt(
                          0
                        )
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.salesInfo
                    }
                  >
                    <Text
                      style={
                        styles.salesName
                      }
                    >
                      {
                        sales.salesName
                      }
                    </Text>

                    <Text
                      style={
                        styles.salesMeta
                      }
                    >
                      {
                        sales.visits
                      }{' '}
                      visits •{' '}
                      {
                        sales.orders
                      }{' '}
                      orders
                    </Text>
                  </View>

                  <View
                    style={
                      styles.salesConversion
                    }
                  >
                    <Text
                      style={
                        styles.salesConversionValue
                      }
                    >
                      {sales.conversionRate.toFixed(
                        1
                      )}
                      %
                    </Text>

                    <Text
                      style={
                        styles.salesConversionLabel
                      }
                    >
                      CONV.
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.salesArrow
                    }
                  >
                    →
                  </Text>
                </Pressable>
              )
            )
          )}
        </View>

        {/* ====================================================
         * ROUTES
         * ==================================================== */}

        <View
          style={
            styles.routeSummaryCard
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
              styles.routeSummaryContent
            }
          >
            <Text
              style={
                styles.routeSummaryLabel
              }
            >
              TODAY'S ROUTES
            </Text>

            <Text
              style={
                styles.routeSummaryValue
              }
            >
              {todayRoutes}
            </Text>

            <Text
              style={
                styles.routeSummaryText
              }
            >
              Sales representatives with
              recorded activity
            </Text>
          </View>

          <Pressable
            style={
              styles.routeButton
            }
            onPress={() =>
              router.push(
                '/admin/routes'
              )
            }
          >
            <Text
              style={
                styles.routeButtonText
              }
            >
              VIEW
            </Text>

            <Text
              style={
                styles.routeButtonArrow
              }
            >
              →
            </Text>
          </Pressable>
        </View>

        {/* ====================================================
         * ROUTE ALERTS
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
              ROUTE MONITORING
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Attention required
            </Text>
          </View>

          <View
            style={
              styles.alertCountBadge
            }
          >
            <Text
              style={
                styles.alertCountText
              }
            >
              {
                routeAlerts.length
              }
            </Text>
          </View>
        </View>

        <View
          style={
            styles.alertCard
          }
        >
          {routeAlerts.length ===
          0 ? (
            <View
              style={
                styles.alertEmpty
              }
            >
              <View
                style={
                  styles.alertEmptyIcon
                }
              >
                <Text
                  style={
                    styles.alertEmptyIconText
                  }
                >
                  ✓
                </Text>
              </View>

              <View
                style={
                  styles.alertEmptyContent
                }
              >
                <Text
                  style={
                    styles.alertEmptyTitle
                  }
                >
                  No route issues detected
                </Text>

                <Text
                  style={
                    styles.alertEmptyText
                  }
                >
                  No unusually long gaps were found
                  in today's recorded visits.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {routeAlerts.map(
                (
                  alert,
                  index
                ) => (
                  <Pressable
                    key={`${alert.salesId}-${index}`}
                    style={({ pressed }) => [
                      styles.alertRow,

                      index <
                        routeAlerts.length -
                          1 &&
                        styles.alertRowBorder,

                      pressed &&
                        styles.rowPressed,
                    ]}
                    onPress={() =>
                      router.push(
                        '/admin/routes'
                      )
                    }
                  >
                    <View
                      style={[
                        styles.alertIcon,
                        alert.severity ===
                          'warning'
                          ? styles.alertIconWarning
                          : styles.alertIconInfo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.alertIconText,
                          alert.severity ===
                            'warning'
                            ? styles.alertIconTextWarning
                            : styles.alertIconTextInfo,
                        ]}
                      >
                        {alert.severity ===
                        'warning'
                          ? '!'
                          : 'i'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.alertContent
                      }
                    >
                      <Text
                        style={
                          styles.alertName
                        }
                      >
                        {
                          alert.salesName
                        }
                      </Text>

                      <Text
                        style={
                          styles.alertMessage
                        }
                      >
                        {
                          alert.message
                        }
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.alertArrow
                      }
                    >
                      →
                    </Text>
                  </Pressable>
                )
              )}

              <Pressable
                style={
                  styles.alertFooter
                }
                onPress={() =>
                  router.push(
                    '/admin/routes'
                  )
                }
              >
                <Text
                  style={
                    styles.alertFooterText
                  }
                >
                  OPEN ROUTE MONITOR
                </Text>

                <Text
                  style={
                    styles.alertFooterArrow
                  }
                >
                  →
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ====================================================
         * MANAGEMENT
         * ==================================================== */}

        <View
          style={
            styles.managementHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              MANAGEMENT
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Operations
            </Text>
          </View>

          <Text
            style={
              styles.managementCount
            }
          >
            {
              ADMIN_SECTIONS.length
            }{' '}
            MODULES
          </Text>
        </View>

        <View
          style={
            styles.menuList
          }
        >
          {ADMIN_SECTIONS.map(
            (
              section,
              index
            ) => (
              <Pressable
                key={
                  section.route
                }
                style={({ pressed }) => [
                  styles.menuCard,
                  pressed &&
                    styles.rowPressed,
                ]}
                onPress={() =>
                  router.push(
                    section.route
                  )
                }
              >
                <Text
                  style={
                    styles.menuNumber
                  }
                >
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    '0'
                  )}
                </Text>

                <View
                  style={[
                    styles.menuIcon,
                    {
                      backgroundColor:
                        section.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.menuIconText,
                      {
                        color:
                          section.accent,
                      },
                    ]}
                  >
                    {
                      section.shortLabel
                    }
                  </Text>
                </View>

                <View
                  style={
                    styles.menuContent
                  }
                >
                  <Text
                    style={
                      styles.menuTitle
                    }
                  >
                    {
                      section.title
                    }
                  </Text>

                  <Text
                    style={
                      styles.menuDescription
                    }
                  >
                    {
                      section.description
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.menuArrowText
                  }
                >
                  →
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* ====================================================
         * DATABASE STATUS
         * ==================================================== */}

        <View
          style={
            styles.systemCard
          }
        >
          <View
            style={
              styles.systemIcon
            }
          >
            <View
              style={
                styles.systemIconDot
              }
            />
          </View>

          <View
            style={
              styles.systemContent
            }
          >
            <Text
              style={
                styles.systemTitle
              }
            >
              Live database connected
            </Text>

            <Text
              style={
                styles.systemText
              }
            >
              Dashboard metrics, sales rankings
              and route alerts are being read
              directly from Supabase.
            </Text>
          </View>
        </View>

        {/* ====================================================
         * SIGN OUT
         * ==================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed &&
              styles.rowPressed,
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
            Sign out of admin
          </Text>

          <Text
            style={
              styles.signOutArrow
            }
          >
            →
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
              styles.footerLine
            }
          />

          <Text
            style={
              styles.footerText
            }
          >
            SALES MAN • ADMIN CONSOLE
          </Text>

          <View
            style={
              styles.footerLine
            }
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function StatCard({
  icon,
  value,
  label,
  hint,
}: {
  icon: string;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <View
        style={
          styles.statIcon
        }
      >
        <Text
          style={
            styles.statIconText
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.statHint
        }
      >
        {hint}
      </Text>
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
    container: {
      paddingBottom: 34,
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

    loadingCard: {
      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e2e8f0',

      borderRadius: 18,

      paddingVertical: 30,

      alignItems:
        'center',

      marginBottom: 20,
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

      marginTop: 7,
    },

    /*
     * HERO
     */

    hero: {
      backgroundColor:
        '#111827',

      borderRadius: 24,

      padding: 20,

      marginBottom: 25,
    },

    heroTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    heroContent: {
      flex: 1,

      paddingRight: 15,
    },

    heroEyebrow: {
      fontSize: 8,

      fontWeight:
        '900',

      color:
        '#60a5fa',

      letterSpacing:
        1.7,

      marginBottom: 7,
    },

    heroTitle: {
      fontSize: 25,

      lineHeight: 30,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },

    heroDescription: {
      fontSize: 10,

      lineHeight: 16,

      color:
        '#9ca3af',

      marginTop: 8,
    },

    heroMark: {
      width: 62,

      height: 62,

      borderRadius: 19,

      backgroundColor:
        '#1e293b',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#334155',
    },

    heroMarkText: {
      fontSize: 24,

      fontWeight:
        '900',

      color:
        '#60a5fa',
    },

    heroDivider: {
      height: 1,

      backgroundColor:
        '#273244',

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

    heroStatusLabel: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#64748b',

      letterSpacing:
        1,

      marginBottom: 4,
    },

    systemStatus: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    onlineDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        '#34d399',

      marginRight: 6,
    },

    systemStatusText: {
      fontSize: 9,

      fontWeight:
        '800',

      color:
        '#d1fae5',
    },

    liveBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#1e293b',

      borderWidth: 1,

      borderColor:
        '#334155',

      borderRadius: 999,

      paddingHorizontal: 9,

      paddingVertical: 5,
    },

    liveBadgeDot: {
      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        '#34d399',

      marginRight: 5,
    },

    liveBadgeText: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#86efac',

      letterSpacing:
        1,
    },

    /*
     * ERROR
     */

    errorCard: {
      backgroundColor:
        '#fef2f2',

      borderWidth: 1,

      borderColor:
        '#fecaca',

      borderRadius: 16,

      padding: 13,

      marginBottom: 20,
    },

    errorTitle: {
      fontSize: 11,

      fontWeight:
        '900',

      color:
        '#991b1b',

      marginBottom: 3,
    },

    errorText: {
      fontSize: 8.5,

      lineHeight: 13,

      color:
        '#b91c1c',
    },

    retryButton: {
      alignSelf:
        'flex-start',

      backgroundColor:
        '#991b1b',

      borderRadius: 8,

      paddingHorizontal: 10,

      paddingVertical: 6,

      marginTop: 9,
    },

    retryText: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#ffffff',

      letterSpacing:
        0.6,
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
      fontSize: 8,

      fontWeight:
        '900',

      color:
        '#94a3b8',

      letterSpacing:
        1.3,

      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 18,

      fontWeight:
        '900',

      color:
        '#111827',
    },

    viewAllText: {
      fontSize: 7.5,

      fontWeight:
        '900',

      color:
        '#2563eb',

      letterSpacing:
        0.5,
    },

    dataBadge: {
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

    dataBadgeDot: {
      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        '#22c55e',

      marginRight: 5,
    },

    dataBadgeText: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#15803d',

      letterSpacing:
        0.7,
    },

    /*
     * REWARD CONTROL
     */

    rewardControlCard: {
      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e2e8f0',

      borderRadius: 20,

      padding: 16,

      marginBottom: 25,
    },

    rewardControlTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    rewardIcon: {
      width: 44,

      height: 44,

      borderRadius: 13,

      backgroundColor:
        '#fdf2f8',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,
    },

    rewardIconText: {
      fontSize: 19,

      fontWeight:
        '900',

      color:
        '#db2777',
    },

    rewardControlContent: {
      flex: 1,

      paddingRight: 8,
    },

    rewardControlTitle: {
      fontSize: 13,

      fontWeight:
        '900',

      color:
        '#111827',

      marginBottom: 3,
    },

    rewardControlDescription: {
      fontSize: 9,

      lineHeight: 14,

      color:
        '#94a3b8',
    },

    rewardStatus: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 14,

      padding: 11,

      marginTop: 14,
    },

    rewardStatusOn: {
      backgroundColor:
        '#f0fdf4',
    },

    rewardStatusOff: {
      backgroundColor:
        '#f8fafc',
    },

    rewardStatusDot: {
      width: 9,

      height: 9,

      borderRadius: 5,

      marginRight: 9,
    },

    rewardStatusDotOn: {
      backgroundColor:
        '#16a34a',
    },

    rewardStatusDotOff: {
      backgroundColor:
        '#94a3b8',
    },

    rewardStatusContent: {
      flex: 1,
    },

    rewardStatusTitle: {
      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing:
        0.8,

      marginBottom: 3,
    },

    rewardStatusTitleOn: {
      color:
        '#15803d',
    },

    rewardStatusTitleOff: {
      color:
        '#64748b',
    },

    rewardStatusText: {
      fontSize: 8.5,

      lineHeight: 13,

      color:
        '#94a3b8',
    },

    /*
     * STATS
     */

    statsGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap: 8,

      marginBottom: 12,
    },

    statCard: {
      width: '48%',

      minHeight: 126,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e2e8f0',

      borderRadius: 18,

      padding: 13,
    },

    statIcon: {
      width: 35,

      height: 35,

      borderRadius: 10,

      backgroundColor:
        '#f8fafc',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 10,
    },

    statIconText: {
      fontSize: 13,

      fontWeight:
        '900',

      color:
        '#475569',
    },

    statValue: {
      fontSize: 22,

      fontWeight:
        '900',

      color:
        '#111827',

      marginBottom: 2,
    },

    statLabel: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#475569',

      letterSpacing:
        0.7,

      marginBottom: 2,
    },

    statHint: {
      fontSize: 7.5,

      lineHeight: 11,

      color:
        '#94a3b8',
    },

    /*
     * CONVERSION
     */

    conversionCard: {
      backgroundColor:
        '#111827',

      borderRadius: 20,

      padding: 16,

      marginBottom: 25,
    },

    conversionTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 13,
    },

    conversionEyebrow: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#60a5fa',

      letterSpacing:
        1,

      marginBottom: 4,
    },

    conversionTitle: {
      fontSize: 14,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },

    conversionPercent: {
      fontSize: 26,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },

    conversionBarBackground: {
      height: 9,

      borderRadius: 999,

      backgroundColor:
        '#1e293b',

      overflow:
        'hidden',
    },

    conversionBarFill: {
      height:
        '100%',

      borderRadius:
        999,

      backgroundColor:
        '#34d399',
    },

    conversionBottom: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop: 9,
    },

    conversionText: {
      fontSize: 8.5,

      color:
        '#94a3b8',
    },

    conversionTarget: {
      fontSize: 6.5,

      fontWeight:
        '900',

      color:
        '#64748b',

      letterSpacing:
        0.8,
    },

    /*
     * RANKING
     */

    rankingCard: {
      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e2e8f0',

      borderRadius: 20,

      overflow:
        'hidden',

      marginBottom: 25,
    },

    salesRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        13,

      paddingVertical:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#f1f5f9',
    },

    rowPressed: {
      opacity: 0.7,

      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    rankNumber: {
      width: 24,
    },

    rankNumberText: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#cbd5e1',
    },

    avatar: {
      width: 39,

      height: 39,

      borderRadius: 13,

      backgroundColor:
        '#eff6ff',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 10,
    },

    avatarText: {
      fontSize: 12,

      fontWeight:
        '900',

      color:
        '#2563eb',
    },

    salesInfo: {
      flex: 1,
    },

    salesName: {
      fontSize: 11,

      fontWeight:
        '900',

      color:
        '#111827',

      marginBottom: 3,
    },

    salesMeta: {
      fontSize: 8,

      color:
        '#94a3b8',
    },

    salesConversion: {
      alignItems:
        'flex-end',

      marginRight: 9,
    },

    salesConversionValue: {
      fontSize: 11,

      fontWeight:
        '900',

      color:
        '#16a34a',
    },

    salesConversionLabel: {
      fontSize: 5.5,

      fontWeight:
        '900',

      color:
        '#94a3b8',

      letterSpacing:
        0.5,
    },

    salesArrow: {
      fontSize: 16,

      fontWeight:
        '800',

      color:
        '#cbd5e1',
    },

    emptyCard: {
      padding: 22,

      alignItems:
        'center',
    },

    emptyTitle: {
      fontSize: 11,

      fontWeight:
        '900',

      color:
        '#334155',
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
     * ROUTES
     */

    routeSummaryCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#111827',

      borderRadius: 18,

      padding: 14,

      marginBottom: 25,
    },

    routeSummaryIcon: {
      width: 43,

      height: 43,

      borderRadius: 13,

      backgroundColor:
        '#1e293b',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,
    },

    routeSummaryIconText: {
      fontSize: 13,

      fontWeight:
        '900',

      color:
        '#60a5fa',
    },

    routeSummaryContent: {
      flex: 1,
    },

    routeSummaryLabel: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#60a5fa',

      letterSpacing:
        1,

      marginBottom: 3,
    },

    routeSummaryValue: {
      fontSize: 20,

      fontWeight:
        '900',

      color:
        '#ffffff',

      marginBottom: 2,
    },

    routeSummaryText: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#94a3b8',
    },

    routeButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#2563eb',

      borderRadius: 10,

      paddingHorizontal: 9,

      paddingVertical: 8,

      marginLeft: 8,
    },

    routeButtonText: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },

    routeButtonArrow: {
      fontSize: 12,

      fontWeight:
        '900',

      color:
        '#dbeafe',

      marginLeft: 5,
    },

    /*
     * ALERTS
     */

    alertCountBadge: {
      minWidth: 22,

      height: 22,

      borderRadius: 11,

      backgroundColor:
        '#fef2f2',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    alertCountText: {
      fontSize: 8,

      fontWeight:
        '900',

      color:
        '#dc2626',
    },

    alertCard: {
      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#e2e8f0',

      borderRadius: 20,

      overflow:
        'hidden',

      marginBottom: 25,
    },

    alertRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      padding: 13,
    },

    alertRowBorder: {
      borderBottomWidth:
        1,

      borderBottomColor:
        '#f1f5f9',
    },

    alertIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 10,
    },

    alertIconWarning: {
      backgroundColor:
        '#fef2f2',
    },

    alertIconInfo: {
      backgroundColor:
        '#eff6ff',
    },

    alertIconText: {
      fontSize: 14,

      fontWeight:
        '900',
    },

    alertIconTextWarning: {
      color:
        '#dc2626',
    },

    alertIconTextInfo: {
      color:
        '#2563eb',
    },

    alertContent: {
      flex: 1,
    },

    alertName: {
      fontSize: 10,

      fontWeight:
        '900',

      color:
        '#111827',

      marginBottom: 2,
    },

    alertMessage: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#94a3b8',
    },

    alertArrow: {
      fontSize: 16,

      fontWeight:
        '800',

      color:
        '#cbd5e1',

      marginLeft: 8,
    },

    alertFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      backgroundColor:
        '#f8fafc',
    },

    alertFooterText: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#475569',

      letterSpacing:
        0.7,
    },

    alertFooterArrow: {
      fontSize: 15,

      fontWeight:
        '800',

      color:
        '#94a3b8',
    },

    alertEmpty: {
      flexDirection:
        'row',

      alignItems:
        'center',

      padding: 15,
    },

    alertEmptyIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:
        '#ecfdf5',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 10,
    },

    alertEmptyIconText: {
      fontSize: 14,

      fontWeight:
        '900',

      color:
        '#16a34a',
    },

    alertEmptyContent: {
      flex: 1,
    },

    alertEmptyTitle: {
      fontSize: 10,

      fontWeight:
        '900',

      color:
        '#166534',

      marginBottom: 2,
    },

    alertEmptyText: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#94a3b8',
    },

    /*
     * MANAGEMENT
     */

    managementHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      marginBottom: 9,
    },

    managementCount: {
      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#94a3b8',

      letterSpacing:
        0.8,
    },

    menuList: {
      gap: 8,

      marginBottom: 20,
    },

    menuCard: {
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
    },

    menuNumber: {
      width: 23,

      fontSize: 7,

      fontWeight:
        '900',

      color:
        '#cbd5e1',
    },

    menuIcon: {
      width: 39,

      height: 39,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 10,
    },

    menuIconText: {
      fontSize: 12,

      fontWeight:
        '900',
    },

    menuContent: {
      flex: 1,
    },

    menuTitle: {
      fontSize: 12,

      fontWeight:
        '900',

      color:
        '#111827',

      marginBottom: 3,
    },

    menuDescription: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#94a3b8',
    },

    menuArrowText: {
      fontSize: 17,

      fontWeight:
        '800',

      color:
        '#cbd5e1',

      marginLeft: 8,
    },

    /*
     * SYSTEM
     */

    systemCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#f0fdf4',

      borderWidth: 1,

      borderColor:
        '#bbf7d0',

      borderRadius: 16,

      padding: 13,

      marginBottom: 12,
    },

    systemIcon: {
      width: 32,

      height: 32,

      borderRadius: 10,

      backgroundColor:
        '#dcfce7',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 10,
    },

    systemIconDot: {
      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor:
        '#22c55e',
    },

    systemContent: {
      flex: 1,
    },

    systemTitle: {
      fontSize: 10,

      fontWeight:
        '900',

      color:
        '#166534',

      marginBottom: 2,
    },

    systemText: {
      fontSize: 8,

      lineHeight: 12,

      color:
        '#65a30d',
    },

    /*
     * SIGN OUT
     */

    signOutButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingVertical: 14,

      paddingHorizontal: 6,

      marginBottom: 17,
    },

    signOutText: {
      fontSize: 10,

      fontWeight:
        '800',

      color:
        '#94a3b8',
    },

    signOutArrow: {
      fontSize: 15,

      fontWeight:
        '800',

      color:
        '#cbd5e1',
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

      paddingBottom: 12,
    },

    footerLine: {
      width: 28,

      height: 1,

      backgroundColor:
        '#e2e8f0',

      marginHorizontal: 8,
    },

    footerText: {
      fontSize: 6.5,

      color:
        '#c4c7ce',

      fontWeight:
        '800',

      letterSpacing:
        0.8,
    },
  });