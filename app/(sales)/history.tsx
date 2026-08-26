import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';

/* ============================================================
 * FRONTEND DEMO MODE
 * ============================================================ */
const DEMO_MODE = true;

const TODAY = '2026-08-26';
const WEEK_DATES = [
  '2026-08-20',
  '2026-08-21',
  '2026-08-22',
  '2026-08-23',
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
];

type Filter = 'today' | 'week' | 'month';
type Visit = {
  id: string;
  date: string;
  time: string;
  storeName: string;
  orderPlaced: boolean;
  durationMinutes: number;
  distanceFromPreviousKm: number;
};

type RoutePoint = {
  id: string;
  label: string;
  time: string;
  type: 'start' | 'store' | 'long' | 'end';
  durationMinutes?: number;
};

/* ============================================================
 * DEMO DATA
 * ============================================================ */
const DEMO_VISITS: Visit[] = [
  // 20 Aug
  { id: '20-1', date: '2026-08-20', time: '08:18', storeName: 'Mitra Dagang', orderPlaced: true, durationMinutes: 34, distanceFromPreviousKm: 0 },
  { id: '20-2', date: '2026-08-20', time: '09:11', storeName: 'Kencana Store', orderPlaced: false, durationMinutes: 32, distanceFromPreviousKm: 3.9 },
  { id: '20-3', date: '2026-08-20', time: '10:05', storeName: 'Toko Nusantara', orderPlaced: true, durationMinutes: 40, distanceFromPreviousKm: 4.2 },
  { id: '20-4', date: '2026-08-20', time: '11:14', storeName: 'Mega Jaya', orderPlaced: true, durationMinutes: 37, distanceFromPreviousKm: 4.7 },

  // 21 Aug
  { id: '21-1', date: '2026-08-21', time: '08:12', storeName: 'Sukses Makmur', orderPlaced: true, durationMinutes: 36, distanceFromPreviousKm: 0 },
  { id: '21-2', date: '2026-08-21', time: '09:07', storeName: 'Sentosa Jaya', orderPlaced: false, durationMinutes: 29, distanceFromPreviousKm: 4.5 },
  { id: '21-3', date: '2026-08-21', time: '10:02', storeName: 'Bintang Store', orderPlaced: true, durationMinutes: 45, distanceFromPreviousKm: 4.0 },

  // 22 Aug
  { id: '22-1', date: '2026-08-22', time: '08:09', storeName: 'Barokah Stationery', orderPlaced: true, durationMinutes: 42, distanceFromPreviousKm: 0 },
  { id: '22-2', date: '2026-08-22', time: '09:16', storeName: 'Toko Harmoni', orderPlaced: true, durationMinutes: 38, distanceFromPreviousKm: 4.1 },
  { id: '22-3', date: '2026-08-22', time: '10:11', storeName: 'Sinar Jaya', orderPlaced: false, durationMinutes: 33, distanceFromPreviousKm: 4.5 },

  // 23 Aug
  { id: '23-1', date: '2026-08-23', time: '08:15', storeName: 'Maju Lancar', orderPlaced: true, durationMinutes: 39, distanceFromPreviousKm: 0 },
  { id: '23-2', date: '2026-08-23', time: '09:12', storeName: 'Toko Sejahtera', orderPlaced: false, durationMinutes: 31, distanceFromPreviousKm: 3.8 },
  { id: '23-3', date: '2026-08-23', time: '10:04', storeName: 'Usaha Mandiri', orderPlaced: true, durationMinutes: 44, distanceFromPreviousKm: 3.6 },
  { id: '23-4', date: '2026-08-23', time: '11:05', storeName: 'Surabaya Mart', orderPlaced: true, durationMinutes: 37, distanceFromPreviousKm: 4.1 },

  // 24 Aug
  { id: '24-1', date: '2026-08-24', time: '08:06', storeName: 'Jaya Abadi', orderPlaced: true, durationMinutes: 40, distanceFromPreviousKm: 0 },
  { id: '24-2', date: '2026-08-24', time: '09:14', storeName: 'Sinar Baru', orderPlaced: false, durationMinutes: 34, distanceFromPreviousKm: 3.1 },
  { id: '24-3', date: '2026-08-24', time: '10:03', storeName: 'Cahaya Mart', orderPlaced: true, durationMinutes: 43, distanceFromPreviousKm: 4.4 },
  { id: '24-4', date: '2026-08-24', time: '11:01', storeName: 'Mitra Dagang', orderPlaced: true, durationMinutes: 38, distanceFromPreviousKm: 3.7 },
  { id: '24-5', date: '2026-08-24', time: '13:11', storeName: 'Kota Stationery', orderPlaced: false, durationMinutes: 31, distanceFromPreviousKm: 4.3 },

  // 25 Aug
  { id: '25-1', date: '2026-08-25', time: '08:11', storeName: 'Prima Stationery', orderPlaced: true, durationMinutes: 35, distanceFromPreviousKm: 0 },
  { id: '25-2', date: '2026-08-25', time: '09:02', storeName: 'Mitra Usaha', orderPlaced: true, durationMinutes: 42, distanceFromPreviousKm: 4.1 },
  { id: '25-3', date: '2026-08-25', time: '10:03', storeName: 'Karya Jaya', orderPlaced: false, durationMinutes: 29, distanceFromPreviousKm: 2.8 },
  { id: '25-4', date: '2026-08-25', time: '11:18', storeName: 'Berkah Mart', orderPlaced: true, durationMinutes: 46, distanceFromPreviousKm: 4.2 },
  { id: '25-5', date: '2026-08-25', time: '13:17', storeName: 'Anugerah Store', orderPlaced: false, durationMinutes: 37, distanceFromPreviousKm: 3.3 },
  { id: '25-6', date: '2026-08-25', time: '14:10', storeName: 'Jaya Mandiri', orderPlaced: true, durationMinutes: 44, distanceFromPreviousKm: 3.8 },

  // 26 Aug
  { id: '26-1', date: '2026-08-26', time: '08:32', storeName: 'Big Stationary - Central', orderPlaced: true, durationMinutes: 32, distanceFromPreviousKm: 0 },
  { id: '26-2', date: '2026-08-26', time: '09:21', storeName: 'Toko Makmur', orderPlaced: true, durationMinutes: 41, distanceFromPreviousKm: 2.8 },
  { id: '26-3', date: '2026-08-26', time: '10:00', storeName: 'Sumber Rejeki', orderPlaced: false, durationMinutes: 28, distanceFromPreviousKm: 3.4 },
  { id: '26-4', date: '2026-08-26', time: '10:04', storeName: 'Kopi Tengah Kota', orderPlaced: false, durationMinutes: 168, distanceFromPreviousKm: 2.1 },
  { id: '26-5', date: '2026-08-26', time: '13:02', storeName: 'Maju Jaya', orderPlaced: true, durationMinutes: 36, distanceFromPreviousKm: 3.8 },
  { id: '26-6', date: '2026-08-26', time: '13:47', storeName: 'Harapan Baru', orderPlaced: false, durationMinutes: 33, distanceFromPreviousKm: 2.6 },
  { id: '26-7', date: '2026-08-26', time: '14:29', storeName: 'Sentosa Mart', orderPlaced: true, durationMinutes: 48, distanceFromPreviousKm: 3.1 },
  { id: '26-8', date: '2026-08-26', time: '15:24', storeName: 'Surya Store', orderPlaced: false, durationMinutes: 31, distanceFromPreviousKm: 2.9 },
];

function dateObj(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDate(date: string) {
  return dateObj(date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function dayName(date: string) {
  return dateObj(date).toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

function monthName(date: string) {
  return dateObj(date).toLocaleDateString('en-US', {
    month: 'short',
  });
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function visitsForDate(date: string) {
  return DEMO_VISITS.filter((v) => v.date === date);
}

function totalDistance(records: Visit[]) {
  return records.reduce((sum, v) => sum + v.distanceFromPreviousKm, 0);
}

function routeForDate(date: string): RoutePoint[] {
  const records = visitsForDate(date);
  const route: RoutePoint[] = [
    {
      id: `${date}-start`,
      label: 'Start Shift',
      time: '08:00',
      type: 'start',
    },
  ];

  records.forEach((record) => {
    route.push({
      id: `${date}-${record.id}`,
      label: record.storeName,
      time: record.time,
      type: record.durationMinutes >= 90 ? 'long' : 'store',
      durationMinutes: record.durationMinutes,
    });
  });

  route.push({
    id: `${date}-end`,
    label: 'End Shift',
    time: date === TODAY ? '17:02' : '17:05',
    type: 'end',
  });

  return route;
}

function FilterButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterButton, active && styles.filterButtonActive]}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Metric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function WeekDaySelector({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  return (
    <View style={styles.weekCard}>
      <Text style={styles.overline}>SELECT A DAY TO VIEW THE ROUTE</Text>

      <View style={styles.weekGrid}>
        {WEEK_DATES.map((date) => {
          const selected = date === selectedDate;
          const records = visitsForDate(date);
          const orders = records.filter((v) => v.orderPlaced).length;

          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
            >
              <Text style={[styles.dayName, selected && styles.dayNameSelected]}>
                {dayName(date)}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                {dateObj(date).getDate()}
              </Text>
              <Text style={[styles.dayMonth, selected && styles.dayMonthSelected]}>
                {monthName(date)}
              </Text>
              <View style={[styles.dayMeta, selected && styles.dayMetaSelected]}>
                <Text style={[styles.dayMetaText, selected && styles.dayMetaTextSelected]}>
                  {records.length} visits
                </Text>
                <Text style={[styles.dayOrderText, selected && styles.dayOrderTextSelected]}>
                  {orders} orders
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RouteTimeline({ date }: { date: string }) {
  const route = routeForDate(date);
  const records = visitsForDate(date);
  const longStay = records.find((v) => v.durationMinutes >= 90);

  return (
    <View style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <View>
          <Text style={styles.overlineBlue}>DAILY ROUTE</Text>
          <Text style={styles.routeTitle}>{formatDate(date)}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>{totalDistance(records).toFixed(1)} KM</Text>
        </View>
      </View>

      {route.map((point, index) => {
        const last = index === route.length - 1;
        const long = point.type === 'long';
        const edge = point.type === 'start' || point.type === 'end';

        return (
          <View key={point.id} style={styles.routeItem}>
            <View style={styles.routeRail}>
              <View
                style={[
                  styles.routeDot,
                  edge && styles.routeDotEdge,
                  long && styles.routeDotLong,
                ]}
              />
              {!last ? <View style={styles.routeLine} /> : null}
            </View>

            <View style={styles.routeBody}>
              <View style={styles.routeRow}>
                <View style={styles.routeNameWrap}>
                  <Text style={styles.routeName}>{point.label}</Text>
                  {long ? (
                    <View style={styles.longBadge}>
                      <Text style={styles.longBadgeText}>LONG STAY</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.routeTime}>{point.time}</Text>
              </View>

              {point.durationMinutes ? (
                <Text style={styles.routeDuration}>
                  Stayed {duration(point.durationMinutes)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {longStay ? (
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Text style={styles.insightEmoji}>☕</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Long stay detected</Text>
            <Text style={styles.insightText}>
              {longStay.storeName} • {duration(longStay.durationMinutes)}
            </Text>
            <Text style={styles.insightSubtext}>
              Demo: production tracking will calculate this from GPS pings every 2–3 minutes.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function VisitCard({ record }: { record: Visit }) {
  return (
    <View style={styles.visitCard}>
      <View style={styles.visitHeader}>
        <View style={styles.storeRow}>
          <View style={styles.storeIcon}>
            <Text style={styles.storeEmoji}>🏪</Text>
          </View>
          <View style={styles.storeContent}>
            <Text style={styles.storeName} numberOfLines={1}>
              {record.storeName}
            </Text>
            <Text style={styles.storeTime}>
              {formatDate(record.date)} • {record.time}
            </Text>
          </View>
        </View>

        <View style={[styles.orderBadge, record.orderPlaced ? styles.orderYes : styles.orderNo]}>
          <Text style={[styles.orderBadgeText, record.orderPlaced ? styles.orderYesText : styles.orderNoText]}>
            {record.orderPlaced ? 'ORDER' : 'NO ORDER'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.visitStats}>
        <View style={styles.visitStat}>
          <Text style={styles.visitStatLabel}>DURATION</Text>
          <Text style={styles.visitStatValue}>{duration(record.durationMinutes)}</Text>
        </View>
        <View style={styles.visitStat}>
          <Text style={styles.visitStatLabel}>FROM PREVIOUS</Text>
          <Text style={styles.visitStatValue}>{record.distanceFromPreviousKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.visitStat}>
          <Text style={styles.visitStatLabel}>LOCATION</Text>
          <Text style={styles.visitStatValue}>Verified</Text>
        </View>
      </View>

      <View style={[styles.visitFooter, record.orderPlaced ? styles.visitFooterYes : styles.visitFooterNo]}>
        <Text style={[styles.visitFooterText, record.orderPlaced ? styles.visitFooterTextYes : styles.visitFooterTextNo]}>
          {record.orderPlaced ? '✓ Order recorded during this visit' : '— No order recorded'}
        </Text>
      </View>
    </View>
  );
}

function MonthRows() {
  const groups = new Map<string, Visit[]>();

  DEMO_VISITS.forEach((visit) => {
    groups.set(visit.date, [...(groups.get(visit.date) ?? []), visit]);
  });

  const dates = Array.from(groups.keys()).sort(
    (a, b) => dateObj(b).getTime() - dateObj(a).getTime(),
  );

  return (
    <View style={styles.monthCard}>
      <View style={styles.routeHeader}>
        <View>
          <Text style={styles.overlinePurple}>LAST 30 DAYS</Text>
          <Text style={styles.routeTitle}>Daily activity</Text>
        </View>
        <Text style={styles.monthDays}>{dates.length} days</Text>
      </View>

      {dates.map((date) => {
        const visits = groups.get(date) ?? [];
        const orders = visits.filter((v) => v.orderPlaced).length;

        return (
          <View key={date} style={styles.monthRow}>
            <View style={styles.monthDateCol}>
              <Text style={styles.monthDay}>{dayName(date)}</Text>
              <Text style={styles.monthDate}>{dateObj(date).getDate()} {monthName(date)}</Text>
            </View>
            <View style={styles.monthMiddle}>
              <Text style={styles.monthTitle}>{visits.length} visits</Text>
              <Text style={styles.monthSub}>{orders} orders • {totalDistance(visits).toFixed(1)} km</Text>
            </View>
            <Text style={styles.monthArrow}>→</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function SalesHistoryScreen() {
  const [filter, setFilter] = useState<Filter>('today');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [refreshing, setRefreshing] = useState(false);

  const weekRecords = useMemo(
    () => DEMO_VISITS.filter((v) => WEEK_DATES.includes(v.date)),
    [],
  );

  const todayRecords = useMemo(() => visitsForDate(TODAY), []);
  const selectedRecords = useMemo(() => visitsForDate(selectedDate), [selectedDate]);

  const recordsForFilter =
    filter === 'today'
      ? todayRecords
      : filter === 'week'
        ? weekRecords
        : DEMO_VISITS;

  const orders = recordsForFilter.filter((v) => v.orderPlaced).length;
  const stores = new Set(recordsForFilter.map((v) => v.storeName)).size;
  const visits = recordsForFilter.length;
  const distance = totalDistance(recordsForFilter);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ScreenContainer
      title="Activity History"
      subtitle="Visits, orders and daily route"
      scroll={false}
    >
      <FlatList
        data={filter === 'week' ? selectedRecords : filter === 'today' ? todayRecords : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.filterCard}>
              <Text style={styles.overline}>PERIOD</Text>
              <View style={styles.filterRow}>
                <FilterButton
                  title="TODAY"
                  active={filter === 'today'}
                  onPress={() => {
                    setFilter('today');
                    setSelectedDate(TODAY);
                  }}
                />
                <FilterButton
                  title="1 WEEK"
                  active={filter === 'week'}
                  onPress={() => {
                    setFilter('week');
                    if (!WEEK_DATES.includes(selectedDate)) setSelectedDate(TODAY);
                  }}
                />
                <FilterButton
                  title="1 MONTH"
                  active={filter === 'month'}
                  onPress={() => setFilter('month')}
                />
              </View>
            </View>

            <Text style={styles.overline}>{filter === 'today' ? 'TODAY' : filter === 'week' ? 'THIS WEEK' : 'LAST 30 DAYS'}</Text>

            <View style={styles.summaryGrid}>
              <Metric value={orders} label="ORDERS" />
              <Metric value={stores} label="STORES VISITED" />
              <Metric value={visits} label="VISITS" />
              <Metric value={filter === 'week' || filter === 'month' ? `${distance.toFixed(1)} km` : `${distance.toFixed(1)} km`} label="DISTANCE" />
            </View>

            {filter === 'week' ? (
              <>
                <WeekDaySelector selectedDate={selectedDate} onSelect={setSelectedDate} />
                <View style={styles.selectedHeader}>
                  <View>
                    <Text style={styles.overlineBlue}>SELECTED DAY</Text>
                    <Text style={styles.selectedTitle}>{formatDate(selectedDate)}</Text>
                  </View>
                  <Text style={styles.selectedCount}>{selectedRecords.length} visits</Text>
                </View>
                <RouteTimeline date={selectedDate} />
              </>
            ) : null}

            {filter === 'today' ? (
              <>
                <View style={styles.selectedHeader}>
                  <View>
                    <Text style={styles.overlineBlue}>TODAY'S ROUTE</Text>
                    <Text style={styles.selectedTitle}>Sales movement</Text>
                  </View>
                  <Text style={styles.selectedCount}>{todayRecords.length} visits</Text>
                </View>
                <RouteTimeline date={TODAY} />
              </>
            ) : null}

            {filter === 'month' ? (
              <>
                <MonthRows />
                <Text style={styles.monthHint}>
                  Use 1 WEEK to press a specific day and inspect its complete route.
                </Text>
              </>
            ) : null}

            {filter !== 'month' ? (
              <Text style={styles.listHeading}>VISITS</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => <VisitCard record={item} />}
        ListEmptyComponent={
          filter === 'month' ? null : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No visits</Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 32 },

  filterCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
  },
  filterRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  filterButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterButtonText: { fontSize: 8.5, fontWeight: '900', color: '#64748b' },
  filterButtonTextActive: { color: '#ffffff' },

  overline: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.2,
  },
  overlineBlue: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  overlinePurple: {
    fontSize: 8,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
    marginBottom: 19,
  },
  metric: {
    width: '48%',
    flexGrow: 1,
    minHeight: 78,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 4 },
  metricLabel: { fontSize: 7.5, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.6 },

  weekCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
  },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  dayButton: {
    width: '31%',
    minHeight: 93,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 9,
  },
  dayButtonSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  dayName: { fontSize: 8, fontWeight: '900', color: '#64748b' },
  dayNameSelected: { color: '#93c5fd' },
  dayNumber: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 2 },
  dayNumberSelected: { color: '#ffffff' },
  dayMonth: { fontSize: 7.5, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  dayMonthSelected: { color: '#64748b' },
  dayMeta: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 7, paddingTop: 5 },
  dayMetaSelected: { borderTopColor: '#263244' },
  dayMetaText: { fontSize: 7.5, fontWeight: '800', color: '#475569' },
  dayMetaTextSelected: { color: '#dbeafe' },
  dayOrderText: { fontSize: 7.5, fontWeight: '800', color: '#16a34a', marginTop: 2 },
  dayOrderTextSelected: { color: '#86efac' },

  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 9,
  },
  selectedTitle: { fontSize: 17, fontWeight: '900', color: '#111827' },
  selectedCount: { fontSize: 8, fontWeight: '800', color: '#64748b' },

  routeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 17,
    marginBottom: 20,
  },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 },
  routeTitle: { fontSize: 17, fontWeight: '900', color: '#111827' },
  distanceBadge: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  distanceBadgeText: { fontSize: 7.5, fontWeight: '900', color: '#2563eb' },
  routeItem: { flexDirection: 'row', minHeight: 56 },
  routeRail: { width: 24, alignItems: 'center' },
  routeDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2563eb', marginTop: 4, zIndex: 2 },
  routeDotEdge: { backgroundColor: '#111827' },
  routeDotLong: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#fef3c7' },
  routeLine: { position: 'absolute', top: 14, bottom: -4, width: 2, backgroundColor: '#dbeafe' },
  routeBody: { flex: 1, paddingLeft: 8, paddingBottom: 13 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeNameWrap: { flex: 1, paddingRight: 8 },
  routeName: { fontSize: 11, fontWeight: '800', color: '#1e293b' },
  routeTime: { fontSize: 10, fontWeight: '900', color: '#64748b' },
  routeDuration: { fontSize: 8.5, color: '#94a3b8', marginTop: 3 },
  longBadge: { alignSelf: 'flex-start', backgroundColor: '#fffbeb', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3, marginTop: 4 },
  longBadgeText: { fontSize: 6.5, fontWeight: '900', color: '#b45309' },
  insightCard: { flexDirection: 'row', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 13, padding: 10, marginTop: 5 },
  insightIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  insightEmoji: { fontSize: 17 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 10, fontWeight: '900', color: '#92400e', marginBottom: 2 },
  insightText: { fontSize: 8.5, fontWeight: '800', color: '#a16207', marginBottom: 3 },
  insightSubtext: { fontSize: 7.5, lineHeight: 11, color: '#a16207' },

  listHeading: { fontSize: 8.5, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 8 },
  visitCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 15, marginBottom: 10 },
  visitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storeRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  storeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  storeEmoji: { fontSize: 18 },
  storeContent: { flex: 1 },
  storeName: { fontSize: 12, fontWeight: '900', color: '#111827', marginBottom: 3 },
  storeTime: { fontSize: 8.5, color: '#94a3b8' },
  orderBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  orderYes: { backgroundColor: '#dcfce7' },
  orderNo: { backgroundColor: '#f1f5f9' },
  orderBadgeText: { fontSize: 7, fontWeight: '900' },
  orderYesText: { color: '#15803d' },
  orderNoText: { color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 13 },
  visitStats: { flexDirection: 'row', gap: 8 },
  visitStat: { flex: 1 },
  visitStatLabel: { fontSize: 6.5, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 4 },
  visitStatValue: { fontSize: 9.5, fontWeight: '800', color: '#334155' },
  visitFooter: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  visitFooterYes: { backgroundColor: '#f0fdf4' },
  visitFooterNo: { backgroundColor: '#f8fafc' },
  visitFooterText: { fontSize: 8, fontWeight: '700' },
  visitFooterTextYes: { color: '#15803d' },
  visitFooterTextNo: { color: '#64748b' },

  monthCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 16, marginBottom: 12 },
  monthDays: { fontSize: 8, fontWeight: '800', color: '#64748b' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  monthDateCol: { width: 76 },
  monthDay: { fontSize: 8, fontWeight: '900', color: '#475569' },
  monthDate: { fontSize: 8, color: '#94a3b8', marginTop: 2 },
  monthMiddle: { flex: 1 },
  monthTitle: { fontSize: 10, fontWeight: '900', color: '#1e293b' },
  monthSub: { fontSize: 8, color: '#94a3b8', marginTop: 3 },
  monthArrow: { fontSize: 17, fontWeight: '800', color: '#cbd5e1', marginLeft: 8 },
  monthHint: { fontSize: 9, lineHeight: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },

  emptyCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 25, alignItems: 'center' },
  emptyEmoji: { fontSize: 30, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '900', color: '#334155' },
});