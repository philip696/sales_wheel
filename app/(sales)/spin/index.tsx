import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

/*
 * ============================================================
 * DEMO REWARDS
 * ============================================================
 *
 * DEMO MODE:
 *
 * This screen intentionally does NOT call:
 *
 *   requestSpin()
 *
 * or:
 *
 *   supabase.rpc('request_spin')
 *
 * The reward is selected locally for the client demo.
 *
 * Probability is represented as a percentage.
 *
 * IMPORTANT:
 * This is NOT production anti-cheat logic.
 */

const DISCOUNTS = [
  {
    id: 1,
    label: '5% OFF',
    color: '#2563eb',
    code: 'SAVE5NOW',
    probability: 0.25,
    message:
      'Nice start! Take 5% off your next store order.',
  },
  {
    id: 2,
    label: '10% OFF',
    color: '#059669',
    code: 'SAVE10NOW',
    probability: 0.35,
    message:
      'Great win! Enjoy 10% off your purchase.',
  },
  {
    id: 3,
    label: '15% OFF',
    color: '#d97706',
    code: 'SAVE15NOW',
    probability: 0.25,
    message:
      'Awesome! 15% discount unlocked!',
  },
  {
    id: 4,
    label: '20% OFF',
    color: '#dc2626',
    code: 'SAVE20NOW',
    probability: 0.15,
    message:
      'Jackpot! You got the maximum 20% discount!',
  },
] as const;

type VisualDiscount =
  (typeof DISCOUNTS)[number];

/*
 * ============================================================
 * FRONTEND DEMO REWARD SELECTION
 * ============================================================
 *
 * Uses weighted probability.
 *
 * Example:
 *
 * 5%  = 25%
 * 10% = 35%
 * 15% = 25%
 * 20% = 15%
 *
 * Total = 100%
 */

function selectDemoReward(): VisualDiscount {
  const random = Math.random();

  let cumulative = 0;

  for (const reward of DISCOUNTS) {
    cumulative += reward.probability;

    if (random < cumulative) {
      return reward;
    }
  }

  /*
   * Floating point safety fallback.
   */
  return DISCOUNTS[DISCOUNTS.length - 1];
}

export default function SpinScreen() {
  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
    setSpinCompleted,
    setLastSpin,
  } = useAttendanceFlow();

  const [spinning, setSpinning] =
    useState(false);

  const [wonDiscount, setWonDiscount] =
    useState<VisualDiscount | null>(null);

  const spinValue =
    useRef(new Animated.Value(0)).current;

  const currentRotation =
    useRef(0);

  /*
   * ============================================================
   * SPIN ELIGIBILITY
   * ============================================================
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
          <View style={styles.completedIcon}>
            <Text style={styles.completedEmoji}>
              🎉
            </Text>
          </View>

          <Text style={styles.completedTitle}>
            Wheel Already Spun
          </Text>

          <Text style={styles.completedText}>
            You have already used the Spin Wheel
            for this attendance.
          </Text>

          {selectedStore ? (
            <View style={styles.storePill}>
              <Text style={styles.storePillText}>
                📍 {selectedStore.name}
              </Text>
            </View>
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
          <View style={styles.lockedIcon}>
            <Text style={styles.lockedEmoji}>
              🔒
            </Text>
          </View>

          <Text style={styles.lockedTitle}>
            Spin Not Available
          </Text>

          <Text style={styles.lockedText}>
            Complete your store attendance and
            confirm an order before using the
            reward wheel.
          </Text>

          {!lastSubmission ? (
            <View style={styles.statusBoxInfo}>
              <Text style={styles.statusTitleInfo}>
                Attendance Required
              </Text>

              <Text style={styles.statusTextInfo}>
                Complete a store attendance first.
              </Text>
            </View>
          ) : null}

          {!selectedStore ? (
            <View style={styles.statusBoxInfo}>
              <Text style={styles.statusTitleInfo}>
                Store Required
              </Text>

              <Text style={styles.statusTextInfo}>
                Select a store and complete
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
            <Text style={styles.attendanceButtonText}>
              BACK TO HOME
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ============================================================
   * DEMO SPIN
   * ============================================================
   */

  const spinWheel = async () => {
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

    /*
     * Safety checks.
     */

    if (!lastSubmission) {
      Alert.alert(
        'Attendance Required',
        'Complete attendance before spinning.'
      );
      return;
    }

    if (!selectedStore) {
      Alert.alert(
        'Store Required',
        'Please select a store first.'
      );
      return;
    }

    /*
     * Prevent double taps.
     */

    setSpinning(true);

    try {
      /*
       * ========================================================
       * DEMO MODE
       * ========================================================
       *
       * We intentionally DO NOT call requestSpin().
       *
       * The reward is selected locally using the probability
       * values defined in DISCOUNTS.
       */

      const selectedReward =
        selectDemoReward();

      /*
       * Find reward index.
       */

      const rewardIndex =
        DISCOUNTS.findIndex(
          (item) =>
            item.id === selectedReward.id
        );

      if (rewardIndex < 0) {
        throw new Error(
          'Unable to locate selected reward.'
        );
      }

      /*
       * ========================================================
       * OPTIONAL LOCAL SPIN RESULT
       * ========================================================
       *
       * We attempt to save a local-compatible result
       * into the AttendanceFlow context.
       *
       * This does NOT write to Supabase.
       *
       * If your context accepts a different shape,
       * this block can simply be removed.
       */

      try {
        setLastSpin({
          spinId: `demo-${Date.now()}`,
          status: 'completed',
          reward: {
            id: String(selectedReward.id),
            name: selectedReward.label,
            value: selectedReward.code,
          },
          rejectionReason: null,
        });
      } catch {
        /*
         * Context compatibility shouldn't prevent
         * the frontend demo from working.
         */
      }

      /*
       * ========================================================
       * WHEEL ANIMATION
       * ========================================================
       */

      const sliceAngle =
        360 / DISCOUNTS.length;

      /*
       * Five full rotations for a proper
       * spinning-wheel effect.
       */

      const extraTurns = 360 * 5;

      /*
       * Calculate the center of the selected slice.
       *
       * The pointer is at the top.
       */

      const targetSliceDegree =
        360 -
        (rewardIndex * sliceAngle +
          sliceAngle / 2);

      const finalDegree =
        currentRotation.current +
        extraTurns +
        targetSliceDegree;

      Animated.timing(
        spinValue,
        {
          toValue: finalDegree,
          duration: 4500,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ).start(() => {
        currentRotation.current =
          finalDegree % 360;

        setSpinning(false);

        /*
         * Display the selected reward.
         */

        setWonDiscount(
          selectedReward
        );

        /*
         * Mark the local frontend flow as
         * completed.
         */

        setSpinCompleted(true);
      });
    } catch (error) {
      setSpinning(false);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete the demo spin.';

      Alert.alert(
        'Spin Failed',
        message
      );
    }
  };

  /*
   * ============================================================
   * ROTATION
   * ============================================================
   */

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
      subtitle="Spin to win your reward"
    >
      <View style={styles.wheelCard}>
        {/* ================================================= */}
        {/* DEMO MODE */}
        {/* ================================================= */}

        <View style={styles.demoBadge}>
          <View style={styles.demoDot} />

          <Text style={styles.demoBadgeText}>
            DEMO MODE
          </Text>
        </View>

        {/* ================================================= */}
        {/* ATTENDANCE */}
        {/* ================================================= */}

        <View style={styles.attendanceBadge}>
          <Text style={styles.attendanceBadgeText}>
            ✓ ATTENDANCE COMPLETE
          </Text>
        </View>

        {/* ================================================= */}
        {/* STORE */}
        {/* ================================================= */}

        {selectedStore ? (
          <View style={styles.storePill}>
            <Text style={styles.storePillText}>
              📍 {selectedStore.name}
            </Text>
          </View>
        ) : null}

        {/* ================================================= */}
        {/* ORDER */}
        {/* ================================================= */}

        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>
            🛒 ORDER PLACED
          </Text>
        </View>

        {/* ================================================= */}
        {/* POINTER */}
        {/* ================================================= */}

        <View style={styles.pointerContainer}>
          <View style={styles.pointerOuter}>
            <View style={styles.pointerInner} />
          </View>
        </View>

        {/* ================================================= */}
        {/* WHEEL */}
        {/* ================================================= */}

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
            {/* TOP RIGHT */}

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
                  styles.quadrantTextTR,
                ]}
              >
                {DISCOUNTS[0].label}
              </Text>
            </View>

            {/* BOTTOM RIGHT */}

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
                  styles.quadrantTextBR,
                ]}
              >
                {DISCOUNTS[1].label}
              </Text>
            </View>

            {/* BOTTOM LEFT */}

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
                  styles.quadrantTextBL,
                ]}
              >
                {DISCOUNTS[2].label}
              </Text>
            </View>

            {/* TOP LEFT */}

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
                  styles.quadrantTextTL,
                ]}
              >
                {DISCOUNTS[3].label}
              </Text>
            </View>

            {/* DIVIDERS */}

            <View
              style={styles.verticalLine}
            />

            <View
              style={styles.horizontalLine}
            />
          </Animated.View>

          {/* CENTER */}

          <View
            style={styles.wheelCenterOuter}
          >
            <View
              style={styles.wheelCenterInner}
            >
              <Text
                style={styles.centerCapEmoji}
              >
                🎁
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* RESULT */}
        {/* ================================================= */}

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
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor:
                    `${wonDiscount.color}18`,
                },
              ]}
            >
              <Text style={styles.resultEmoji}>
                🎉
              </Text>
            </View>

            <Text
              style={[
                styles.resultBadgeText,
                {
                  color:
                    wonDiscount.color,
                },
              ]}
            >
              {wonDiscount.label}
            </Text>

            <Text style={styles.resultUnlocked}>
              REWARD UNLOCKED
            </Text>

            <Text style={styles.resultMessage}>
              {wonDiscount.message}
            </Text>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>
                PROMO CODE
              </Text>

              <Text style={styles.codeValue}>
                {wonDiscount.code}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.hintCard}>
            <Text style={styles.hintIcon}>
              ✨
            </Text>

            <View style={styles.hintContent}>
              <Text style={styles.hintTitle}>
                Ready to spin?
              </Text>

              <Text style={styles.hint}>
                Order confirmed. Spin the wheel
                to reveal your reward.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================= */}
        {/* SPIN BUTTON */}
        {/* ================================================= */}

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
          activeOpacity={0.85}
        >
          <Text style={styles.spinButtonText}>
            {spinning
              ? 'SPINNING...'
              : wonDiscount
                ? 'SPIN COMPLETED'
                : 'SPIN WHEEL'}
          </Text>
        </TouchableOpacity>

        {/* ================================================= */}
        {/* CLAIM */}
        {/* ================================================= */}

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
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.resultRouteButtonText
              }
            >
              CLAIM REWARD
            </Text>

            <Text
              style={
                styles.resultRouteArrow
              }
            >
              →
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* ================================================= */}
        {/* DEMO WARNING */}
        {/* ================================================= */}

        <Text style={styles.demoNote}>
          Demo reward selection is running
          locally on this device.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const WHEEL_SIZE = 240;

const styles = StyleSheet.create({
  /*
   * =========================================================
   * LOCKED
   * =========================================================
   */

  lockedCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
  },

  lockedIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  lockedEmoji: {
    fontSize: 38,
  },

  lockedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
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
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  attendanceButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /*
   * =========================================================
   * COMPLETED
   * =========================================================
   */

  completedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
  },

  completedIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  completedEmoji: {
    fontSize: 42,
  },

  completedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
  },

  completedText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },

  storePill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 12,
  },

  storePillText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },

  backButton: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /*
   * =========================================================
   * MAIN CARD
   * =========================================================
   */

  wheelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },

  /*
   * =========================================================
   * DEMO BADGE
   * =========================================================
   */

  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 10,
  },

  demoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginRight: 6,
  },

  demoBadgeText: {
    color: '#c2410c',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /*
   * =========================================================
   * ATTENDANCE BADGE
   * =========================================================
   */

  attendanceBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 10,
  },

  attendanceBadgeText: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  /*
   * =========================================================
   * ORDER BADGE
   * =========================================================
   */

  orderBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 18,
  },

  orderBadgeText: {
    color: '#1d4ed8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  /*
   * =========================================================
   * POINTER
   * =========================================================
   */

  pointerContainer: {
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    marginBottom: -2,
  },

  pointerOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderTopWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pointerInner: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
    top: -21,
  },

  /*
   * =========================================================
   * WHEEL
   * =========================================================
   */

  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 6,
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
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
    fontSize: 17,
    fontWeight: '900',
    textShadowColor: '#00000055',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 2,
  },

  quadrantTextTR: {
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  quadrantTextBR: {
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  quadrantTextBL: {
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  quadrantTextTL: {
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  verticalLine: {
    position: 'absolute',
    width: 3,
    height: WHEEL_SIZE,
    backgroundColor: '#ffffff',
    left: WHEEL_SIZE / 2 - 1.5,
    top: 0,
  },

  horizontalLine: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: 3,
    backgroundColor: '#ffffff',
    top: WHEEL_SIZE / 2 - 1.5,
    left: 0,
  },

  /*
   * =========================================================
   * CENTER
   * =========================================================
   */

  wheelCenterOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  wheelCenterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerCapEmoji: {
    fontSize: 27,
  },

  /*
   * =========================================================
   * HINT
   * =========================================================
   */

  hintCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },

  hintIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  hintContent: {
    flex: 1,
  },

  hintTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },

  hint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },

  /*
   * =========================================================
   * RESULT
   * =========================================================
   */

  resultCard: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  resultIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  resultEmoji: {
    fontSize: 25,
  },

  resultBadgeText: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },

  resultUnlocked: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  resultMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 13,
  },

  codeContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 11,
    padding: 11,
    alignItems: 'center',
  },

  codeLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },

  codeValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /*
   * =========================================================
   * BUTTONS
   * =========================================================
   */

  spinButton: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },

  spinButtonDisabled: {
    opacity: 0.45,
  },

  spinButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  resultRouteButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 15,
    paddingVertical: 16,
    marginTop: 10,
  },

  resultRouteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  resultRouteArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },

  /*
   * =========================================================
   * DEMO NOTE
   * =========================================================
   */

  demoNote: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 13,
  },
});