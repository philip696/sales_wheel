import type { Database } from '@/src/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://cwvvjlnufkvcminnoxfo.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dnZqbG51Zmt2Y21pbm5veGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDUzNDUsImV4cCI6MjEwMTkyMTM0NX0.ld5F5UhjAQs7HSe_MZ7GzcOYoju6VtiGNC_PW5ZF4fU';

const supabaseFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);

  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseAnonKey);
  }

  return globalThis.fetch(input, {
    ...init,
    headers,
  });
};

const authStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: supabaseFetch,
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});
