import { config } from '@/src/lib/config';
import { supabase } from '@/src/lib/supabase';
import { logAuditEvent } from '@/src/services/auditService';
import { registerDevice } from '@/src/services/deviceService';
import type { Sales } from '@/src/types';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type PasswordAuthResponse = {
  access_token: string;
  refresh_token: string;
};

type SignUpParams = {
  username: string;
  email: string;
  password: string;
  name?: string;
  salesCode?: string;
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Sales | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

async function fetchSalesProfile(userId: string): Promise<Sales | null> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function signInWithPasswordFallback(email: string, password: string) {
  const response = await fetch(`${config.supabase.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: config.supabase.anonKey,
      Authorization: `Bearer ${config.supabase.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const payload = (await response.json()) as PasswordAuthResponse & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Login failed');
  }

  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Sales | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const salesProfile = await fetchSalesProfile(session.user.id);
    setProfile(salesProfile);
  }, [session?.user]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) {
        return;
      }
      setSession(currentSession);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    refreshProfile()
      .then(() => registerDevice())
      .catch((error) => {
        console.warn('Failed to load profile:', error);
      });
  }, [session?.user, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    const authResponse = await signInWithPasswordFallback(trimmedEmail, password);

    const { data, error } = await supabase.auth.setSession({
      access_token: authResponse.access_token,
      refresh_token: authResponse.refresh_token,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? 'Failed to create session');
    }

    await logAuditEvent({ action: 'LOGIN' });
    await registerDevice();
  }, []);

  // signUp only creates the account (auth.users + public.sales rows via the
  // signup_sales_user RPC). It does NOT sign the user in — the app takes
  // them back to the login screen afterward so they sign in explicitly.
  const signUp = useCallback(
    async ({ username, email, password, name, salesCode }: SignUpParams) => {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();

      const { error: rpcError } = await supabase.rpc('signup_sales_user', {
        p_username: trimmedUsername,
        p_email: trimmedEmail,
        p_password: password,
        p_name: name?.trim() || null,
        p_sales_code: salesCode?.trim() || null,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setProfile(null);
    router.replace('/auth/login');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, isLoading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}