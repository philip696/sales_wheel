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

import { requestSpin } from '@/src/services/spinService';

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

type VisualDiscount =
  (typeof DISCOUNTS)[number];

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
   * FIND VISUAL REWARD
   * ============================================================
   *
   * The database returns the actual reward.
   *
   * We only use DISCOUNTS here to determine how
   * that reward should look on the wheel.
   */

  const findVisualReward = (
    rewardName: string,
    rewardValue: string
  ): VisualDiscount | null => {
    const normalizedName =
      rewardName
        .trim()
        .toLowerCase();

    const normalizedValue =
      rewardValue
        .trim()
        .toLowerCase();

    const reward =
      DISCOUNTS.find((item) => {
        return (
          item.label
            .toLowerCase() ===
            normalizedName ||
          item.code
            .toLowerCase() ===
            normalizedValue ||
          item.label
            .toLowerCase() ===
            normalizedValue
        );
      });

    return reward ?? null;
  };

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
            <Text
              style={styles.backButtonText}
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
            <View
              style={styles.statusBoxInfo}
            >
              <Text
                style={styles.statusTitleInfo}
              >
                No Attendance Found
              </Text>

              <Text
                style={styles.statusTextInfo}
              >
                Complete a store attendance first.
              </Text>
            </View>
          ) : null}

          {!selectedStore ? (
            <View
              style={styles.statusBoxInfo}
            >
              <Text
                style={styles.statusTitleInfo}
              >
                No Store Selected
              </Text>

              <Text
                style={styles.statusTextInfo}
              >
                Please select a store and complete
                attendance first.
              </Text>
            </View>
          ) : null}

          {lastSubmission &&
          selectedStore &&
          orderPlaced !== true ? (
            <View
              style={styles.statusBoxInfo}
            >
              <Text
                style={styles.statusTitleInfo}
              >
                No Order Recorded
              </Text>

              <Text
                style={styles.statusTextInfo}
              >
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
              style={
                styles.attendanceButtonText
              }
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
   * SPIN
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
       * DATABASE SPIN
       * ========================================================
       *
       * The database chooses the reward.
       *
       * DO NOT use Math.random() here.
       */

      const result = await requestSpin({
        attendanceId:
          lastSubmission.attendanceId,

        storeId:
          selectedStore.id,

        latitude:
          selectedStore.latitude,

        longitude:
          selectedStore.longitude,
      });

      /*
       * Save the actual server result into
       * AttendanceFlowContext.
       */

      setLastSpin(result);

      /*
       * The server rejected the spin.
       */

      if (result.status === 'rejected') {
        throw new Error(
          result.rejectionReason ??
            'Spin was rejected.'
        );
      }

      /*
       * Server should normally return a reward.
       */

      if (!result.reward) {
        throw new Error(
          'The server completed the spin but did not return a reward.'
        );
      }

      /*
       * Match the server reward to the visual
       * wheel configuration.
       */

      const visualReward =
        findVisualReward(
          result.reward.name,
          result.reward.value
        );

      /*
       * If the database reward is not represented
       * by the frontend wheel, fail safely instead
       * of showing the wrong reward.
       */

      if (!visualReward) {
        throw new Error(
          `Reward "${result.reward.name}" is not configured in the Spin Wheel UI.`
        );
      }

      /*
       * ========================================================
       * ANIMATE TO THE SERVER-SELECTED REWARD
       * ========================================================
       */

      const rewardIndex =
        DISCOUNTS.findIndex(
          (item) =>
            item.id === visualReward.id
        );

      if (rewardIndex < 0) {
        throw new Error(
          'Unable to locate the selected reward on the wheel.'
        );
      }

      const sliceAngle =
        360 / DISCOUNTS.length;

      const extraTurns =
        360 * 5;

      /*
       * Point the selected slice toward
       * the top pointer.
       */

      const targetSliceDegree =
        360 -
        (rewardIndex * sliceAngle +
          sliceAngle / 2);

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

        /*
         * Display exactly the reward returned
         * by Supabase.
         */

        setWonDiscount(
          visualReward
        );

        setSpinCompleted(true);
      });
    } catch (error) {
      setSpinning(false);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete the spin.';

      Alert.alert(
        'Spin Failed',
        message
      );
    }
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
      subtitle="Spin to win your reward"
    >
      <View style={styles.wheelCard}>
        <View
          style={styles.approvedBadge}
        >
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

        <View style={styles.orderBadge}>
          <Text
            style={styles.orderBadgeText}
          >
            🛒 ORDER PLACED
          </Text>
        </View>

        <View
          style={styles.pointerContainer}
        >
          <Text style={styles.pointerIcon}>
            ▼
          </Text>
        </View>

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
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  attendanceButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  completedCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 28,
  },

  completedEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },

  completedTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
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

  completedStore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 24,
  },

  backButton: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  wheelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'center',
  },

  approvedBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  },

  approvedBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
  },

  storeText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },

  orderBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },

  orderBadgeText: {
    color: '#1e40af',
    fontSize: 11,
    fontWeight: '900',
  },

  pointerContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    marginBottom: -4,
  },

  pointerIcon: {
    fontSize: 30,
    lineHeight: 30,
    color: '#111827',
  },

  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 5,
    borderColor: '#111827',
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

  verticalLine: {
    position: 'absolute',
    width: 2,
    height: WHEEL_SIZE,
    backgroundColor: '#ffffff',
    left:
      WHEEL_SIZE / 2 - 1,
    top: 0,
  },

  horizontalLine: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: 2,
    backgroundColor: '#ffffff',
    top:
      WHEEL_SIZE / 2 - 1,
    left: 0,
  },

  wheelCenterCap: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerCapEmoji: {
    fontSize: 28,
  },

  hint: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },

  resultCard: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  resultBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  resultMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },

  codeContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  codeLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },

  codeValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },

  spinButton: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  spinButtonDisabled: {
    opacity: 0.5,
  },

  spinButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  resultRouteButton: {
    width: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  resultRouteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});