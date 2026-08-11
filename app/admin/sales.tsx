import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

type DayStatus = 'attended' | 'pending' | 'none';

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  status: DayStatus;
  attendance: Attendance | null;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getAttendanceStatus = (
  status: string | null,
): DayStatus => {
  if (!status) {
    return 'none';
  }

  const normalized = status.toLowerCase();

  if (
    normalized === 'approved' ||
    normalized === 'attended' ||
    normalized === 'present'
  ) {
    return 'attended';
  }

  if (normalized === 'pending') {
    return 'pending';
  }

  /*
   * Rejected/absent attendance is treated as no attendance
   * for the calendar visualization.
   */
  return 'none';
};

export default function AdminSalesCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setError('Sales user ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [salesResult, attendanceResult] =
        await Promise.all([
          supabase
            .from('sales')
            .select('id, name, email')
            .eq('id', id)
            .single(),

          supabase
            .from('attendance')
            .select(
              'sales_id, status, created_at, server_created_at',
            )
            .eq('sales_id', id)
            .order('server_created_at', {
              ascending: false,
            }),
        ]);

      if (salesResult.error) {
        throw salesResult.error;
      }

      if (attendanceResult.error) {
        throw attendanceResult.error;
      }

      setSalesUser(salesResult.data);
      setAttendance(attendanceResult.data ?? []);
    } catch (err) {
      console.error(
        'Failed to fetch salesperson attendance:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load attendance data.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Attendance>();

    for (const record of attendance) {
      const timestamp =
        record.server_created_at ?? record.created_at;

      if (!timestamp) {
        continue;
      }

      const date = new Date(timestamp);

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const key = formatDateKey(date);

      /*
       * Attendance is ordered newest first, so only the
       * first record for a date is kept.
       */
      if (!map.has(key)) {
        map.set(key, record);
      }
    }

    return map;
  }, [attendance]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(
      year,
      monthIndex + 1,
      0,
    ).getDate();

    const days: (CalendarDay | null)[] = [];

    /*
     * Empty cells before the first day of the month.
     */
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateKey = formatDateKey(date);
      const record = attendanceByDate.get(dateKey);

      days.push({
        date,
        dateKey,
        dayNumber: day,
        status: record
          ? getAttendanceStatus(record.status)
          : 'none',
        attendance: record ?? null,
      });
    }

    return days;
  }, [month, attendanceByDate]);

  const goToPreviousMonth = () => {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() - 1,
        1,
      ),
    );
  };

  const goToNextMonth = () => {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1,
      ),
    );
  };

  const handleDayPress = (day: CalendarDay) => {
    if (!day.attendance) {
      return;
    }

    const timestamp =
      day.attendance.server_created_at ??
      day.attendance.created_at;

    if (!timestamp) {
      return;
    }

    const date = new Date(timestamp);

    alert(
      `${date.toLocaleDateString()}\n\nStatus: ${
        day.attendance.status || 'Unknown'
      }\nTime: ${date.toLocaleTimeString()}`,
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading attendance...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load attendance
        </Text>

        <Text style={styles.errorText}>{error}</Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        style={styles.backLink}
        onPress={() => router.back()}
      >
        <Text style={styles.backLinkText}>← Back to Sales</Text>
      </Pressable>

      <View style={styles.profile}>
        <Text style={styles.name}>
          {salesUser?.name || 'Unnamed Sales User'}
        </Text>

        <Text style={styles.email}>
          {salesUser?.email || 'No email'}
        </Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, styles.attended]}
          />
          <Text style={styles.legendText}>Attended</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, styles.pending]}
          />
          <Text style={styles.legendText}>Pending</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, styles.noAttendance]}
          />
          <Text style={styles.legendText}>
            No attendance
          </Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable
            style={styles.monthButton}
            onPress={goToPreviousMonth}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month.getMonth()]}{' '}
            {month.getFullYear()}
          </Text>

          <Pressable
            style={styles.monthButton}
            onPress={goToNextMonth}
          >
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekHeader}>
          {WEEK_DAYS.map((day) => (
            <View
              key={day}
              style={styles.weekDay}
            >
              <Text style={styles.weekDayText}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <View
                  key={`empty-${index}`}
                  style={styles.dayCell}
                />
              );
            }

            const statusStyle =
              day.status === 'attended'
                ? styles.attended
                : day.status === 'pending'
                  ? styles.pending
                  : styles.noAttendance;

            return (
              <Pressable
                key={day.dateKey}
                style={styles.dayCell}
                onPress={() => handleDayPress(day)}
              >
                <View
                  style={[
                    styles.dayBox,
                    statusStyle,
                  ]}
                >
                  <Text style={styles.dayNumber}>
                    {day.dayNumber}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          Attendance Summary
        </Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Total attendance records
          </Text>

          <Text style={styles.summaryValue}>
            {attendance.length}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Attended days
          </Text>

          <Text style={styles.summaryValue}>
            {
              Array.from(attendanceByDate.values()).filter(
                (item) =>
                  getAttendanceStatus(item.status) ===
                  'attended',
              ).length
            }
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Pending days
          </Text>

          <Text style={styles.summaryValue}>
            {
              Array.from(attendanceByDate.values()).filter(
                (item) =>
                  getAttendanceStatus(item.status) ===
                  'pending',
              ).length
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#666666',
  },

  backLink: {
    marginBottom: 18,
  },

  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },

  profile: {
    marginBottom: 20,
  },

  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
  },

  email: {
    marginTop: 5,
    fontSize: 15,
    color: '#666666',
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },

  legendText: {
    fontSize: 13,
    color: '#444444',
  },

  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },

  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  monthButtonText: {
    fontSize: 28,
    lineHeight: 30,
    color: '#111111',
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  weekDay: {
    width: '14.2857%',
    alignItems: 'center',
  },

  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
  },

  dayBox: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },

  attended: {
    backgroundColor: '#bbf7d0',
  },

  pending: {
    backgroundColor: '#fde68a',
  },

  noAttendance: {
    backgroundColor: '#fecaca',
  },

  summary: {
    marginTop: 20,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  summaryTitle: {
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
  },

  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7f1d1d',
  },

  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111111',
  },

  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});