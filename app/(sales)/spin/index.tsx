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

// 4 distinct discount tiers
const DISCOUNTS = [
  { 
    id: 1, 
    label: '5% OFF', 
    color: '#3b82f6', // Blue
    code: 'SAVE5NOW', 
    message: 'Nice start! Take 5% off your next store order.' 
  },
  { 
    id: 2, 
    label: '10% OFF', 
    color: '#10b981', // Green
    code: 'SAVE10NOW', 
    message: 'Great win! Enjoy 10% off your purchase.' 
  },
  { 
    id: 3, 
    label: '15% OFF', 
    color: '#f59e0b', // Orange
    code: 'SAVE15NOW', 
    message: 'Awesome! 15% discount unlocked!' 
  },
  { 
    id: 4, 
    label: '20% OFF', 
    color: '#ef4444', // Red
    code: 'SAVE20NOW', 
    message: 'Jackpot! You got the maximum 20% discount!' 
  },
];

export default function SpinScreen() {
  const [spinning, setSpinning] = useState(false);
  const [wonDiscount, setWonDiscount] = useState<typeof DISCOUNTS[number] | null>(null);

  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const spinWheel = () => {
    // Prevent spinning if currently spinning or if a reward has already been won
    if (spinning || wonDiscount) return;

    setSpinning(true);

    // Pick random index (0 to 3)
    const randomIndex = Math.floor(Math.random() * DISCOUNTS.length);
    const sliceAngle = 360 / DISCOUNTS.length; // 90 deg per slice

    // 5 full spins + align top pointer with the target slice center
    const extraTurns = 360 * 5;
    const targetSliceDegree = 360 - (randomIndex * sliceAngle + 45);
    const finalDegree = currentRotation.current + extraTurns + targetSliceDegree;

    Animated.timing(spinValue, {
      toValue: finalDegree,
      duration: 4500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current = finalDegree % 360;
      setSpinning(false);
      setWonDiscount(DISCOUNTS[randomIndex]);
    });
  };

  const spinInterpolation = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScreenContainer
      title="Spin Wheel"
      subtitle="Spin to win 5%, 10%, 15%, or 20% OFF"
    >
      <View style={styles.wheelCard}>
        {/* Pointer Arrow */}
        <View style={styles.pointerContainer}>
          <Text style={styles.pointerIcon}>▼</Text>
        </View>

        {/* Animated Wheel Container */}
        <View style={styles.wheelWrapper}>
          <Animated.View
            style={[
              styles.wheelContainer,
              { transform: [{ rotate: spinInterpolation }] },
            ]}
          >
            {/* Quadrant 1: Top-Right (5% OFF) */}
            <View style={[styles.quadrant, styles.quadrantTR, { backgroundColor: DISCOUNTS[0].color }]}>
              <Text style={[styles.quadrantText, { transform: [{ rotate: '45deg' }] }]}>
                {DISCOUNTS[0].label}
              </Text>
            </View>

            {/* Quadrant 2: Bottom-Right (10% OFF) */}
            <View style={[styles.quadrant, styles.quadrantBR, { backgroundColor: DISCOUNTS[1].color }]}>
              <Text style={[styles.quadrantText, { transform: [{ rotate: '-45deg' }] }]}>
                {DISCOUNTS[1].label}
              </Text>
            </View>

            {/* Quadrant 3: Bottom-Left (15% OFF) */}
            <View style={[styles.quadrant, styles.quadrantBL, { backgroundColor: DISCOUNTS[2].color }]}>
              <Text style={[styles.quadrantText, { transform: [{ rotate: '45deg' }] }]}>
                {DISCOUNTS[2].label}
              </Text>
            </View>

            {/* Quadrant 4: Top-Left (20% OFF) */}
            <View style={[styles.quadrant, styles.quadrantTL, { backgroundColor: DISCOUNTS[3].color }]}>
              <Text style={[styles.quadrantText, { transform: [{ rotate: '-45deg' }] }]}>
                {DISCOUNTS[3].label}
              </Text>
            </View>

            {/* Cross Lines Separating Slices */}
            <View style={styles.verticalLine} />
            <View style={styles.horizontalLine} />
          </Animated.View>

          {/* Wheel Center Cap */}
          <View style={styles.wheelCenterCap}>
            <Text style={styles.centerCapEmoji}>🎁</Text>
          </View>
        </View>

        {/* Dynamic Result Card */}
        {wonDiscount ? (
          <View style={[styles.resultCard, { borderColor: wonDiscount.color }]}>
            <Text style={[styles.resultBadgeText, { color: wonDiscount.color }]}>
              🎉 {wonDiscount.label} UNLOCKED!
            </Text>
            <Text style={styles.resultMessage}>{wonDiscount.message}</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Promo Code:</Text>
              <Text style={styles.codeValue}>{wonDiscount.code}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>
            Spin the wheel to get a random discount between 5% and 20%.
          </Text>
        )}

        {/* Single-Use Spin Button */}
        <TouchableOpacity
          style={[
            styles.spinButton,
            (spinning || wonDiscount !== null) && styles.spinButtonDisabled,
          ]}
          onPress={spinWheel}
          disabled={spinning || wonDiscount !== null}
          activeOpacity={0.8}
        >
          <Text style={styles.spinButtonText}>
            {spinning
              ? 'SPINNING...'
              : wonDiscount
              ? 'SPIN COMPLETED'
              : 'SPIN WHEEL'}
          </Text>
        </TouchableOpacity>

        {wonDiscount && (
          <TouchableOpacity
            style={styles.resultRouteButton}
            onPress={() => router.push('/(sales)/spin/result')}
          >
            <Text style={styles.resultRouteButtonText}>CLAIM REWARD ›</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

const WHEEL_SIZE = 220;

const styles = StyleSheet.create({
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
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 4,
    borderColor: '#0f172a',
  },

  /* Quadrant Slice Styles */
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

  /* Clean Divider Lines */
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: WHEEL_SIZE / 2 - 1.5,
    width: 3,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_SIZE / 2 - 1.5,
    height: 3,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },

  /* Wheel Center Cap */
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

  /* Hints and Results */
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