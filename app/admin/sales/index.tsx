import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';

type SalesUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type Attendance = {
  sales_id: string;
  status: string | null;
  created_at: string | null;
  server_created_at: string | null;
};

type SalesRow = SalesUser & {
  attendanceStatus: string | null;
  attendanceTime: string | null;
};

export default function AdminSalesScreen() {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setError(null);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (salesError) {
        throw salesError;
      }

      if (!salesData || salesData.length === 0) {
        setSales([]);
        return;
      }

      const salesIds = salesData.map((user) => user.id);

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from('attendance')
          .select(
            'sales_id, status, created_at, server_created_at',
          )
          .in('sales_id', salesIds)
          .order('server_created_at', { ascending: false });

      if (attendanceError) {
        throw attendanceError;
      }

      /*
       * attendance is ordered newest first.
       * Keep only the latest attendance record for each salesperson.
       */
      const latestAttendance = new Map<string, Attendance>();

      for (const attendance of attendanceData ?? []) {
        if (!latestAttendance.has(attendance.sales_id)) {
          latestAttendance.set(attendance.sales_id, attendance);
        }
      }

      const rows: SalesRow[] = salesData.map((user) => {
        const attendance = latestAttendance.get(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          attendanceStatus: attendance?.status ?? null,
          attendanceTime:
            attendance?.server_created_at ??
            attendance?.created_at ??
            null,
        };
      });

      setSales(rows);
    } catch (err) {
      console.error('Failed to fetch sales:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load sales data.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const handleSalesPress = (salesId: string) => {
    if (!salesId) {
      console.error('Cannot open sales calendar: missing sales ID');
      return;
    }

    router.push({
      pathname: '/admin/sales/[id]',
      params: {
        id: salesId,
      },
    });
  };

  const formatAttendanceTime = (time: string | null) => {
    if (!time) {
      return '—';
    }

    const date = new Date(time);

    if (Number.isNaN(date.getTime())) {
      return time;
    }

    return date.toLocaleString();
  };

  const getStatusStyle = (status: string | null) => {
    if (!status) {
      return styles.statusUnknown;
    }

    switch (status.toLowerCase()) {
      case 'approved':
      case 'present':
      case 'attended':
        return styles.statusApproved;

      case 'rejected':
      case 'absent':
        return styles.statusRejected;

      case 'pending':
        return styles.statusPending;

      default:
        return styles.statusUnknown;
    }
  };

  const renderItem = ({ item }: { item: SalesRow }) => (
    <Pressable
      onPress={() => handleSalesPress(item.id)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.infoSection}>
        <Text style={styles.name}>
          {item.name || 'Unnamed Sales User'}
        </Text>

        <Text style={styles.email}>
          {item.email || 'No email'}
        </Text>
      </View>

      <View style={styles.attendanceSection}>
        <View style={styles.statusContainer}>
          <Text style={styles.label}>Attendance Status</Text>

          <View
            style={[
              styles.statusBadge,
              getStatusStyle(item.attendanceStatus),
            ]}
          >
            <Text style={styles.statusText}>
              {item.attendanceStatus || 'No attendance'}
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.label}>Attendance Time</Text>

          <Text style={styles.time}>
            {formatAttendanceTime(item.attendanceTime)}
          </Text>
        </View>
      </View>

      <Text style={styles.viewCalendar}>
        View attendance calendar →
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading sales...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales</Text>

        <Text style={styles.subtitle}>
          {sales.length} sales representative
          {sales.length === 1 ? '' : 's'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Unable to load sales
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={fetchSales}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            sales.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                No sales representatives found
              </Text>

              <Text style={styles.emptyText}>
                There are currently no records in public.sales.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666666',
  },

  listContent: {
    padding: 16,
    gap: 12,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  cardPressed: {
    opacity: 0.7,
  },

  infoSection: {
    marginBottom: 16,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },

  email: {
    marginTop: 4,
    fontSize: 14,
    color: '#666666',
  },

  attendanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },

  statusContainer: {
    flex: 1,
  },

  timeContainer: {
    flex: 1,
  },

  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
    textTransform: 'uppercase',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusApproved: {
    backgroundColor: '#dcfce7',
  },

  statusRejected: {
    backgroundColor: '#fee2e2',
  },

  statusPending: {
    backgroundColor: '#fef3c7',
  },

  statusUnknown: {
    backgroundColor: '#e5e7eb',
  },

  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    textTransform: 'capitalize',
  },

  time: {
    fontSize: 14,
    color: '#222222',
  },

  viewCalendar: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },

  emptyContainer: {
    flexGrow: 1,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },

  errorContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
  },

  errorText: {
    marginTop: 6,
    fontSize: 14,
    color: '#7f1d1d',
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111111',
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});