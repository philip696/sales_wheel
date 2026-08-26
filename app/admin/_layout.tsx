import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="routes" options={{ title: 'Sales Routes' }} />
      <Stack.Screen name="spins/index" options={{ title: 'Spin Activity' }} />
      <Stack.Screen name="spins/[storeId]" options={{ title: 'Store Spin History' }} />
      <Stack.Screen name="stores" options={{ title: 'Stores' }} />
      <Stack.Screen name="sales" options={{ title: 'Sales Team' }} />
      <Stack.Screen name="rewards" options={{ title: 'Rewards' }} />
    </Stack>
  );
}