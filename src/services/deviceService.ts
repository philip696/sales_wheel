import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

const DEVICE_ID_KEY = 'sales_spin_device_id';

async function getOrCreateDeviceIdentifier(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

export async function registerDevice(appVersion?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const deviceIdentifier = await getOrCreateDeviceIdentifier();

  const { error } = await supabase.from('devices').upsert(
    {
      sales_id: user.id,
      device_identifier: deviceIdentifier,
      platform: Platform.OS,
      app_version: appVersion ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'sales_id,device_identifier' }
  );

  if (error) {
    console.warn('Failed to register device:', error.message);
  }
}

export async function getDeviceIdentifier(): Promise<string> {
  return getOrCreateDeviceIdentifier();
}
