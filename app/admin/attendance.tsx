import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AdminAttendanceScreen() {
  return (
    <ScreenContainer
      title="Attendance Monitoring"
      subtitle="Monitor sales attendance and verification"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>—</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.approved]}>
              —
            </Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.rejected]}>
              —
            </Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Records</Text>

          <View style={styles.filterRow}>
            <View style={styles.filter}>
              <Text style={styles.filterText}>All Status</Text>
            </View>

            <View style={styles.filter}>
              <Text style={styles.filterText}>Today</Text>
            </View>
          </View>
        </View>

        {/* Empty state */}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>

          <Text style={styles.emptyTitle}>
            Attendance Records
          </Text>

          <Text style={styles.emptyText}>
            Attendance records, verification photos, GPS data,
            approval status, and rejection reasons will appear here.
          </Text>
        </View>

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Verification Details</Text>

          <Text style={styles.infoItem}>
            📍 GPS location verification
          </Text>

          <Text style={styles.infoItem}>
            📷 Attendance photo
          </Text>

          <Text style={styles.infoItem}>
            ✅ Approval / rejection status
          </Text>

          <Text style={styles.infoItem}>
            📝 Rejection reason
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  summaryNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  approved: {
    color: '#16a34a',
  },

  rejected: {
    color: '#dc2626',
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },

  filter: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  infoItem: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
  },
});