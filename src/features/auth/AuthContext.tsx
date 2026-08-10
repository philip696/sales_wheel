import { config } from '@/src/lib/config';
import { supabase } from '@/src/lib/supabase';
import { logAuditEvent } from '@/src/services/auditService';
import { registerDevice } from '@/src/services/deviceService';
import type { Sales } from '@/src/types';
import { Session, User } from '@supabase/supabase-js';
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

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Sales | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, isLoading, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
