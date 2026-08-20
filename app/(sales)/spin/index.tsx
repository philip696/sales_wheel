import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';
import { listActiveRewards } from '@/src/services/rewardService';
import type { Reward } from '@/src/types';
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
 * SELECT REWARD USING DATABASE PROBABILITY
 * ============================================================
 *
 * The probability comes directly from the rewards table.
 *
 * Example:
 *
 * reward A = 0.25
 * reward B = 0.35
 * reward C = 0.25
 * reward D = 0.15
 *
 * Total = 1.00
 *
 * Probability is NOT displayed to the user.
 *
 * ============================================================
 */

function selectRewardByProbability(
  rewards: WheelReward[]
): WheelReward {
  if (rewards.length === 0) {
    throw new Error(
      'No active rewards are available.'
    );
  }

  const totalProbability =
    rewards.reduce(
      (sum, reward) =>
        sum + Number(reward.probability),
      0
    );

  console.log(
    '================================================'
  );

  console.log(
    'SPIN REWARD SELECTION'
  );

  console.log(
    'TOTAL REWARD PROBABILITY:',
    totalProbability
  );

  /*
   * Random number based on the total probability.
   */

  const random =
    Math.random() *
    totalProbability;

  console.log(
    'RANDOM VALUE:',
    random
  );

  let cumulative = 0;

  for (
    const reward of rewards
  ) {
    cumulative +=
      Number(
        reward.probability
      );

    console.log(
      'CHECKING REWARD:',
      {
        id: reward.id,
        name: reward.name,
        probability:
          reward.probability,
        cumulative,
      }
    );

    if (
      random <
      cumulative
    ) {
      console.log(
        'SELECTED REWARD:',
        {
          id: reward.id,
          name: reward.name,
          value: reward.value,
        }
      );

      console.log(
        '================================================'
      );

      return reward;
    }
  }

  /*
   * Floating point safety fallback.
   */

  const fallback =
    rewards[
      rewards.length - 1
    ];

  console.log(
    'PROBABILITY FALLBACK:',
    fallback
  );

  console.log(
    '================================================'
  );

  return fallback;
}

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

        const data =
          await listActiveRewards();

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

  if (
    spinCompleted
  ) {
    return (
      <ScreenContainer
        title="Spin Wheel"
        subtitle="Reward already claimed"
      >
        <View
          style={
            styles.completedCard
          }
        >
          <View
            style={
              styles.completedIcon
            }
          >
            <Text
              style={
                styles.completedEmoji
              }
            >
              🎉
            </Text>
          </View>

          <Text
            style={
              styles.completedTitle
            }
          >
            Wheel Already Spun
          </Text>

          <Text
            style={
              styles.completedText
            }
          >
            You have already used the
            Spin Wheel for this
            attendance.
          </Text>

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

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.replace(
                '/(sales)'
              )
            }
          >
            <Text
              style={
                styles.backButtonText
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

  const spinWheel =
    async () => {
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

      if (
        !lastSubmission
      ) {
        Alert.alert(
          'Attendance Required',
          'Complete attendance before spinning.'
        );

        return;
      }

      if (
        !selectedStore
      ) {
        Alert.alert(
          'Store Required',
          'Please select a store first.'
        );

        return;
      }

      if (
        rewards.length === 0
      ) {
        Alert.alert(
          'No Rewards',
          'There are no active rewards available.'
        );

        return;
      }

      console.log(
        '================================================'
      );

      console.log(
        'STARTING SPIN'
      );

      console.log(
        'STORE:',
        selectedStore
      );

      console.log(
        'ATTENDANCE:',
        lastSubmission
      );

      console.log(
        'ORDER PLACED:',
        orderPlaced
      );

      /*
       * Do NOT log probability on the UI.
       *
       * It can still be logged in development console.
       */

      console.log(
        'AVAILABLE REWARDS:',
        rewards
      );

      setSpinning(
        true
      );

      try {
        /*
         * ======================================================
         * SELECT WINNER
         * ======================================================
         *
         * Probability comes from Supabase.
         *
         * Probability is hidden from the sales user.
         */

        const selectedReward =
          selectRewardByProbability(
            rewards
          );

        console.log(
          'FINAL SELECTED REWARD:',
          {
            id:
              selectedReward.id,

            name:
              selectedReward.name,

            value:
              selectedReward.value,

            wheelIndex:
              selectedReward.wheelIndex,
          }
        );

        /*
         * ======================================================
         * SAVE LOCAL FLOW RESULT
         * ======================================================
         *
         * This does NOT modify the database.
         *
         * It updates your existing context.
         */

        try {
          setLastSpin({
            spinId:
              `frontend-${Date.now()}`,

            status:
              'completed',

            reward: {
              id:
                selectedReward.id,

              name:
                selectedReward.name,

              value:
                selectedReward.value,
            },

            rejectionReason:
              null,
          });

          console.log(
            'LOCAL SPIN RESULT SAVED TO CONTEXT'
          );
        } catch (
          contextError
        ) {
          console.warn(
            'COULD NOT SAVE SPIN TO CONTEXT:',
            contextError
          );
        }

        /*
         * ======================================================
         * EQUAL SLICE SIZE
         * ======================================================
         *
         * Example:
         *
         * 4 rewards = 90 degrees each
         *
         * 3 rewards = 120 degrees each
         *
         * 2 rewards = 180 degrees each
         *
         * Probability NEVER changes this.
         */

        const visibleRewards =
          rewards.slice(
            0,
            4
          );

        const rewardIndex =
          visibleRewards.findIndex(
            (
              reward
            ) =>
              reward.id ===
              selectedReward.id
          );

        /*
         * Safety check.
         */

        if (
          rewardIndex < 0
        ) {
          throw new Error(
            'Selected reward is not visible on the wheel.'
          );
        }

        const sliceAngle =
          360 /
          4;

        console.log(
          'WHEEL SLICE ANGLE:',
          sliceAngle
        );

        console.log(
          'SELECTED WHEEL INDEX:',
          rewardIndex
        );

        /*
         * ======================================================
         * POINTER ALIGNMENT
         * ======================================================
         */

        const selectedSliceCenter =
          rewardIndex *
            sliceAngle +
          sliceAngle / 2;

        const targetRotation =
          360 -
          selectedSliceCenter;

        /*
         * Six complete rotations.
         */

        const extraTurns =
          360 * 6;

        const finalDegree =
          currentRotation.current +
          extraTurns +
          targetRotation;

        console.log(
          'SELECTED SLICE CENTER:',
          selectedSliceCenter
        );

        console.log(
          'TARGET ROTATION:',
          targetRotation
        );

        console.log(
          'FINAL ROTATION:',
          finalDegree
        );

        /*
         * ======================================================
         * ANIMATION
         * ======================================================
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
          ({
            finished,
          }) => {
            if (
              !finished
            ) {
              console.warn(
                'SPIN ANIMATION DID NOT FINISH'
              );

              setSpinning(
                false
              );

              return;
            }

            currentRotation.current =
              finalDegree %
              360;

            console.log(
              'SPIN ANIMATION COMPLETE'
            );

            console.log(
              'WINNER:',
              selectedReward
            );

            /*
             * Show result.
             */

            setWonReward(
              selectedReward
            );

            /*
             * Mark local flow complete.
             */

            setSpinCompleted(
              true
            );

            setSpinning(
              false
            );

            console.log(
              'SPIN COMPLETED'
            );

            console.log(
              '================================================'
            );
          }
        );
      } catch (
        error
      ) {
        console.error(
          'SPIN ERROR:',
          error
        );

        setSpinning(
          false
        );

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