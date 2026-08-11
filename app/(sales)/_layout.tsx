import { Stack } from 'expo-router';

export default function SalesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Home' }}
      />

      <Stack.Screen
        name="stores"
        options={{ title: 'Select Store' }}
      />

      <Stack.Screen
        name="attendance/index"
        options={{ title: 'Attendance' }}
      />

      <Stack.Screen
        name="attendance/camera"
        options={{
          title: 'Take Photo',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="attendance/preview"
        options={{ title: 'Preview' }}
      />

      <Stack.Screen
        name="attendance/result"
        options={{ title: 'Result' }}
      />

      <Stack.Screen
        name="spin/index"
        options={{ title: 'Spin Wheel' }}
      />

      <Stack.Screen
        name="spin/result"
        options={{ title: 'Reward' }}
      />

      <Stack.Screen
        name="history"
        options={{ title: 'History' }}
      />
    </Stack>
  );
}