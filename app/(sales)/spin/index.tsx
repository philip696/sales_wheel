import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { supabase } from '@/src/lib/supabase';
import {
  getRewardEvent,
  listActiveRewardsForEvent,
} from '@/src/services/rewardService';
import type { Reward } from '@/src/types';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/*
 * ============================================================
 * WHEEL CONFIGURATION
 * ============================================================
 *
 * IMPORTANT:
 *
 * Every wheel section is visually the SAME SIZE.
 *
 * Probability is NOT used to determine the size of a section.
 *
 * Probability is only used internally when selecting
 * the winning reward.
 *
 * Example:
 *
 * 5% OFF  = 25% chance
 * 10% OFF = 35% chance
 * 15% OFF = 25% chance
 * 20% OFF = 15% chance
 *
 * Visually:
 *
 *       ┌───────┬───────┐
 *       │       │       │
 *       │  20%  │  5%   │
 *       │       │       │
 *       ├───────┼───────┤
 *       │       │       │
 *       │  15%  │  10%  │
 *       │       │       │
 *       └───────┴───────┘
 *
 * All four sections are equal.
 *
 * ============================================================
 */

const WHEEL_SIZE = 260;

const WHEEL_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
];

/*
 * ============================================================
 * TYPE
 * ============================================================
 */

type WheelReward = Reward & {
  wheelIndex: number;
  color: string;
};

/*
 * ============================================================
 * PREPARE WHEEL REWARDS
 * ============================================================
 */

function prepareWheelRewards(
  rewards: Reward[]
): WheelReward[] {
  return rewards.map(
    (
      reward,
      index
    ) => ({
      ...reward,

      wheelIndex:
        index,

      color:
        WHEEL_COLORS[
          index %
            WHEEL_COLORS.length
        ],
    })
  );
}

/**
 * Submit the completed wheel spin to PostgreSQL.
 *
 * IMPORTANT:
 * - The wheel animation has already finished before this is called.
 * - This function is the only place where the completed spin is posted.
 * - The PostgreSQL `request_spin` RPC is responsible for validating
 *   the attendance/order and selecting the actual reward.
 */
async function submitCompletedReward(params: {
  attendanceId: string;
  eventId: string;
  storeId: string;
  latitude: number;
  longitude: number;
}) {
  console.log('================================');
  console.log('SUBMITTING COMPLETED SPIN');
  console.log('ATTENDANCE ID:', params.attendanceId);
  console.log('EVENT ID:', params.eventId);
  console.log('STORE ID:', params.storeId);
  console.log('LATITUDE:', params.latitude);
  console.log('LONGITUDE:', params.longitude);
  console.log('RPC: request_spin');
  console.log('================================');

  const { data, error } = await supabase.rpc(
    'request_spin',
    {
      p_attendance_id: params.attendanceId,
      p_store_id: params.storeId,
      p_latitude: params.latitude,
      p_longitude: params.longitude,
      p_event_id: params.eventId,
    }
  );

  console.log('REQUEST_SPIN DATA:', data);
  console.log('REQUEST_SPIN ERROR:', error);

  if (error) {
    throw new Error(
      `request_spin failed: ${error.message}`
    );
  }

  const result = Array.isArray(data)
    ? data[0]
    : data;

  if (!result) {
    throw new Error(
      'request_spin returned no result.'
    );
  }

  console.log(
    'REQUEST_SPIN RESULT:',
    result
  );

  const resultStatus =
    result.status ??
    result.result_status;

  if (resultStatus === 'rejected') {
    throw new Error(
      result.rejection_reason ??
        'The spin was rejected by the server.'
    );
  }

  if (!result.spin_id) {
    throw new Error(
      'request_spin did not return a spin ID.'
    );
  }

  if (!result.reward_id) {
    throw new Error(
      'request_spin did not return a reward ID.'
    );
  }

  return {
    spinId: result.spin_id as string,
    status: resultStatus as string,
    rewardId: result.reward_id as string,
    rewardName:
      result.reward_name as string,
    rewardValue:
      (result.reward_value ?? '') as string,
    rejectionReason:
      (result.rejection_reason ?? null) as
        | string
        | null,
  };
}

/*
 * ============================================================
 * MAIN SCREEN
 * ============================================================
 */

export default function SpinScreen() {
  /*
   * ==========================================================
   * ATTENDANCE FLOW
   * ==========================================================
   */

  const {
    selectedStore,
    lastSubmission,
    orderPlaced,
    spinCompleted,
    setSpinCompleted,
    setLastSpin,
    lastSpin,
  } = useAttendanceFlow();

  /*
   * ==========================================================
   * REWARDS
   * ==========================================================
   */

  const [
    rewards,
    setRewards,
  ] = useState<WheelReward[]>(
    []
  );

  const [
    loadingRewards,
    setLoadingRewards,
  ] = useState(true);

  const [
    rewardError,
    setRewardError,
  ] = useState<string | null>(
    null
  );

  const [
    event,
    setEvent,
  ] = useState<{
    id: string;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
  } | null>(null);

  /*
   * ==========================================================
   * SPIN STATE
   * ==========================================================
   */

  const [
    spinning,
    setSpinning,
  ] = useState(false);

  const [
    wonReward,
    setWonReward,
  ] = useState<WheelReward | null>(
    null
  );

  /*
   * ==========================================================
   * ANIMATION
   * ==========================================================
   */

  const spinValue =
    useRef(
      new Animated.Value(0)
    ).current;

  const currentRotation =
    useRef(0);

  /*
   * ==========================================================
   * LOAD REWARDS
   * ==========================================================
   */

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards =
    async () => {
      console.log(
        '================================================'
      );

      console.log(
        'SPIN SCREEN: LOADING ACTIVE REWARDS'
      );

      setLoadingRewards(
        true
      );

      setRewardError(null);

      try {
        /*
         * Use your existing reward service.
         *
         * No database changes required.
         */

        const activeEvent =
          await getRewardEvent();

        if (!activeEvent) {
          setEvent(null);
          setRewards([]);
          return;
        }

        setEvent(activeEvent);

        console.log(
          'ACTIVE EVENT FROM SUPABASE:',
          activeEvent
        );

        const data =
          await listActiveRewardsForEvent(
            activeEvent.id
          );

        console.log(
          'ACTIVE REWARDS FROM SUPABASE:',
          data
        );

        console.log(
          'ACTIVE REWARD COUNT:',
          data.length
        );

        /*
         * Debug every reward.
         */

        data.forEach(
          (
            reward,
            index
          ) => {
            console.log(
              `REWARD ${index + 1}:`,
              {
                id:
                  reward.id,

                name:
                  reward.name,

                value:
                  reward.value,

                probability:
                  reward.probability,

                status:
                  reward.status,
              }
            );
          }
        );

        /*
         * Prepare equal-size wheel sections.
         */

        const prepared =
          prepareWheelRewards(
            data
          );

        /*
         * Calculate total probability
         * for debugging only.
         */

        const totalProbability =
          prepared.reduce(
            (
              sum,
              reward
            ) =>
              sum +
              Number(
                reward.probability
              ),
            0
          );

        console.log(
          'TOTAL ACTIVE REWARD PROBABILITY:',
          totalProbability
        );

        console.log(
          'TOTAL ACTIVE REWARD PROBABILITY %:',
          totalProbability *
            100
        );

        /*
         * Warning only.
         */

        if (
          totalProbability <
          0.999
        ) {
          console.warn(
            'WARNING: ACTIVE REWARD PROBABILITY IS LESS THAN 100%'
          );
        }

        if (
          totalProbability >
          1.001
        ) {
          console.warn(
            'WARNING: ACTIVE REWARD PROBABILITY IS GREATER THAN 100%'
          );
        }

        setRewards(
          prepared
        );
      } catch (
        error
      ) {
        console.error(
          'LOAD REWARDS ERROR:',
          error
        );

        setRewardError(
          error instanceof Error
            ? error.message
            : 'Could not load rewards.'
        );
      } finally {
        setLoadingRewards(
          false
        );

        console.log(
          '================================================'
        );
      }
    };

  /*
   * ==========================================================
   * SPIN ELIGIBILITY
   * ==========================================================
   */

  const canSpin =
    !!lastSubmission &&
    !!selectedStore &&
    orderPlaced === true &&
    !spinCompleted &&
    rewards.length > 0;

/*
   * ==========================================================
   * ALREADY COMPLETED
   * ==========================================================
   */

  if (spinCompleted) {
    const rewardName = lastSpin?.reward?.name;
    const rewardValue = lastSpin?.reward?.value;

    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Reward already claimed"
      >
        <View style={styles.completedCard}>
          <View style={styles.completedIcon}>
            <Text style={styles.completedEmoji}>🎉</Text>
          </View>

          <Text style={styles.completedTitle}>
            {rewardName ?? 'Reward Claimed'}: {rewardValue ?? ''}
          </Text>

          <Text style={styles.completedText}>
            You have unlocked this reward: {rewardName ?? 'Reward Claimed'}
          </Text>

          {selectedStore ? (
            <View style={styles.storePill}>
              <Text style={styles.storePillText}>
                📍 {selectedStore.name}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={styles.backButton}
            onPress={() => router.replace('/(sales)')}
          >
            <Text style={styles.backButtonText}>
              BACK TO HOME
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loadingRewards
  ) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Loading rewards..."
      >
        <View
          style={
            styles.loadingCard
          }
        >
          <ActivityIndicator
            size="large"
            color="#2563eb"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading Rewards
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting the latest rewards...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (
    rewardError
  ) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Unable to load rewards"
      >
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorEmoji
            }
          >
            ⚠️
          </Text>

          <Text
            style={
              styles.errorTitle
            }
          >
            Rewards Could Not Be Loaded
          </Text>

          <Text
            style={
              styles.errorMessage
            }
          >
            {rewardError}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={
              loadRewards
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              TRY AGAIN
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * NO REWARDS
   * ==========================================================
   */

  if (
    rewards.length === 0
  ) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="No rewards available"
      >
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorEmoji
            }
          >
            🎁
          </Text>

          <Text
            style={
              styles.errorTitle
            }
          >
            No Active Rewards
          </Text>

          <Text
            style={
              styles.errorMessage
            }
          >
            There are currently no active
            rewards configured by the
            administrator.
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={
              loadRewards
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              REFRESH
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * CANNOT SPIN
   * ==========================================================
   */

  if (
    !canSpin
  ) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Reward unavailable"
      >
        <View
          style={
            styles.lockedCard
          }
        >
          <View
            style={
              styles.lockedIcon
            }
          >
            <Text
              style={
                styles.lockedEmoji
              }
            >
              🔒
            </Text>
          </View>

          <Text
            style={
              styles.lockedTitle
            }
          >
            Spin Not Available
          </Text>

          <Text
            style={
              styles.lockedText
            }
          >
            Complete your store attendance
            and confirm an order before
            using the reward wheel.
          </Text>

          {!lastSubmission ? (
            <View
              style={
                styles.statusBoxInfo
              }
            >
              <Text
                style={
                  styles.statusTitleInfo
                }
              >
                Attendance Required
              </Text>

              <Text
                style={
                  styles.statusTextInfo
                }
              >
                Complete a store attendance
                first.
              </Text>
            </View>
          ) : null}

          {!selectedStore ? (
            <View
              style={
                styles.statusBoxInfo
              }
            >
              <Text
                style={
                  styles.statusTitleInfo
                }
              >
                Store Required
              </Text>

              <Text
                style={
                  styles.statusTextInfo
                }
              >
                Select a store and complete
                attendance first.
              </Text>
            </View>
          ) : null}

          {lastSubmission &&
          selectedStore &&
          orderPlaced !== true ? (
            <View
              style={
                styles.statusBoxInfo
              }
            >
              <Text
                style={
                  styles.statusTitleInfo
                }
              >
                No Order Recorded
              </Text>

              <Text
                style={
                  styles.statusTextInfo
                }
              >
                The Spin Wheel is only
                available when an order was
                placed.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={
              styles.attendanceButton
            }
            onPress={() =>
              router.replace(
                '/(sales)'
              )
            }
          >
            <Text
              style={
                styles.attendanceButtonText
              }
            >
              BACK TO HOME
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  /*
   * ==========================================================
   * SPIN FUNCTION
   * ==========================================================
   */

  const spinWheel = async () => {
    if (!canSpin) {
      console.log(
        'SPIN BLOCKED: canSpin = false'
      );
      return;
    }

    if (
      spinning ||
      wonReward ||
      spinCompleted
    ) {
      console.log(
        'SPIN BLOCKED: already spinning/completed'
      );
      return;
    }

    if (!lastSubmission?.attendanceId) {
      Alert.alert(
        'Attendance Required',
        'No attendance ID was found. Please complete attendance again.'
      );
      return;
    }

    if (!selectedStore?.id) {
      Alert.alert(
        'Store Required',
        'Please select a store first.'
      );
      return;
    }

    if (rewards.length === 0) {
      Alert.alert(
        'No Rewards',
        'There are no active rewards available.'
      );
      return;
    }

    if (!event?.id) {
      Alert.alert(
        'Event Required',
        'No active event was found. Please refresh and try again.'
      );
      return;
    }

    console.log(
      '================================'
    );
    console.log(
      'SPIN BUTTON PRESSED'
    );
    console.log(
      'ATTENDANCE ID:',
      lastSubmission.attendanceId
    );
    console.log(
      'STORE ID:',
      selectedStore.id
    );
    console.log(
      'ORDER PLACED:',
      orderPlaced
    );
    console.log(
      '================================'
    );

    setSpinning(true);

    try {
      /*
       * --------------------------------------------------------
       * GET CURRENT GPS BEFORE ANIMATION
       * --------------------------------------------------------
       *
       * We capture the GPS now so the database POST can happen
       * immediately after the wheel animation finishes.
       *
       * Nothing is written to Supabase at this point.
       */
      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (
        status !==
        Location.PermissionStatus.GRANTED
      ) {
        throw new Error(
          'Location permission is required to complete the spin.'
        );
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      const latitude =
        location.coords.latitude;

      const longitude =
        location.coords.longitude;

      console.log(
        'SPIN GPS CAPTURED:',
        {
          latitude,
          longitude,
        }
      );

      /*
       * --------------------------------------------------------
       * VISUAL SPIN ONLY
       * --------------------------------------------------------
       *
       * IMPORTANT:
       *
       * We intentionally do NOT select a reward here.
       *
       * The wheel simply performs a visual spin to a random
       * section. The actual reward is selected by PostgreSQL
       * after the animation completes.
       */
      const visibleRewards =
        rewards.slice(0, 4);

      if (
        visibleRewards.length === 0
      ) {
        throw new Error(
          'No rewards are available for the wheel.'
        );
      }

      const visualIndex =
        Math.floor(
          Math.random() *
            visibleRewards.length
        );

      const sliceAngle =
        360 /
        4;

      const selectedSliceCenter =
        visualIndex *
          sliceAngle +
        sliceAngle / 2;

      const targetRotation =
        360 -
        selectedSliceCenter;

      const extraTurns =
        360 * 6;

      const finalDegree =
        currentRotation.current +
        extraTurns +
        targetRotation;

      console.log(
        'VISUAL WHEEL INDEX:',
        visualIndex
      );

      console.log(
        'FINAL VISUAL ROTATION:',
        finalDegree
      );

      /*
       * --------------------------------------------------------
       * ANIMATE
       * --------------------------------------------------------
       */
      Animated.timing(
        spinValue,
        {
          toValue:
            finalDegree,
          duration:
            5000,
          easing:
            Easing.out(
              Easing.cubic
            ),
          useNativeDriver:
            true,
        }
      ).start(
        async ({
          finished,
        }) => {
          if (!finished) {
            console.warn(
              'SPIN ANIMATION DID NOT FINISH'
            );

            setSpinning(false);
            return;
          }

          currentRotation.current =
            finalDegree % 360;

          console.log(
            '================================'
          );
          console.log(
            'WHEEL ANIMATION COMPLETE'
          );
          console.log(
            'NOW CALLING DATABASE'
          );
          console.log(
            'POST /rest/v1/rpc/request_spin'
          );
          console.log(
            '================================'
          );

          try {
            /*
             * --------------------------------------------------
             * DATABASE POST
             * --------------------------------------------------
             *
             * THIS IS THE ONLY REWARD SUBMISSION.
             *
             * The call happens AFTER the wheel has completely
             * finished spinning.
             */
            const result =
              await submitCompletedReward({
                attendanceId:
                  lastSubmission.attendanceId,
                eventId: event.id,
                storeId:
                  selectedStore.id,
                latitude,
                longitude,
              });

            /*
             * --------------------------------------------------
             * MATCH SERVER RESULT TO WHEEL
             * --------------------------------------------------
             *
             * The database is authoritative.
             * The returned UUID determines which reward won.
             */
            const serverReward =
              visibleRewards.find(
                (reward) =>
                  reward.id ===
                  result.rewardId
              );

            if (!serverReward) {
              throw new Error(
                'The database returned a reward that is not displayed on the wheel.'
              );
            }

            /*
             * --------------------------------------------------
             * ALIGN THE WHEEL TO THE REAL SERVER WINNER
             * --------------------------------------------------
             *
             * The first animation above was only a visual spin.
             * The database is authoritative.
             *
             * If the random visual stop did not land on the
             * database-selected reward, perform a short final
             * alignment animation to the actual winning slice.
             */
            const serverRewardIndex =
              visibleRewards.findIndex(
                (reward) =>
                  reward.id ===
                  result.rewardId
              );

            if (
              serverRewardIndex >= 0
            ) {
              const serverSliceCenter =
                serverRewardIndex *
                  sliceAngle +
                sliceAngle / 2;

              const serverTargetRotation =
                360 -
                serverSliceCenter;

              const currentNormalized =
                currentRotation.current;

              let alignmentDelta =
                serverTargetRotation -
                currentNormalized;

              if (
                alignmentDelta < 0
              ) {
                alignmentDelta +=
                  360;
              }

              const alignmentDegree =
                currentRotation.current +
                alignmentDelta;

              await new Promise<void>(
                (resolve) => {
                  Animated.timing(
                    spinValue,
                    {
                      toValue:
                        alignmentDegree,
                      duration: 800,
                      easing:
                        Easing.out(
                          Easing.cubic
                        ),
                      useNativeDriver:
                        true,
                    }
                  ).start(
                    ({
                      finished:
                        alignmentFinished,
                    }) => {
                      if (
                        alignmentFinished
                      ) {
                        currentRotation.current =
                          alignmentDegree %
                          360;
                      }

                      resolve();
                    }
                  );
                }
              );
            }

            /*
             * --------------------------------------------------
             * SAVE REAL DATABASE RESULT
             * --------------------------------------------------
             */
            setLastSpin({
              spinId:
                result.spinId,

              status:
                result.status,

              reward: {
                id:
                  result.rewardId,

                name:
                  result.rewardName,

                value:
                  result.rewardValue,
              },

              rejectionReason:
                result.rejectionReason,
            });

            /*
             * Only mark the frontend flow complete AFTER
             * the database has successfully accepted the spin.
             */
            setWonReward(
              serverReward
            );

            setSpinCompleted(
              true
            );

            setSpinning(
              false
            );

            console.log(
              '================================'
            );
            console.log(
              'DATABASE SPIN COMPLETED'
            );
            console.log(
              'SPIN ID:',
              result.spinId
            );
            console.log(
              'REWARD ID:',
              result.rewardId
            );
            console.log(
              'REWARD:',
              result.rewardName
            );
            console.log(
              '================================'
            );
          } catch (
            error
          ) {
            console.error(
              'request_spin ERROR:',
              error
            );

            setSpinning(false);

            Alert.alert(
              'Reward Submission Failed',
              error instanceof Error
                ? error.message
                : 'The wheel finished, but the reward could not be recorded.'
            );
          }
        }
      );
    } catch (
      error
    ) {
      console.error(
        'SPIN ERROR:',
        error
      );

      setSpinning(false);

      Alert.alert(
        'Spin Failed',
        error instanceof Error
          ? error.message
          : 'Unable to complete the spin.'
      );
    }
  };

  /*
   * ==========================================================
   * ROTATION
   * ==========================================================
   */

  const spinInterpolation =
    spinValue.interpolate({
      inputRange: [
        0,
        360,
      ],

      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  /*
   * ==========================================================
   * MAIN SCREEN
   * ==========================================================
   */

  return (
    <ScreenContainer
      title="Spin Wheel"
      subtitle="Spin to win your reward"
    >
      <View
        style={
          styles.wheelCard
        }
      >
        {/* ================================================== */}
        {/* DATABASE BADGE */}
        {/* ================================================== */}

        <View
          style={
            styles.databaseBadge
          }
        >
          <View
            style={
              styles.databaseDot
            }
          />

          <Text
            style={
              styles.databaseBadgeText
            }
          >
            LIVE REWARDS
          </Text>
        </View>

        {/* ================================================== */}
        {/* ATTENDANCE */}
        {/* ================================================== */}

        <View
          style={
            styles.attendanceBadge
          }
        >
          <Text
            style={
              styles.attendanceBadgeText
            }
          >
            ✓ ATTENDANCE COMPLETE
          </Text>
        </View>

        {/* ================================================== */}
        {/* STORE */}
        {/* ================================================== */}

        {selectedStore ? (
          <View
            style={
              styles.storePill
            }
          >
            <Text
              style={
                styles.storePillText
              }
            >
              📍 {selectedStore.name}
            </Text>
          </View>
        ) : null}

        {/* ================================================== */}
        {/* ORDER */}
        {/* ================================================== */}

        <View
          style={
            styles.orderBadge
          }
        >
          <Text
            style={
              styles.orderBadgeText
            }
          >
            🛒 ORDER PLACED
          </Text>
        </View>

        {/* ================================================== */}
        {/* POINTER */}
        {/* ================================================== */}

        <View
          style={
            styles.pointerContainer
          }
        >
          <View
            style={
              styles.pointerOuter
            }
          >
            <View
              style={
                styles.pointerInner
              }
            />
          </View>
        </View>

        {/* ================================================== */}
        {/* WHEEL */}
        {/* ================================================== */}

        <View
          style={
            styles.wheelWrapper
          }
        >
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
            {/*
             * =================================================
             * FOUR EQUAL SECTIONS
             * =================================================
             *
             * IMPORTANT:
             *
             * Every section has exactly the same dimensions.
             *
             * Probability does NOT affect this.
             */}

            {[
              0,
              1,
              2,
              3,
            ].map(
              (
                index
              ) => {
                const reward =
                  rewards[
                    index
                  ];

                if (
                  !reward
                ) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={[
                        styles.quadrant,
                        getQuadrantStyle(
                          index
                        ),
                        styles.emptyQuadrant,
                      ]}
                    />
                  );
                }

                return (
                  <View
                    key={
                      reward.id
                    }
                    style={[
                      styles.quadrant,
                      getQuadrantStyle(
                        index
                      ),
                      {
                        backgroundColor:
                          reward.color,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.rewardLabelContainer
                      }
                    >
                      <Text
                        numberOfLines={
                          2
                        }
                        adjustsFontSizeToFit
                        style={[
                          styles.quadrantText,
                          getQuadrantTextStyle(
                            index
                          ),
                        ]}
                      >
                        {
                          reward.name
                        }
                      </Text>
                    </View>
                  </View>
                );
              }
            )}

            {/* ================================================= */}
            {/* DIVIDERS */}
            {/* ================================================= */}

            <View
              style={
                styles.verticalLine
              }
            />

            <View
              style={
                styles.horizontalLine
              }
            />
          </Animated.View>

          {/* ================================================= */}
          {/* CENTER */}
          {/* ================================================= */}

          <View
            style={
              styles.wheelCenterOuter
            }
          >
            <View
              style={
                styles.wheelCenterInner
              }
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
        </View>

        {/* ================================================== */}
        {/* RESULT */}
        {/* ================================================== */}

        {wonReward ? (
          <View
            style={[
              styles.resultCard,
              {
                borderColor:
                  wonReward.color,
              },
            ]}
          >
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor:
                    `${wonReward.color}18`,
                },
              ]}
            >
              <Text
                style={
                  styles.resultEmoji
                }
              >
                🎉
              </Text>
            </View>

            <Text
              style={[
                styles.resultBadgeText,
                {
                  color:
                    wonReward.color,
                },
              ]}
            >
              {
                wonReward.name
              }
            </Text>

            <Text
              style={
                styles.resultUnlocked
              }
            >
              REWARD UNLOCKED
            </Text>

            <Text
              style={
                styles.resultMessage
              }
            >
              You won:
              {' '}
              {
                wonReward.value
              }
            </Text>

            <View
              style={
                styles.codeContainer
              }
            >
              <Text
                style={
                  styles.codeLabel
                }
              >
                REWARD VALUE
              </Text>

              <Text
                style={
                  styles.codeValue
                }
              >
                {
                  wonReward.value
                }
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={
              styles.hintCard
            }
          >
            <Text
              style={
                styles.hintIcon
              }
            >
              ✨
            </Text>

            <View
              style={
                styles.hintContent
              }
            >
              <Text
                style={
                  styles.hintTitle
                }
              >
                Ready to spin?
              </Text>

              <Text
                style={
                  styles.hint
                }
              >
                Order confirmed. Spin the
                wheel to reveal your reward.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================== */}
        {/* SPIN BUTTON */}
        {/* ================================================== */}

        <Pressable
          style={[
            styles.spinButton,
            (spinning ||
              wonReward !== null) &&
              styles.spinButtonDisabled,
          ]}
          onPress={
            spinWheel
          }
          disabled={
            spinning ||
            wonReward !== null
          }
        >
          {spinning ? (
            <>
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />

              <Text
                style={
                  styles.spinButtonText
                }
              >
                SPINNING...
              </Text>
            </>
          ) : (
            <Text
              style={
                styles.spinButtonText
              }
            >
              {wonReward
                ? 'SPIN COMPLETED'
                : 'SPIN WHEEL'}
            </Text>
          )}
        </Pressable>

        {/* ================================================== */}
        {/* CLAIM REWARD */}
        {/* ================================================== */}

        {wonReward ? (
          <Pressable
            style={
              styles.resultRouteButton
            }
            onPress={() =>
              router.push(
                '/(sales)/spin/result'
              )
            }
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
          </Pressable>
        ) : null}

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        <Text
          style={
            styles.databaseNote
          }
        >
          Rewards are configured by the administrator.
        </Text>
      </View>
    </ScreenContainer>
  );
}

/*
 * ============================================================
 * QUADRANT POSITION
 * ============================================================
 *
 * 0 = TOP RIGHT
 * 1 = BOTTOM RIGHT
 * 2 = BOTTOM LEFT
 * 3 = TOP LEFT
 *
 * Every quadrant is exactly:
 *
 * WHEEL_SIZE / 2
 *
 * ============================================================
 */

function getQuadrantStyle(
  index: number
) {
  switch (
    index % 4
  ) {
    case 0:
      return styles.quadrantTR;

    case 1:
      return styles.quadrantBR;

    case 2:
      return styles.quadrantBL;

    case 3:
    default:
      return styles.quadrantTL;
  }
}

/*
 * ============================================================
 * TEXT ROTATION
 * ============================================================
 */

function getQuadrantTextStyle(
  index: number
) {
  switch (
    index % 4
  ) {
    case 0:
      return styles.quadrantTextTR;

    case 1:
      return styles.quadrantTextBR;

    case 2:
      return styles.quadrantTextBL;

    case 3:
    default:
      return styles.quadrantTextTL;
  }
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    /*
     * ========================================================
     * LOADING
     * ========================================================
     */

    loadingCard: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#ffffff',
      borderRadius:
        24,
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      padding: 30,
    },

    loadingTitle: {
      marginTop: 18,
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#0f172a',
    },

    loadingText: {
      marginTop: 6,
      fontSize: 13,
      color:
        '#64748b',
      textAlign:
        'center',
    },

    /*
     * ========================================================
     * ERROR
     * ========================================================
     */

    errorCard: {
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#ffffff',
      borderRadius:
        24,
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      padding: 28,
    },

    errorEmoji: {
      fontSize: 42,
      marginBottom: 14,
    },

    errorTitle: {
      fontSize: 21,
      fontWeight:
        '900',
      color:
        '#0f172a',
      textAlign:
        'center',
      marginBottom: 8,
    },

    errorMessage: {
      fontSize: 13,
      color:
        '#64748b',
      lineHeight: 20,
      textAlign:
        'center',
      marginBottom: 20,
    },

    retryButton: {
      width:
        '100%',
      backgroundColor:
        '#0f172a',
      borderRadius:
        14,
      paddingVertical:
        15,
      alignItems:
        'center',
    },

    retryButtonText: {
      color:
        '#ffffff',
      fontSize: 13,
      fontWeight:
        '900',
      letterSpacing:
        0.5,
    },

    /*
     * ========================================================
     * LOCKED
     * ========================================================
     */

    lockedCard: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#ffffff',
      borderRadius:
        24,
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      padding: 28,
    },

    lockedIcon: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor:
        '#f1f5f9',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 20,
    },

    lockedEmoji: {
      fontSize: 38,
    },

    lockedTitle: {
      fontSize: 24,
      fontWeight:
        '900',
      color:
        '#0f172a',
      textAlign:
        'center',
      marginBottom: 10,
    },

    lockedText: {
      fontSize: 14,
      color:
        '#64748b',
      lineHeight: 21,
      textAlign:
        'center',
      marginBottom: 18,
    },

    statusBoxInfo: {
      width:
        '100%',
      backgroundColor:
        '#f8fafc',
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      borderRadius:
        14,
      padding: 14,
      marginBottom: 12,
    },

    statusTitleInfo: {
      color:
        '#334155',
      fontSize: 14,
      fontWeight:
        '800',
      textAlign:
        'center',
      marginBottom: 4,
    },

    statusTextInfo: {
      color:
        '#64748b',
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        'center',
    },

    attendanceButton: {
      width:
        '100%',
      backgroundColor:
        '#0f172a',
      borderRadius:
        14,
      paddingVertical:
        15,
      alignItems:
        'center',
      marginTop: 8,
    },

    attendanceButtonText: {
      color:
        '#ffffff',
      fontSize: 13,
      fontWeight:
        '900',
      letterSpacing:
        0.5,
    },

    /*
     * ========================================================
     * COMPLETED
     * ========================================================
     */

    completedCard: {
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#ffffff',
      borderRadius:
        24,
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      padding: 28,
    },

    completedIcon: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor:
        '#ecfdf5',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 18,
    },

    completedEmoji: {
      fontSize: 42,
    },

    completedTitle: {
      fontSize: 24,
      fontWeight:
        '900',
      color:
        '#0f172a',
      textAlign:
        'center',
      marginBottom: 10,
    },

    completedText: {
      fontSize: 14,
      lineHeight: 21,
      color:
        '#64748b',
      textAlign:
        'center',
      marginBottom: 16,
    },

    backButton: {
      width:
        '100%',
      backgroundColor:
        '#0f172a',
      borderRadius:
        14,
      paddingVertical:
        15,
      alignItems:
        'center',
      marginTop: 10,
    },

    backButtonText: {
      color:
        '#ffffff',
      fontSize: 13,
      fontWeight:
        '900',
      letterSpacing:
        0.5,
    },

    /*
     * ========================================================
     * MAIN CARD
     * ========================================================
     */

    wheelCard: {
      backgroundColor:
        '#ffffff',
      borderRadius:
        24,
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      padding: 20,
      alignItems:
        'center',
      shadowColor:
        '#0f172a',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        0.06,
      shadowRadius:
        20,
      elevation: 3,
    },

    /*
     * ========================================================
     * DATABASE BADGE
     * ========================================================
     */

    databaseBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ecfdf5',
      borderWidth:
        1,
      borderColor:
        '#bbf7d0',
      borderRadius:
        999,
      paddingHorizontal:
        11,
      paddingVertical:
        6,
      marginBottom: 10,
    },

    databaseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        '#16a34a',
      marginRight: 6,
    },

    databaseBadgeText: {
      color:
        '#15803d',
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing:
        1,
    },

    /*
     * ========================================================
     * ATTENDANCE
     * ========================================================
     */

    attendanceBadge: {
      backgroundColor:
        '#ecfdf5',
      borderWidth:
        1,
      borderColor:
        '#bbf7d0',
      borderRadius:
        999,
      paddingHorizontal:
        13,
      paddingVertical:
        7,
      marginBottom: 10,
    },

    attendanceBadgeText: {
      color:
        '#15803d',
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing:
        0.6,
    },

    /*
     * ========================================================
     * STORE
     * ========================================================
     */

    storePill: {
      backgroundColor:
        '#f8fafc',
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      borderRadius:
        999,
      paddingHorizontal:
        13,
      paddingVertical:
        7,
      marginBottom: 10,
    },

    storePillText: {
      color:
        '#334155',
      fontSize: 12,
      fontWeight:
        '800',
    },

    /*
     * ========================================================
     * ORDER
     * ========================================================
     */

    orderBadge: {
      backgroundColor:
        '#eff6ff',
      borderWidth:
        1,
      borderColor:
        '#bfdbfe',
      borderRadius:
        999,
      paddingHorizontal:
        13,
      paddingVertical:
        7,
      marginBottom: 18,
    },

    orderBadgeText: {
      color:
        '#1d4ed8',
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing:
        0.6,
    },

    /*
     * ========================================================
     * POINTER
     * ========================================================
     */

    pointerContainer: {
      height: 27,
      alignItems:
        'center',
      justifyContent:
        'center',
      zIndex: 20,
      marginBottom: -2,
    },

    pointerOuter: {
      width: 0,
      height: 0,
      borderLeftWidth:
        14,
      borderRightWidth:
        14,
      borderTopWidth:
        27,
      borderLeftColor:
        'transparent',
      borderRightColor:
        'transparent',
      borderTopColor:
        '#0f172a',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    pointerInner: {
      position:
        'absolute',
      width: 0,
      height: 0,
      borderLeftWidth:
        7,
      borderRightWidth:
        7,
      borderTopWidth:
        15,
      borderLeftColor:
        'transparent',
      borderRightColor:
        'transparent',
      borderTopColor:
        '#ffffff',
      top: -23,
    },

    /*
     * ========================================================
     * WHEEL
     * ========================================================
     */

    wheelWrapper: {
      width:
        WHEEL_SIZE,
      height:
        WHEEL_SIZE,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 22,
    },

    wheelContainer: {
      width:
        WHEEL_SIZE,
      height:
        WHEEL_SIZE,
      borderRadius:
        WHEEL_SIZE / 2,
      overflow:
        'hidden',
      position:
        'relative',
      borderWidth:
        7,
      borderColor:
        '#0f172a',
      backgroundColor:
        '#ffffff',
    },

    /*
     * ========================================================
     * EQUAL QUADRANTS
     * ========================================================
     */

    quadrant: {
      position:
        'absolute',
      width:
        WHEEL_SIZE / 2,
      height:
        WHEEL_SIZE / 2,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    quadrantTR: {
      top: 0,
      right: 0,
      borderTopRightRadius:
        WHEEL_SIZE / 2,
    },

    quadrantBR: {
      bottom: 0,
      right: 0,
      borderBottomRightRadius:
        WHEEL_SIZE / 2,
    },

    quadrantBL: {
      bottom: 0,
      left: 0,
      borderBottomLeftRadius:
        WHEEL_SIZE / 2,
    },

    quadrantTL: {
      top: 0,
      left: 0,
      borderTopLeftRadius:
        WHEEL_SIZE / 2,
    },

    emptyQuadrant: {
      backgroundColor:
        '#e2e8f0',
    },

    /*
     * ========================================================
     * REWARD TEXT
     * ========================================================
     */

    rewardLabelContainer: {
      alignItems:
        'center',
      justifyContent:
        'center',
      width:
        WHEEL_SIZE / 2 - 15,
    },

    quadrantText: {
      color:
        '#ffffff',
      fontSize: 16,
      fontWeight:
        '900',
      textAlign:
        'center',
      textShadowColor:
        '#00000055',
      textShadowOffset: {
        width: 1,
        height: 1,
      },
      textShadowRadius: 2,
    },

    quadrantTextTR: {
      transform: [
        {
          rotate:
            '45deg',
        },
      ],
    },

    quadrantTextBR: {
      transform: [
        {
          rotate:
            '-45deg',
        },
      ],
    },

    quadrantTextBL: {
      transform: [
        {
          rotate:
            '45deg',
        },
      ],
    },

    quadrantTextTL: {
      transform: [
        {
          rotate:
            '-45deg',
        },
      ],
    },

    /*
     * ========================================================
     * DIVIDERS
     * ========================================================
     */

    verticalLine: {
      position:
        'absolute',
      width: 4,
      height:
        WHEEL_SIZE,
      backgroundColor:
        '#ffffff',
      left:
        WHEEL_SIZE / 2 - 2,
      top: 0,
    },

    horizontalLine: {
      position:
        'absolute',
      width:
        WHEEL_SIZE,
      height: 4,
      backgroundColor:
        '#ffffff',
      top:
        WHEEL_SIZE / 2 - 2,
      left: 0,
    },

    /*
     * ========================================================
     * CENTER
     * ========================================================
     */

    wheelCenterOuter: {
      position:
        'absolute',
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        '#0f172a',
      alignItems:
        'center',
      justifyContent:
        'center',
      zIndex: 10,
    },

    wheelCenterInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        '#ffffff',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    centerCapEmoji: {
      fontSize: 28,
    },

    /*
     * ========================================================
     * HINT
     * ========================================================
     */

    hintCard: {
      width:
        '100%',
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#f8fafc',
      borderWidth:
        1,
      borderColor:
        '#e2e8f0',
      borderRadius:
        14,
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
      color:
        '#334155',
      fontSize: 12,
      fontWeight:
        '900',
      marginBottom: 2,
    },

    hint: {
      color:
        '#64748b',
      fontSize: 11,
      lineHeight: 16,
    },

    /*
     * ========================================================
     * RESULT
     * ========================================================
     */

    resultCard: {
      width:
        '100%',
      borderWidth:
        2,
      borderRadius:
        18,
      padding: 17,
      marginBottom: 16,
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
    },

    resultIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 8,
    },

    resultEmoji: {
      fontSize: 25,
    },

    resultBadgeText: {
      fontSize: 22,
      fontWeight:
        '900',
      textAlign:
        'center',
      marginBottom: 2,
    },

    resultUnlocked: {
      color:
        '#94a3b8',
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing:
        1,
      marginBottom: 8,
    },

    resultMessage: {
      fontSize: 13,
      color:
        '#475569',
      lineHeight: 19,
      textAlign:
        'center',
      marginBottom: 13,
    },

    codeContainer: {
      width:
        '100%',
      backgroundColor:
        '#f8fafc',
      borderRadius:
        11,
      padding: 11,
      alignItems:
        'center',
    },

    codeLabel: {
      color:
        '#94a3b8',
      fontSize: 8,
      fontWeight:
        '900',
      letterSpacing:
        1,
      marginBottom: 3,
    },

    codeValue: {
      color:
        '#0f172a',
      fontSize: 18,
      fontWeight:
        '900',
      letterSpacing:
        1,
    },

    /*
     * ========================================================
     * SPIN BUTTON
     * ========================================================
     */

    spinButton: {
      width:
        '100%',
      backgroundColor:
        '#0f172a',
      borderRadius:
        15,
      paddingVertical:
        16,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      gap: 9,
      shadowColor:
        '#0f172a',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity:
        0.15,
      shadowRadius:
        10,
      elevation: 3,
    },

    spinButtonDisabled: {
      opacity:
        0.45,
    },

    spinButtonText: {
      color:
        '#ffffff',
      fontSize: 14,
      fontWeight:
        '900',
      letterSpacing:
        0.7,
    },

    /*
     * ========================================================
     * CLAIM
     * ========================================================
     */

    resultRouteButton: {
      width:
        '100%',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#16a34a',
      borderRadius:
        15,
      paddingVertical:
        16,
      marginTop: 10,
    },

    resultRouteButtonText: {
      color:
        '#ffffff',
      fontSize: 14,
      fontWeight:
        '900',
      letterSpacing:
        0.6,
    },

    resultRouteArrow: {
      color:
        '#ffffff',
      fontSize: 18,
      fontWeight:
        '900',
      marginLeft: 8,
    },

    /*
     * ========================================================
     * FOOTER
     * ========================================================
     */

    databaseNote: {
      color:
        '#94a3b8',
      fontSize: 9,
      textAlign:
        'center',
      lineHeight: 14,
      marginTop: 13,
    },
  });