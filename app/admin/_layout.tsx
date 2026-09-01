import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontWeight: '700',
        },

        headerBackTitle: 'Back',

        headerTintColor: '#111827',

        headerStyle: {
          backgroundColor: '#ffffff',
        },

        headerShadowVisible: false,
      }}
    >
      {/* =====================================================
       * ADMIN DASHBOARD
       * ===================================================== */}

      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
        }}
      />

      {/* =====================================================
       * ATTENDANCE
       * ===================================================== */}

      <Stack.Screen
        name="attendance"
        options={{
          title: 'Attendance',
        }}
      />

      {/* =====================================================
       * SALES ROUTES
       * ===================================================== */}

      <Stack.Screen
        name="routes"
        options={{
          title: 'Sales Routes',
        }}
      />

      {/* =====================================================
       * EVENTS
       * ===================================================== */}

      <Stack.Screen
        name="events/index"
        options={{
          title: 'Events',
        }}
      />

      <Stack.Screen
        name="events/[id]"
        options={{
          title: 'Event Details',
        }}
      />

      {/* =====================================================
       * STORES
       * ===================================================== */}

      <Stack.Screen
        name="stores"
        options={{
          title: 'Stores',
        }}
      />

      {/* =====================================================
       * SALES TEAM
       * ===================================================== */}

      <Stack.Screen
        name="sales"
        options={{
          title: 'Sales Team',
        }}
      />

      <Stack.Screen
        name="sales/[id]"
        options={{
          title: 'Sales Profile',
        }}
      />

      {/* =====================================================
       * REWARDS
       * ===================================================== */}

      <Stack.Screen
        name="rewards"
        options={{
          title: 'Rewards',
        }}
      />
    </Stack>
  );
}