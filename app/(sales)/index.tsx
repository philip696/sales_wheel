import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { useAuth } from '@/src/features/auth/useAuth';

export default function SalesHomeScreen() {
  const { profile, signOut } = useAuth();

  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
  } = useAttendanceFlow();

  const firstName = useMemo(() => {
    const name = profile?.name?.trim();

    if (!name) {
      return 'Sales';
    }

    return name.split(' ')[0];
  }, [profile?.name]);

  return (
    <ScreenContainer
      title={`Hi, ${firstName}`}
      subtitle="Your sales activity at a glance"
    >
      {/* ===================================================== */}
      {/* TOP HERO */}
      {/* ===================================================== */}

      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>
              TODAY
            </Text>

            <Text style={styles.heroTitle}>
              Ready to make a visit?
            </Text>

            <Text style={styles.heroSubtitle}>
              Check in at a store and unlock
              today's reward.
            </Text>
          </View>

          <View style={styles.heroOrb}>
            <View style={styles.heroOrbInner}>
              <Text style={styles.heroOrbText}>
                S
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroBottom}>
          <View>
            <Text style={styles.heroSmallLabel}>
              CURRENT STATUS
            </Text>

            <Text style={styles.heroStatus}>
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

      {/* ===================================================== */}
      {/* QUICK ACTIONS */}
      {/* ===================================================== */}

      <Text style={styles.sectionLabel}>
        QUICK ACTIONS
      </Text>

      <View style={styles.actionGrid}>
        {/* ATTENDANCE */}

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push('/(sales)/stores')
          }
        >
          <View
            style={[
              styles.actionIcon,
              styles.actionIconBlue,
            ]}
          >
            <Text style={styles.actionIconText}>
              +
            </Text>
          </View>

          <Text style={styles.actionTitle}>
            Check In
          </Text>

          <Text style={styles.actionSubtitle}>
            Start a store visit
          </Text>

          <View style={styles.actionArrow}>
            <Text style={styles.arrowText}>
              →
            </Text>
          </View>
        </Pressable>

        {/* ADD STORE */}

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push('/(sales)/add-store')
          }
        >
          <View
            style={[
              styles.actionIcon,
              styles.actionIconDark,
            ]}
          >
            <Text style={styles.storeIcon}>
              +
            </Text>
          </View>

          <Text style={styles.actionTitle}>
            Add Store
          </Text>

          <Text style={styles.actionSubtitle}>
            Register a new location
          </Text>

          <View style={styles.actionArrow}>
            <Text style={styles.arrowText}>
              →
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ===================================================== */}
      {/* CURRENT VISIT */}
      {/* ===================================================== */}

      {lastSubmission ? (
        <>
          <Text style={styles.sectionLabel}>
            CURRENT VISIT
          </Text>

          <View style={styles.visitCard}>
            {/* VISIT HEADER */}

            <View style={styles.visitHeader}>
              <View style={styles.visitHeaderLeft}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                </View>

                <View>
                  <Text style={styles.visitEyebrow}>
                    VISIT ACTIVE
                  </Text>

                  <Text style={styles.visitTitle}>
                    {selectedStore?.name ??
                      'Store Visit'}
                  </Text>
                </View>
              </View>

              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>
            </View>

            {/* VISIT INFO */}

            <View style={styles.visitInfoRow}>
              <View style={styles.visitInfo}>
                <Text style={styles.visitInfoLabel}>
                  ATTENDANCE
                </Text>

                <Text style={styles.visitInfoValue}>
                  Submitted
                </Text>
              </View>

              <View style={styles.visitInfo}>
                <Text style={styles.visitInfoLabel}>
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
                  {orderPlaced === null
                    ? '—'
                    : orderPlaced
                      ? 'YES'
                      : 'NO'}
                </Text>
              </View>
            </View>

            {/* ORDER STATUS */}

            {orderPlaced !== null ? (
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
                    {orderPlaced ? '✓' : '—'}
                  </Text>
                </View>

                <View style={styles.orderBannerContent}>
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

                  <Text style={styles.orderBannerText}>
                    {orderPlaced
                      ? 'This visit qualifies for the reward wheel.'
                      : 'No reward spin is available for this visit.'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* SPIN BUTTON */}

            {orderPlaced === true &&
            !spinCompleted ? (
              <PrimaryButton
                title="OPEN REWARD WHEEL"
                onPress={() =>
                  router.push(
                    '/(sales)/spin'
                  )
                }
                style={styles.spinButton}
              />
            ) : null}

            {/* COMPLETED */}

            {spinCompleted ? (
              <View style={styles.completedStrip}>
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>
                    ✓
                  </Text>
                </View>

                <View style={styles.completedContent}>
                  <Text style={styles.completedTitle}>
                    Reward claimed
                  </Text>

                  <Text style={styles.completedText}>
                    This visit has been completed.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      {/* ===================================================== */}
      {/* NO CURRENT VISIT */}
      {/* ===================================================== */}

      {!lastSubmission ? (
        <View style={styles.emptyVisit}>
          <View style={styles.emptyVisitIcon}>
            <Text style={styles.emptyVisitIconText}>
              +
            </Text>
          </View>

          <View style={styles.emptyVisitContent}>
            <Text style={styles.emptyVisitTitle}>
              No visit started
            </Text>

            <Text style={styles.emptyVisitText}>
              Choose a store above to begin today's
              attendance.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ===================================================== */}
      {/* HISTORY */}
      {/* ===================================================== */}

      <Text style={styles.sectionLabel}>
        ACTIVITY
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.historyCard,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          router.push('/(sales)/history')
        }
      >
        <View style={styles.historyIcon}>
          <Text style={styles.historyIconText}>
            ↗
          </Text>
        </View>

        <View style={styles.historyContent}>
          <Text style={styles.historyTitle}>
            Visit History
          </Text>

          <Text style={styles.historyText}>
            Review previous visits and orders
          </Text>
        </View>

        <Text style={styles.historyArrow}>
          →
        </Text>
      </Pressable>

      {/* ===================================================== */}
      {/* SIGN OUT */}
      {/* ===================================================== */}

      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressed,
        ]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>
          Sign out
        </Text>
      </Pressable>

      {/* ===================================================== */}
      {/* FOOTER */}
      {/* ===================================================== */}

      <View style={styles.footer}>
        <View style={styles.footerDot} />

        <Text style={styles.footerText}>
          Attendance and rewards are securely
          validated by the server.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /* =========================================================
   * HERO
   * ========================================================= */

  hero: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroText: {
    flex: 1,
    paddingRight: 12,
  },

  heroEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#93c5fd',
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  heroTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    fontSize: 11,
    lineHeight: 17,
    color: '#9ca3af',
    marginTop: 7,
  },

  heroOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroOrbInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroOrbText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },

  heroDivider: {
    height: 1,
    backgroundColor: '#263244',
    marginVertical: 17,
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroSmallLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },

  heroStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e5e7eb',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  statusDotReady: {
    backgroundColor: '#60a5fa',
  },

  statusDotActive: {
    backgroundColor: '#34d399',
  },

  statusDotComplete: {
    backgroundColor: '#a78bfa',
  },

  /* =========================================================
   * SECTION
   * ========================================================= */

  sectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.4,
    marginBottom: 9,
  },

  /* =========================================================
   * QUICK ACTIONS
   * ========================================================= */

  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  actionCard: {
    flex: 1,
    minHeight: 156,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    padding: 15,
    position: 'relative',
  },

  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  actionIconBlue: {
    backgroundColor: '#eff6ff',
  },

  actionIconDark: {
    backgroundColor: '#f1f5f9',
  },

  actionIconText: {
    fontSize: 25,
    fontWeight: '300',
    color: '#2563eb',
  },

  storeIcon: {
    fontSize: 25,
    fontWeight: '300',
    color: '#334155',
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },

  actionSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: '#94a3b8',
    paddingRight: 12,
  },

  actionArrow: {
    position: 'absolute',
    right: 13,
    bottom: 13,
  },

  arrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#cbd5e1',
  },

  /* =========================================================
   * CURRENT VISIT
   * ========================================================= */

  visitCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 17,
    marginBottom: 24,
  },

  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  visitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  liveIndicator: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },

  visitEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 1,
    marginBottom: 3,
  },

  visitTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },

  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#16a34a',
  },

  visitInfoRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  visitInfo: {
    flex: 1,
  },

  visitInfoLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  visitInfoValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
  },

  orderGreen: {
    color: '#16a34a',
  },

  orderGray: {
    color: '#64748b',
  },

  /* =========================================================
   * ORDER BANNER
   * ========================================================= */

  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 11,
    marginTop: 14,
  },

  orderBannerYes: {
    backgroundColor: '#f0fdf4',
  },

  orderBannerNo: {
    backgroundColor: '#f8fafc',
  },

  orderBannerIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  orderBannerIconYes: {
    backgroundColor: '#dcfce7',
  },

  orderBannerIconNo: {
    backgroundColor: '#e2e8f0',
  },

  orderBannerIconText: {
    fontSize: 15,
    fontWeight: '900',
  },

  orderBannerIconTextYes: {
    color: '#16a34a',
  },

  orderBannerIconTextNo: {
    color: '#64748b',
  },

  orderBannerContent: {
    flex: 1,
  },

  orderBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
  },

  orderBannerTitleYes: {
    color: '#166534',
  },

  orderBannerTitleNo: {
    color: '#475569',
  },

  orderBannerText: {
    fontSize: 9,
    lineHeight: 14,
    color: '#94a3b8',
  },

  spinButton: {
    marginTop: 12,
  },

  /* =========================================================
   * COMPLETED
   * ========================================================= */

  completedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 11,
    marginTop: 12,
  },

  completedBadge: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  completedBadgeText: {
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: '900',
  },

  completedContent: {
    flex: 1,
  },

  completedTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6d28d9',
    marginBottom: 2,
  },

  completedText: {
    fontSize: 9,
    color: '#94a3b8',
  },

  /* =========================================================
   * EMPTY VISIT
   * ========================================================= */

  emptyVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
  },

  emptyVisitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  emptyVisitIconText: {
    fontSize: 22,
    fontWeight: '300',
    color: '#64748b',
  },

  emptyVisitContent: {
    flex: 1,
  },

  emptyVisitTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 3,
  },

  emptyVisitText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#94a3b8',
  },

  /* =========================================================
   * HISTORY
   * ========================================================= */

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },

  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  historyIconText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
  },

  historyContent: {
    flex: 1,
  },

  historyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 3,
  },

  historyText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  historyArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 8,
  },

  /* =========================================================
   * SIGN OUT
   * ========================================================= */

  signOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginBottom: 17,
  },

  signOutText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },

  /* =========================================================
   * FOOTER
   * ========================================================= */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },

  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },

  footerText: {
    fontSize: 8,
    color: '#a1a1aa',
    textAlign: 'center',
  },
});