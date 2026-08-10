import Constants from 'expo-constants';

type EnvExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getExtra(): EnvExtra {
  return (
    Constants.expoConfig?.extra ??
    (Constants as { manifest2?: { extra?: EnvExtra } }).manifest2?.extra ??
    (Constants as { manifest?: { extra?: EnvExtra } }).manifest?.extra ??
    {}
  ) as EnvExtra;
}

// Static access required — Metro inlines EXPO_PUBLIC_* from .env at bundle time
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const extra = getExtra();

const supabaseUrl = envUrl || extra.supabaseUrl || '';
const supabaseAnonKey = envKey || extra.supabaseAnonKey || '';

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;

if (__DEV__ && !config.isSupabaseConfigured) {
  console.warn(
    '[config] Supabase credentials missing. Check .env and restart with: npx expo start -c'
  );
}
