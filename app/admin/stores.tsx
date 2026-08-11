import { ScreenContainer } from '@/src/components/ScreenContainer';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const STORES = [
  {
    name: 'Store Example',
    code: 'STORE-001',
    address: 'Store address',
    radius: '—',
    status: 'Active',
  },
  {
    name: 'Store Example',
    code: 'STORE-002',
    address: 'Store address',
    radius: '—',
    status: 'Active',
  },
];

export default function AdminStoresScreen() {
  return (
    <ScreenContainer
      title="Store Management"
      subtitle="Manage stores, locations and GPS radius"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Store Management</Text>

            <Text style={styles.headerText}>
              Create and manage stores with configurable GPS locations and
              attendance radius.
            </Text>
          </View>

          <Text style={styles.headerIcon}>🏪</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Total Stores</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {/* Stores */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Stores</Text>

          <Text style={styles.sectionCount}>— stores</Text>
        </View>

        {STORES.map((store, index) => (
          <Pressable
            key={`${store.code}-${index}`}
            style={({ pressed }) => [
              styles.storeCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.storeIcon}>
              <Text style={styles.emoji}>🏪</Text>
            </View>

            <View style={styles.storeContent}>
              <Text style={styles.storeName}>{store.name}</Text>

              <Text style={styles.storeCode}>{store.code}</Text>

              <Text style={styles.storeAddress}>{store.address}</Text>

              <View style={styles.locationRow}>
                <Text style={styles.locationText}>
                  📍 GPS radius: {store.radius}m
                </Text>
              </View>
            </View>

            <View style={styles.rightSide}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{store.status}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>
        ))}

        {/* Backend information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>GPS Configuration</Text>

          <Text style={styles.infoText}>
            Store coordinates and radius_meters are used by the attendance
            verification flow. The existing backend remains unchanged.
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

  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 5,
  },

  headerText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
  },

  headerIcon: {
    fontSize: 42,
    marginLeft: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  sectionCount: {
    fontSize: 12,
    color: '#64748b',
  },

  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  pressed: {
    opacity: 0.7,
  },

  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  emoji: {
    fontSize: 24,
  },

  storeContent: {
    flex: 1,
  },

  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  storeCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 3,
  },

  storeAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 7,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationText: {
    fontSize: 11,
    color: '#64748b',
  },

  rightSide: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  statusBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  statusText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '700',
  },

  arrow: {
    fontSize: 22,
    color: '#94a3b8',
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 19,
  },
});