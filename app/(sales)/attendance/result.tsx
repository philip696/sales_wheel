import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

export default function AttendanceResultScreen() {
  const {
    lastSubmission,
    selectedStore,
    setOrderPlaced,
    resetFlow,
  } = useAttendanceFlow();

  /*
   * =========================================================
   * NO ATTENDANCE FOUND
   * =========================================================
   */

  if (!lastSubmission) {
    return (
      <ScreenContainer
        title="Attendance Result"
        subtitle="Attendance"
      >
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>
            📍
          </Text>

          <Text style={styles.placeholderTitle}>
            No Attendance Found
          </Text>

          <Text style={styles.text}>
            There is no attendance submission to show.
            Please start a new attendance from the
            home screen.
          </Text>
        </View>

        <PrimaryButton
          title="START ATTENDANCE"
          onPress={() => {
            resetFlow();

            router.replace(
              '/(sales)/stores'
            );
          }}
          style={styles.button}
        />

        <PrimaryButton
          title="BACK TO HOME"
          variant="secondary"
          onPress={() => {
            resetFlow();

            router.replace(
              '/(sales)'
            );
          }}
        />
      </ScreenContainer>
    );
  }

  /*
   * =========================================================
   * ORDER YES
   * =========================================================
   *
   * IMPORTANT:
   *
   * We DO NOT reset the flow here.
   *
   * The Spin screen needs:
   *
   * - selectedStore
   * - lastSubmission
   * - orderPlaced = true
   *
   */

  const handleOrderYes = () => {
    setOrderPlaced(true);

    router.push(
      '/(sales)/spin'
    );
  };

  /*
   * =========================================================
   * ORDER NO
   * =========================================================
   *
   * IMPORTANT:
   *
   * We DO NOT call resetFlow().
   *
   * resetFlow() would remove:
   *
   * - lastSubmission
   * - selectedStore
   *
   * We want Home to show:
   *
   * ORDER: NO
   *
   * after returning.
   */

  const handleOrderNo = () => {
    setOrderPlaced(false);

    router.replace(
      '/(sales)'
    );
  };

  return (
    <ScreenContainer
      title="Attendance Complete"
      subtitle={
        selectedStore?.name ??
        'Store Visit'
      }
    >
      {/* ================================================= */}
      {/* ATTENDANCE SUCCESS */}
      {/* ================================================= */}

      <View style={styles.successBox}>
        <View style={styles.successIconContainer}>
          <Text style={styles.successIcon}>
            ✓
          </Text>
        </View>

        <Text style={styles.successTitle}>
          Attendance Submitted
        </Text>

        <Text style={styles.successText}>
          Your store attendance has been
          successfully recorded.
        </Text>

        {/* ================================================= */}
        {/* STORE */}
        {/* ================================================= */}

        {selectedStore ? (
          <View style={styles.storeInfo}>
            <Text style={styles.label}>
              STORE
            </Text>

            <Text style={styles.storeName}>
              {selectedStore.name}
            </Text>

            {selectedStore.store_code ? (
              <Text style={styles.storeCode}>
                {selectedStore.store_code}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ================================================= */}
        {/* GPS DISTANCE */}
        {/* ================================================= */}

        <View style={styles.distanceInfo}>
          <Text style={styles.label}>
            GPS DISTANCE
          </Text>

          <Text style={styles.distanceValue}>
            {typeof lastSubmission.distanceMeters ===
            'number'
              ? `${lastSubmission.distanceMeters.toFixed(
                  1
                )}m`
              : 'Verified'}
          </Text>
        </View>
      </View>

      {/* ================================================= */}
      {/* ORDER QUESTION */}
      {/* ================================================= */}

      <View style={styles.orderQuestion}>
        <View style={styles.questionIcon}>
          <Text style={styles.questionEmoji}>
            🛒
          </Text>
        </View>

        <Text style={styles.questionTitle}>
          Did you place an order?
        </Text>

        <Text style={styles.questionText}>
          Tell us whether the store placed an
          order during this visit.
        </Text>
      </View>

      {/* ================================================= */}
      {/* YES — ORDER PLACED */}
      {/* ================================================= */}

      <View style={styles.optionCard}>
        <View style={styles.optionContent}>
          <View
            style={[
              styles.optionIcon,
              styles.yesIcon,
            ]}
          >
            <Text style={styles.yesIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>
              YES — ORDER PLACED
            </Text>

            <Text style={styles.optionDescription}>
              The store placed an order. Continue
              to the Spin Wheel and claim your
              reward.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="YES — GO TO SPIN"
          onPress={handleOrderYes}
          style={styles.yesButton}
        />
      </View>

      {/* ================================================= */}
      {/* NO — NO ORDER */}
      {/* ================================================= */}

      <View style={styles.optionCard}>
        <View style={styles.optionContent}>
          <View
            style={[
              styles.optionIcon,
              styles.noIcon,
            ]}
          >
            <Text style={styles.noIconText}>
              —
            </Text>
          </View>

          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>
              NO — NO ORDER
            </Text>

            <Text style={styles.optionDescription}>
              No order was placed. Finish this visit
              and return to the home screen.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="NO — FINISH VISIT"
          variant="secondary"
          onPress={handleOrderNo}
          style={styles.noButton}
        />
      </View>

      {/* ================================================= */}
      {/* ATTENDANCE RECORD */}
      {/* ================================================= */}

      <View style={styles.recordInfo}>
        <Text style={styles.recordLabel}>
          ATTENDANCE RECORDED
        </Text>

        <Text style={styles.recordId}>
          {lastSubmission.attendanceId}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /* =========================================================
   * SUCCESS
   * ========================================================= */

  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center',
  },

  successIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  successIcon: {
    fontSize: 32,
    fontWeight: '900',
    color: '#16a34a',
  },

  successTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 6,
    textAlign: 'center',
  },

  successText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },

  /* =========================================================
   * STORE
   * ========================================================= */

  storeInfo: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
  },

  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  storeName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },

  storeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },

  distanceInfo: {
    marginTop: 12,
    alignItems: 'center',
  },

  distanceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },

  /* =========================================================
   * ORDER QUESTION
   * ========================================================= */

  orderQuestion: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },

  questionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  questionEmoji: {
    fontSize: 25,
  },

  questionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },

  questionText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    textAlign: 'center',
  },

  /* =========================================================
   * OPTION CARDS
   * ========================================================= */

  optionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  yesIcon: {
    backgroundColor: '#dcfce7',
  },

  noIcon: {
    backgroundColor: '#f1f5f9',
  },

  yesIconText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#16a34a',
  },

  noIconText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#64748b',
  },

  optionTextContainer: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },

  optionDescription: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 15,
  },

  /* =========================================================
   * BUTTONS
   * ========================================================= */

  yesButton: {
    marginTop: 0,
  },

  noButton: {
    marginTop: 0,
  },

  /* =========================================================
   * RECORD
   * ========================================================= */

  recordInfo: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 20,
  },

  recordLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  recordId: {
    fontSize: 8,
    color: '#cbd5e1',
    textAlign: 'center',
  },

  /* =========================================================
   * EMPTY
   * ========================================================= */

  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  placeholderIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  placeholderTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },

  text: {
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 12,
  },

  /* =========================================================
   * GENERAL
   * ========================================================= */

  button: {
    marginBottom: 12,
  },
});