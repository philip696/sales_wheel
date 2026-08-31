import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAuth } from '@/src/features/auth/useAuth';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ADMIN_SECTIONS = [
  {
    title: 'Attendance',
    description: 'Monitor visits, GPS and photo evidence',
    shortLabel: 'ATT',
    accent: '#2563eb',
    background: '#eff6ff',
    route: '/admin/attendance',
  },
  {
    title: 'Sales Routes',
    description: 'View each salesperson route by day',
    shortLabel: 'ROUTE',
    accent: '#0891b2',
    background: '#ecfeff',
    route: '/admin/routes',
  },
  {
    title: 'Events',
    description: 'Review rewards and sales activity',
    shortLabel: 'EVENT',
    accent: '#7c3aed',
    background: '#f5f3ff',
    route: '/admin/events',
  },
  {
    title: 'Stores',
    description: 'Manage registered store locations',
    shortLabel: 'STORE',
    accent: '#059669',
    background: '#ecfdf5',
    route: '/admin/stores',
  },
  {
    title: 'Sales Team',
    description: 'Manage sales representatives',
    shortLabel: 'TEAM',
    accent: '#ea580c',
    background: '#fff7ed',
    route: '/admin/sales',
  },
] as const;

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  const [salesCount, setSalesCount] = useState(0);
  const [storesCount, setStoresCount] = useState(0);

  const firstName = profile?.name?.trim()
    ? profile.name.trim().split(' ')[0]
    : 'Admin';

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      /*
       * Fetch only the count.
       *
       * head: true means Supabase does not return
       * the actual rows, only the count.
       */

      const [
        { count: salesCountResult, error: salesError },
        { count: storesCountResult, error: storesError },
      ] = await Promise.all([
        supabase
          .from('sales')
          .select('*', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('stores')
          .select('*', {
            count: 'exact',
            head: true,
          }),
      ]);

      if (salesError) {
        console.error(
          'FETCH SALES COUNT ERROR:',
          salesError
        );
      } else {
        setSalesCount(salesCountResult ?? 0);
      }

      if (storesError) {
        console.error(
          'FETCH STORES COUNT ERROR:',
          storesError
        );
      } else {
        setStoresCount(storesCountResult ?? 0);
      }
    } catch (error) {
      console.error(
        'FETCH DASHBOARD STATS ERROR:',
        error
      );
    }
  }

  return (
    <ScreenContainer
      title="Admin"
      subtitle={`Welcome back, ${firstName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* =========================
            HERO
        ========================= */}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                SALES OPERATIONS
              </Text>

              <Text style={styles.heroTitle}>
                Control Center
              </Text>

              <Text style={styles.heroDescription}>
                Monitor your team, stores, routes, attendance
                and reward activity from one place.
              </Text>
            </View>

            <View style={styles.heroMark}>
              <Text style={styles.heroMarkText}>
                A
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroBottom}>
            <View>
              <Text style={styles.heroStatusLabel}>
                SYSTEM STATUS
              </Text>

              <View style={styles.systemStatus}>
                <View style={styles.onlineDot} />

                <Text style={styles.systemStatusText}>
                  Operational
                </Text>
              </View>
            </View>

            <Text style={styles.heroDate}>
              ADMIN
            </Text>
          </View>
        </View>

        {/* =========================
            OVERVIEW
        ========================= */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              OVERVIEW
            </Text>

            <Text style={styles.sectionTitle}>
              Business snapshot
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />

            <Text style={styles.liveBadgeText}>
              LIVE
            </Text>
          </View>
        </View>

        {/* =========================
            STATS
        ========================= */}

        <View style={styles.statsRow}>
          <Stat
            icon="S"
            label="SALES"
            hint="Representatives"
            value={salesCount}
          />

          <Stat
            icon="L"
            label="STORES"
            hint="Registered locations"
            value={storesCount}
          />

          <Stat
            icon="R"
            label="ROUTES"
            hint="Daily route history"
            value="—"
          />
        </View>

        {/* =========================
            MANAGEMENT
        ========================= */}

        <View style={styles.managementHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              MANAGEMENT
            </Text>

            <Text style={styles.sectionTitle}>
              Operations
            </Text>
          </View>

          <Text style={styles.managementCount}>
            {ADMIN_SECTIONS.length} MODULES
          </Text>
        </View>

        <View style={styles.menuList}>
          {ADMIN_SECTIONS.map((section, index) => (
            <Pressable
              key={section.route}
              style={({ pressed }) => [
                styles.menuCard,
                pressed && styles.menuCardPressed,
              ]}
              onPress={() =>
                router.push(section.route)
              }
            >
              <Text style={styles.menuNumber}>
                {String(index + 1).padStart(2, '0')}
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
                      color: section.accent,
                    },
                  ]}
                >
                  {section.shortLabel.charAt(0)}
                </Text>
              </View>

              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>
                  {section.title}
                </Text>

                <Text style={styles.menuDescription}>
                  {section.description}
                </Text>
              </View>

              <View style={styles.menuArrow}>
                <Text style={styles.menuArrowText}>
                  →
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* =========================
            SYSTEM CARD
        ========================= */}

        <View style={styles.systemCard}>
          <View style={styles.systemIcon}>
            <View style={styles.systemIconDot} />
          </View>

          <View style={styles.systemContent}>
            <Text style={styles.systemTitle}>
              Dashboard connected
            </Text>

            <Text style={styles.systemText}>
              Sales and store totals are being fetched
              directly from Supabase.
            </Text>
          </View>
        </View>

        {/* =========================
            SIGN OUT
        ========================= */}

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.menuCardPressed,
          ]}
          onPress={signOut}
        >
          <Text style={styles.signOutText}>
            Sign out of admin
          </Text>

          <Text style={styles.signOutArrow}>
            →
          </Text>
        </Pressable>

        {/* =========================
            FOOTER
        ========================= */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>
            SALES WHEEL • ADMIN CONSOLE
          </Text>

          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/* =========================================
   STAT COMPONENT
========================================= */

function Stat({
  icon,
  label,
  hint,
  value,
}: {
  icon: string;
  label: string;
  hint: string;
  value: number | string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Text style={styles.statIconText}>
          {icon}
        </Text>
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text style={styles.statHint}>
        {hint}
      </Text>
    </View>
  );
}

/* =========================================
   STYLES
========================================= */

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },

  /* HERO */

  hero: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroContent: {
    flex: 1,
    paddingRight: 15,
  },

  heroEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    color: '#60a5fa',
    letterSpacing: 1.7,
    marginBottom: 7,
  },

  heroTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    color: '#fff',
  },

  heroDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: '#9ca3af',
    marginTop: 8,
  },

  heroMark: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  heroMarkText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#60a5fa',
  },

  heroDivider: {
    height: 1,
    backgroundColor: '#273244',
    marginVertical: 17,
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroStatusLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
    marginRight: 6,
  },

  systemStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d1d5db',
  },

  heroDate: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 1.2,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  managementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 3,
  },

  /* LIVE BADGE */

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },

  liveBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#059669',
  },

  /* STATS */

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 25,
  },

  statCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 12,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563eb',
  },

  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 2,
  },

  statHint: {
    fontSize: 7.5,
    color: '#94a3b8',
    marginTop: 4,
  },

  managementCount: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },

  /* MENU */

  menuList: {
    gap: 9,
  },

  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 13,
  },

  menuCardPressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  menuNumber: {
    width: 23,
    fontSize: 8,
    fontWeight: '900',
    color: '#cbd5e1',
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  menuIconText: {
    fontSize: 16,
    fontWeight: '900',
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },

  menuDescription: {
    fontSize: 8.5,
    lineHeight: 13,
    color: '#94a3b8',
  },

  menuArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuArrowText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#94a3b8',
  },

  /* SYSTEM CARD */

  systemCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 13,
    marginTop: 16,
  },

  systemIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  systemIconDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },

  systemContent: {
    flex: 1,
  },

  systemTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  systemText: {
    fontSize: 8.5,
    lineHeight: 13,
    color: '#94a3b8',
  },

  /* SIGN OUT */

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },

  signOutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
  },

  signOutArrow: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '900',
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },

  footerLine: {
    height: 1,
    flex: 1,
    backgroundColor: '#e2e8f0',
  },

  footerText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
});