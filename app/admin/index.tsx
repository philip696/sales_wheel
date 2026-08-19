import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAuth } from '@/src/features/auth/useAuth';

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
    title: 'Spin History',
    description: 'Review rewards and sales activity',
    shortLabel: 'SPIN',
    accent: '#7c3aed',
    background: '#f5f3ff',
    route: '/admin/spins',
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
  {
    title: 'Rewards',
    description: 'Configure rewards and probabilities',
    shortLabel: 'REWARD',
    accent: '#db2777',
    background: '#fdf2f8',
    route: '/admin/rewards',
  },
] as const;

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  const firstName = profile?.name?.trim()
    ? profile.name.trim().split(' ')[0]
    : 'Admin';

  return (
    <ScreenContainer
      title="Admin"
      subtitle={`Welcome back, ${firstName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* =====================================================
         * EXECUTIVE HEADER
         * ===================================================== */}

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
                Monitor your team, stores, attendance and
                reward activity from one place.
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

        {/* =====================================================
         * OVERVIEW
         * ===================================================== */}

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

        <View style={styles.statsRow}>
          {/* SALES */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconBlue,
              ]}
            >
              <Text
                style={[
                  styles.statIconText,
                  styles.statIconTextBlue,
                ]}
              >
                S
              </Text>
            </View>

            <Text style={styles.statValue}>
              —
            </Text>

            <Text style={styles.statLabel}>
              SALES
            </Text>

            <Text style={styles.statHint}>
              Representatives
            </Text>
          </View>

          {/* STORES */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconGreen,
              ]}
            >
              <Text
                style={[
                  styles.statIconText,
                  styles.statIconTextGreen,
                ]}
              >
                L
              </Text>
            </View>

            <Text style={styles.statValue}>
              —
            </Text>

            <Text style={styles.statLabel}>
              STORES
            </Text>

            <Text style={styles.statHint}>
              Registered locations
            </Text>
          </View>

          {/* SPINS */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statIconPurple,
              ]}
            >
              <Text
                style={[
                  styles.statIconText,
                  styles.statIconTextPurple,
                ]}
              >
                R
              </Text>
            </View>

            <Text style={styles.statValue}>
              —
            </Text>

            <Text style={styles.statLabel}>
              SPINS
            </Text>

            <Text style={styles.statHint}>
              Reward activity
            </Text>
          </View>
        </View>

        {/* =====================================================
         * MANAGEMENT
         * ===================================================== */}

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

        {/* =====================================================
         * MANAGEMENT LIST
         * ===================================================== */}

        <View style={styles.menuList}>
          {ADMIN_SECTIONS.map((section, index) => (
            <Pressable
              key={section.route}
              style={({ pressed }) => [
                styles.menuCard,
                pressed && styles.menuCardPressed,
              ]}
              onPress={() => router.push(section.route)}
            >
              {/* NUMBER */}

              <Text style={styles.menuNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>

              {/* ICON */}

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

              {/* CONTENT */}

              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>
                  {section.title}
                </Text>

                <Text style={styles.menuDescription}>
                  {section.description}
                </Text>
              </View>

              {/* ARROW */}

              <View style={styles.menuArrow}>
                <Text style={styles.menuArrowText}>
                  →
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* =====================================================
         * SYSTEM INFORMATION
         * ===================================================== */}

        <View style={styles.systemCard}>
          <View style={styles.systemIcon}>
            <View style={styles.systemIconDot} />
          </View>

          <View style={styles.systemContent}>
            <Text style={styles.systemTitle}>
              Dashboard connected
            </Text>

            <Text style={styles.systemText}>
              Management modules are connected to the
              application. Live KPI counters will appear
              when their respective services are enabled.
            </Text>
          </View>
        </View>

        {/* =====================================================
         * SIGN OUT
         * ===================================================== */}

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

        {/* =====================================================
         * FOOTER
         * ===================================================== */}

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

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },

  /* =========================================================
   * HERO
   * ========================================================= */

  hero: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
    overflow: 'hidden',
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
    color: '#ffffff',
    letterSpacing: -0.7,
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

  /* =========================================================
   * SECTION HEADERS
   * ========================================================= */

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
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 1,
  },

  liveBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },

  liveBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
  },

  managementCount: {
    fontSize: 7,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  /* =========================================================
   * STATS
   * ========================================================= */

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 27,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 12,
    minHeight: 127,
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  statIconBlue: {
    backgroundColor: '#eff6ff',
  },

  statIconGreen: {
    backgroundColor: '#ecfdf5',
  },

  statIconPurple: {
    backgroundColor: '#f5f3ff',
  },

  statIconText: {
    fontSize: 13,
    fontWeight: '900',
  },

  statIconTextBlue: {
    color: '#2563eb',
  },

  statIconTextGreen: {
    color: '#059669',
  },

  statIconTextPurple: {
    color: '#7c3aed',
  },

  statValue: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
    color: '#111827',
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.8,
    marginTop: 3,
  },

  statHint: {
    fontSize: 8,
    color: '#a1a1aa',
    marginTop: 3,
  },

  /* =========================================================
   * MENU
   * ========================================================= */

  menuList: {
    marginBottom: 8,
  },

  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 9,
  },

  menuCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },

  menuNumber: {
    width: 25,
    fontSize: 8,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 0.5,
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
    fontSize: 13,
    fontWeight: '900',
  },

  menuContent: {
    flex: 1,
    paddingRight: 8,
  },

  menuTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },

  menuDescription: {
    fontSize: 9,
    lineHeight: 14,
    color: '#94a3b8',
  },

  menuArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuArrowText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748b',
  },

  /* =========================================================
   * SYSTEM
   * ========================================================= */

  systemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 14,
    marginTop: 8,
    marginBottom: 15,
  },

  systemIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  systemIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },

  systemContent: {
    flex: 1,
  },

  systemTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  systemText: {
    fontSize: 9,
    lineHeight: 14,
    color: '#94a3b8',
  },

  /* =========================================================
   * SIGN OUT
   * ========================================================= */

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginBottom: 19,
  },

  signOutText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },

  signOutArrow: {
    fontSize: 13,
    color: '#cbd5e1',
    marginLeft: 6,
  },

  /* =========================================================
   * FOOTER
   * ========================================================= */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },

  footerText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 1,
    marginHorizontal: 10,
  },
});