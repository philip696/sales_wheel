import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="spins" options={{ title: 'Spins' }} />
      <Stack.Screen name="stores" options={{ title: 'Stores' }} />
      <Stack.Screen name="sales" options={{ title: 'Sales' }} />
      <Stack.Screen name="rewards" options={{ title: 'Rewards' }} />
    </Stack>
  );
}
