import { router } from 'expo-router';
import { useRef, useState } from 'react';

import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';

import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

const DISCOUNTS = [
  {
    id: 1,
    label: '5% OFF',
    color: '#3b82f6',
    code: 'SAVE5NOW',
    message:
      'Nice start! Take 5% off your next store order.',
  },
  {
    id: 2,
    label: '10% OFF',
    color: '#10b981',
    code: 'SAVE10NOW',
    message:
      'Great win! Enjoy 10% off your purchase.',
  },
  {
    id: 3,
    label: '15% OFF',
    color: '#f59e0b',
    code: 'SAVE15NOW',
    message:
      'Awesome! 15% discount unlocked!',
  },
  {
    id: 4,
    label: '20% OFF',
    color: '#ef4444',
    code: 'SAVE20NOW',
    message:
      'Jackpot! You got the maximum 20% discount!',
  },
];

export default function SpinScreen() {
  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
    setSpinCompleted,
    setLastSpin,
  } = useAttendanceFlow();

  const [spinning, setSpinning] = useState(false);

  const [wonDiscount, setWonDiscount] =
    useState<(typeof DISCOUNTS)[number] | null>(
      null
    );

  const spinValue =
    useRef(new Animated.Value(0)).current;

  const currentRotation =
    useRef(0);

  /*
   * ============================================================
   * SPIN ELIGIBILITY
   * ============================================================
   *
   * New flow:
   *
   * Attendance submitted
   *        ↓
   * Order YES
   *        ↓
   * Spin
   *
   * We do NOT require attendance.status === "approved"
   * here.
   *
   * The attendance submission has already been accepted
   * before reaching this screen.
   */

  const canSpin =
    !!lastSubmission &&
    !!selectedStore &&
    orderPlaced === true &&
    !spinCompleted;

  /*
   * ============================================================
   * ALREADY COMPLETED
   * ============================================================
   */

  if (spinCompleted) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Reward already claimed"
      >
        <View style={styles.completedCard}>
          <Text style={styles.completedEmoji}>
            🎉
          </Text>

          <Text style={styles.completedTitle}>
            Wheel Already Spun
          </Text>

          <Text style={styles.completedText}>
            You have already used the Spin Wheel
            for this attendance.
          </Text>

          {selectedStore ? (
            <Text style={styles.completedStore}>
              📍 {selectedStore.name}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace('/(sales)')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>
              BACK TO HOME
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ============================================================
   * CANNOT SPIN
   * ============================================================
   */

  if (!canSpin) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Reward unavailable"
      >
        <View style={styles.lockedCard}>
          <Text style={styles.lockedEmoji}>
            🔒
          </Text>

          <Text style={styles.lockedTitle}>
            Spin Not Available
          </Text>

          <Text style={styles.lockedText}>
            You can only use the Spin Wheel after
            completing attendance and confirming
            that an order was placed.
          </Text>

          {!lastSubmission ? (
            <View style={styles.statusBoxInfo}>
              <Text style={styles.statusTitleInfo}>
                No Attendance Found
              </Text>

              <Text style={styles.statusTextInfo}>
                Complete a store attendance first.
              </Text>
            </View>
          ) : null}

          {!selectedStore ? (
            <View style={styles.statusBoxInfo}>
              <Text style={styles.statusTitleInfo}>
                No Store Selected
              </Text>

              <Text style={styles.statusTextInfo}>
                Please select a store and complete
                attendance first.
              </Text>
            </View>
          ) : null}

          {lastSubmission &&
          selectedStore &&
          orderPlaced !== true ? (
            <View style={styles.statusBoxInfo}>
              <Text style={styles.statusTitleInfo}>
                No Order Recorded
              </Text>

              <Text style={styles.statusTextInfo}>
                The Spin Wheel is only available
                when an order was placed.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.attendanceButton}
            onPress={() =>
              router.replace('/(sales)')
            }
            activeOpacity={0.8}
          >
            <Text
              style={styles.attendanceButtonText}
            >
              BACK TO HOME
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ============================================================
   * SPIN WHEEL
   * ============================================================
   */

  const spinWheel = () => {
    if (!canSpin) {
      return;
    }

    if (
      spinning ||
      wonDiscount ||
      spinCompleted
    ) {
      return;
    }

    setSpinning(true);

    /*
     * Pick the reward.
     *
     * IMPORTANT:
     *
     * This is currently client-side randomization.
     *
     * If your Supabase request_spin RPC is already
     * implemented, we should move this reward selection
     * to the server for anti-cheat protection.
     */

    const randomIndex =
      Math.floor(
        Math.random() *
          DISCOUNTS.length
      );

    const sliceAngle =
      360 / DISCOUNTS.length;

    const extraTurns =
      360 * 5;

    const targetSliceDegree =
      360 -
      (randomIndex * sliceAngle + 45);

    const finalDegree =
      currentRotation.current +
      extraTurns +
      targetSliceDegree;

    Animated.timing(spinValue, {
      toValue: finalDegree,
      duration: 4500,
      easing: Easing.out(
        Easing.cubic
      ),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current =
        finalDegree % 360;

      setSpinning(false);

      const reward =
        DISCOUNTS[randomIndex];

      setWonDiscount(reward);

      /*
       * Save the reward in the flow.
       *
       * This is optional depending on your
       * RequestSpinResult type.
       *
       * We intentionally don't create a fake
       * server response here.
       */

      setSpinCompleted(true);
    });
  };

  const spinInterpolation =
    spinValue.interpolate({
      inputRange: [0, 360],
      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  /*
   * ============================================================
   * MAIN SCREEN
   * ============================================================
   */

  return (
    <ScreenContainer
      title="Spin Wheel"
      subtitle="Spin to win 5%, 10%, 15%, or 20% OFF"
    >
      <View style={styles.wheelCard}>
        {/* APPROVED / READY */}

        <View style={styles.approvedBadge}>
          <Text
            style={
              styles.approvedBadgeText
            }
          >
            ✓ ATTENDANCE COMPLETE
          </Text>
        </View>

        {selectedStore ? (
          <Text style={styles.storeText}>
            📍 {selectedStore.name}
          </Text>
        ) : null}

        {/* ORDER */}

        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>
            🛒 ORDER PLACED
          </Text>
        </View>

        {/* POINTER */}

        <View
          style={styles.pointerContainer}
        >
          <Text style={styles.pointerIcon}>
            ▼
          </Text>
        </View>

        {/* WHEEL */}

        <View style={styles.wheelWrapper}>
          <Animated.View
            style={[
              styles.wheelContainer,
              {
                transform: [
                  {
                    rotate:
                      spinInterpolation,
                  },
                ],
              },
            ]}
          >
            {/* 5% */}

            <View
              style={[
                styles.quadrant,
                styles.quadrantTR,
                {
                  backgroundColor:
                    DISCOUNTS[0].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.quadrantText,
                  {
                    transform: [
                      {
                        rotate:
                          '45deg',
                      },
                    ],
                  },
                ]}
              >
                {DISCOUNTS[0].label}
              </Text>
            </View>

            {/* 10% */}

            <View
              style={[
                styles.quadrant,
                styles.quadrantBR,
                {
                  backgroundColor:
                    DISCOUNTS[1].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.quadrantText,
                  {
                    transform: [
                      {
                        rotate:
                          '-45deg',
                      },
                    ],
                  },
                ]}
              >
                {DISCOUNTS[1].label}
              </Text>
            </View>

            {/* 15% */}

            <View
              style={[
                styles.quadrant,
                styles.quadrantBL,
                {
                  backgroundColor:
                    DISCOUNTS[2].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.quadrantText,
                  {
                    transform: [
                      {
                        rotate:
                          '45deg',
                      },
                    ],
                  },
                ]}
              >
                {DISCOUNTS[2].label}
              </Text>
            </View>

            {/* 20% */}

            <View
              style={[
                styles.quadrant,
                styles.quadrantTL,
                {
                  backgroundColor:
                    DISCOUNTS[3].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.quadrantText,
                  {
                    transform: [
                      {
                        rotate:
                          '-45deg',
                      },
                    ],
                  },
                ]}
              >
                {DISCOUNTS[3].label}
              </Text>
            </View>

            <View
              style={styles.verticalLine}
            />

            <View
              style={styles.horizontalLine}
            />
          </Animated.View>

          <View
            style={styles.wheelCenterCap}
          >
            <Text
              style={
                styles.centerCapEmoji
              }
            >
              🎁
            </Text>
          </View>
        </View>

        {/* RESULT */}

        {wonDiscount ? (
          <View
            style={[
              styles.resultCard,
              {
                borderColor:
                  wonDiscount.color,
              },
            ]}
          >
            <Text
              style={[
                styles.resultBadgeText,
                {
                  color:
                    wonDiscount.color,
                },
              ]}
            >
              🎉 {wonDiscount.label}{' '}
              UNLOCKED!
            </Text>

            <Text
              style={styles.resultMessage}
            >
              {wonDiscount.message}
            </Text>

            <View
              style={
                styles.codeContainer
              }
            >
              <Text
                style={styles.codeLabel}
              >
                Promo Code:
              </Text>

              <Text
                style={styles.codeValue}
              >
                {wonDiscount.code}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>
            Order confirmed.
            {'\n'}
            Spin the wheel to get your
            reward!
          </Text>
        )}

        {/* SPIN BUTTON */}

        <TouchableOpacity
          style={[
            styles.spinButton,
            (spinning ||
              wonDiscount !== null) &&
              styles.spinButtonDisabled,
          ]}
          onPress={spinWheel}
          disabled={
            spinning ||
            wonDiscount !== null
          }
          activeOpacity={0.8}
        >
          <Text
            style={styles.spinButtonText}
          >
            {spinning
              ? 'SPINNING...'
              : wonDiscount
                ? 'SPIN COMPLETED'
                : 'SPIN WHEEL'}
          </Text>
        </TouchableOpacity>

        {/* CLAIM */}

        {wonDiscount ? (
          <TouchableOpacity
            style={
              styles.resultRouteButton
            }
            onPress={() =>
              router.push(
                '/(sales)/spin/result'
              )
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.resultRouteButtonText
              }
            >
              CLAIM REWARD ›
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const WHEEL_SIZE = 220;

const styles = StyleSheet.create({
  /* =========================================================
   * LOCKED
   * ========================================================= */

  lockedCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
  },

  lockedEmoji: {
    fontSize: 52,
    marginBottom: 18,
  },

  lockedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },

  lockedText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },

  statusBoxInfo: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  statusTitleInfo: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },

  statusTextInfo: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  attendanceButton: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
  },

  attendanceButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  /* =========================================================
   * COMPLETED
   * ========================================================= */

  completedCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 28,
  },

  completedEmoji: {
    fontSize: 55,
    marginBottom: 16,
  },

  completedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 10,
  },

  completedText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 12,
  },

  completedStore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 20,
  },

  backButton: {
    marginTop: 14,
    paddingVertical: 10,
  },

  backButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },

  /* =========================================================
   * WHEEL
   * ========================================================= */

  wheelCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
  },

  approvedBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 5,
  },

  approvedBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  storeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 6,
  },

  orderBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },

  orderBadgeText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '900',
  },

  pointerContainer: {
    zIndex: 20,
    marginBottom: -12,
  },

  pointerIcon: {
    fontSize: 26,
    color: '#0f172a',
  },

  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },

  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius:
      WHEEL_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 4,
    borderColor: '#0f172a',
  },

  quadrant: {
    position: 'absolute',
    width: WHEEL_SIZE / 2,
    height: WHEEL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quadrantTR: {
    top: 0,
    right: 0,
  },

  quadrantBR: {
    bottom: 0,
    right: 0,
  },

  quadrantBL: {
    bottom: 0,
    left: 0,
  },

  quadrantTL: {
    top: 0,
    left: 0,
  },

  quadrantText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },

  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left:
      WHEEL_SIZE / 2 - 1.5,
    width: 3,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },

  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top:
      WHEEL_SIZE / 2 - 1.5,
    height: 3,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },

  wheelCenterCap: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },

  centerCapEmoji: {
    fontSize: 20,
  },

  /* =========================================================
   * RESULT
   * ========================================================= */

  hint: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 12,
  },

  resultCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },

  resultBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  resultMessage: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },

  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },

  codeLabel: {
    fontSize: 11,
    color: '#64748b',
  },

  codeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },

  /* =========================================================
   * SPIN BUTTON
   * ========================================================= */

  spinButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },

  spinButtonDisabled: {
    backgroundColor: '#94a3b8',
  },

  spinButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  resultRouteButton: {
    marginTop: 12,
    paddingVertical: 6,
  },

  resultRouteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});