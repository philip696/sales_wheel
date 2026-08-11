import { ScreenContainer } from '@/src/components/ScreenContainer';
import { StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <ScreenContainer
      title="Visit History"
      subtitle="Your attendance and reward activity"
    >
      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Text style={styles.summaryEmoji}>📋</Text>
        </View>

        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>
            Activity History
          </Text>

          <Text style={styles.summaryText}>
            Keep track of your store visits and rewards
            earned from the spin wheel.
          </Text>
        </View>
      </View>

      {/* Empty State */}
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>🗂️</Text>
        </View>

        <Text style={styles.emptyTitle}>
          No History Yet
        </Text>

        <Text style={styles.emptyText}>
          Your completed attendance visits and spin
          rewards will appear here.
        </Text>
      </View>

      {/* Backend Note */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          🔒 Secure Activity
        </Text>

        <Text style={styles.infoText}>
          Attendance and reward records are securely
          stored and validated by the server.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  summaryEmoji: {
    fontSize: 23,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e40af',
    marginBottom: 4,
  },

  summaryText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },

  emptyCard: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 17,
    padding: 28,
    marginBottom: 18,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyEmoji: {
    fontSize: 32,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  infoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },

  infoText: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
  },
});