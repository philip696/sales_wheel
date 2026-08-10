import appJson from './app.json';
import { ExpoConfig } from 'expo/config';
import { load } from '@expo/env';

// Load variables from .env in the project root (not .env.example)
load(process.cwd());

// Static reads so Metro can inline EXPO_PUBLIC_* into the JS bundle
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[app.config] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

export default (): ExpoConfig => ({
  ...(appJson.expo as ExpoConfig),
  extra: {
    supabaseUrl,
    supabaseAnonKey,
  },
});
