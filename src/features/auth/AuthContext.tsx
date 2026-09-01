// src/features/auth/AuthContext.tsx

import { config } from '@/src/lib/config';
import { supabase } from '@/src/lib/supabase';
import { logAuditEvent } from '@/src/services/auditService';
import { registerDevice } from '@/src/services/deviceService';

import type { Sales } from '@/src/types';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import { router } from 'expo-router';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

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

  signIn: (
    email: string,
    password: string
  ) => Promise<void>;

  signUp: (
    params: SignUpParams
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
}

/*
 * ============================================================
 * CONTEXT
 * ============================================================
 */

export const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

/*
 * ============================================================
 * FETCH SALES PROFILE
 * ============================================================
 */

async function fetchSalesProfile(
  userId: string
): Promise<Sales | null> {
  const {
    data,
    error,
  } = await supabase
    .from('sales')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

/*
 * ============================================================
 * PASSWORD LOGIN FALLBACK
 * ============================================================
 *
 * Direct Supabase Auth REST call.
 *
 * This is kept because your current authentication flow
 * already uses it.
 * ============================================================
 */

async function signInWithPasswordFallback(
  email: string,
  password: string
): Promise<PasswordAuthResponse> {
  const response =
    await fetch(
      `${config.supabase.url}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',

        headers: {
          apikey:
            config.supabase.anonKey,

          Authorization:
            `Bearer ${config.supabase.anonKey}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  let payload:
    | (
        PasswordAuthResponse & {
          message?: string;
          error?: string;
          error_description?: string;
          msg?: string;
        }
      )
    | null =
    null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    /*
     * Try to preserve the actual Supabase error message.
     *
     * This allows the Login screen to show useful errors
     * such as invalid credentials or email not confirmed.
     */

    throw new Error(
      payload?.message ??
        payload?.error_description ??
        payload?.msg ??
        payload?.error ??
        `Login failed (${response.status})`
    );
  }

  if (
    !payload?.access_token ||
    !payload?.refresh_token
  ) {
    throw new Error(
      'Login succeeded but no authentication session was returned.'
    );
  }

  return {
    access_token:
      payload.access_token,

    refresh_token:
      payload.refresh_token,
  };
}

/*
 * ============================================================
 * AUTH PROVIDER
 * ============================================================
 */

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Sales | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /*
   * ==========================================================
   * REFRESH PROFILE
   * ==========================================================
   */

  const refreshProfile =
    useCallback(
      async () => {
        if (
          !session?.user
        ) {
          setProfile(
            null
          );

          return;
        }

        try {
          const salesProfile =
            await fetchSalesProfile(
              session.user.id
            );

          setProfile(
            salesProfile
          );
        } catch (
          error
        ) {
          console.error(
            'FAILED TO LOAD SALES PROFILE:',
            error
          );

          setProfile(
            null
          );

          throw error;
        }
      },
      [
        session?.user,
      ]
    );

  /*
   * ==========================================================
   * INITIAL SESSION
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadInitialSession =
      async () => {
        try {
          const {
            data: {
              session:
                currentSession,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (
            !mounted
          ) {
            return;
          }

          if (error) {
            console.error(
              'GET SESSION ERROR:',
              error.message
            );

            setSession(
              null
            );

            setProfile(
              null
            );
          } else {
            setSession(
              currentSession
            );
          }
        } catch (
          error
        ) {
          console.error(
            'INITIAL AUTH ERROR:',
            error
          );

          if (
            mounted
          ) {
            setSession(
              null
            );

            setProfile(
              null
            );
          }
        }
      };

    loadInitialSession();

    /*
     * Listen for auth state changes.
     */

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setSession(
            nextSession
          );

          if (
            !nextSession
          ) {
            setProfile(
              null
            );
          }
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /*
   * ==========================================================
   * SESSION -> PROFILE
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadProfile =
      async () => {
        /*
         * ------------------------------------------------------
         * NO SESSION
         * ------------------------------------------------------
         */

        if (
          !session?.user
        ) {
          if (
            mounted
          ) {
            setProfile(
              null
            );

            setIsLoading(
              false
            );
          }

          return;
        }

        /*
         * ------------------------------------------------------
         * START PROFILE LOADING
         * ------------------------------------------------------
         */

        if (
          mounted
        ) {
          setIsLoading(
            true
          );
        }

        try {
          const salesProfile =
            await fetchSalesProfile(
              session.user.id
            );

          if (
            !mounted
          ) {
            return;
          }

          /*
           * IMPORTANT:
           *
           * Set the profile BEFORE device registration.
           *
           * Device registration must never block
           * role-based routing.
           */

          setProfile(
            salesProfile
          );

          /*
           * ----------------------------------------------------
           * DEVICE REGISTRATION
           * ----------------------------------------------------
           *
           * Best effort only.
           */

          registerDevice().catch(
            (error) => {
              console.warn(
                'DEVICE REGISTRATION WARNING:',
                error
              );
            }
          );
        } catch (
          error
        ) {
          console.error(
            'FAILED TO LOAD PROFILE:',
            error
          );

          if (
            mounted
          ) {
            setProfile(
              null
            );
          }
        } finally {
          if (
            mounted
          ) {
            setIsLoading(
              false
            );
          }
        }
      };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [
    session?.user,
  ]);

  /*
   * ==========================================================
   * SIGN IN
   * ==========================================================
   */

  const signIn =
    useCallback(
      async (
        email: string,
        password: string
      ) => {
        const trimmedEmail =
          email.trim();

        /*
         * ------------------------------------------------------
         * AUTHENTICATE
         * ------------------------------------------------------
         */

        const authResponse =
          await signInWithPasswordFallback(
            trimmedEmail,
            password
          );

        /*
         * ------------------------------------------------------
         * CREATE SUPABASE SESSION
         * ------------------------------------------------------
         */

        const {
          data,
          error,
        } =
          await supabase.auth.setSession({
            access_token:
              authResponse.access_token,

            refresh_token:
              authResponse.refresh_token,
          });

        if (
          error ||
          !data.session
        ) {
          throw new Error(
            error?.message ??
              'Failed to create session'
          );
        }

        /*
         * ------------------------------------------------------
         * AUDIT LOG
         * ------------------------------------------------------
         *
         * Best effort only.
         */

        logAuditEvent({
          action:
            'LOGIN',
        }).catch(
          () =>
            undefined
        );

        /*
         * ------------------------------------------------------
         * DEVICE REGISTRATION
         * ------------------------------------------------------
         *
         * Best effort only.
         * Never prevent login.
         */

        registerDevice().catch(
          () =>
            undefined
        );
      },
      []
    );

  /*
   * ==========================================================
   * SIGN UP
   * ==========================================================
   */

  const signUp =
    useCallback(
      async ({
        username,
        email,
        password,
        name,
        salesCode,
      }: SignUpParams) => {
        const trimmedUsername =
          username.trim();

        const trimmedEmail =
          email.trim();

        /*
         * ------------------------------------------------------
         * SIGN UP RPC
         * ------------------------------------------------------
         */

        const {
          error: rpcError,
        } =
          await supabase.rpc(
            'signup_sales_user',
            {
              p_username:
                trimmedUsername,

              p_email:
                trimmedEmail,

              p_password:
                password,

              p_name:
                name?.trim() ||
                null,

              p_sales_code:
                salesCode?.trim() ||
                null,
            }
          );

        if (
          rpcError
        ) {
          throw new Error(
            rpcError.message
          );
        }
      },
      []
    );

  /*
   * ==========================================================
   * SIGN OUT
   * ==========================================================
   *
   * IMPORTANT FIX:
   *
   * We do NOT navigate directly to:
   *
   *   /auth/login
   *
   * from the nested Sales navigator.
   *
   * Instead we navigate to the root:
   *
   *   /
   *
   * Then app/index.tsx sees that there is no user
   * and redirects to:
   *
   *   /auth/login
   *
   * This prevents:
   *
   * "The action 'REPLACE' ... was not handled by
   * any navigator."
   * ==========================================================
   */

  const signOut =
    useCallback(
      async () => {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (
          error
        ) {
          throw new Error(
            error.message
          );
        }

        /*
         * Clear local auth state immediately.
         */

        setSession(
          null
        );

        setProfile(
          null
        );

        setIsLoading(
          false
        );

        /*
         * Go to the root router.
         *
         * app/index.tsx will then redirect the
         * unauthenticated user to /auth/login.
         */

        router.replace(
          '/'
        );
      },
      []
    );

  /*
   * ==========================================================
   * CONTEXT VALUE
   * ==========================================================
   */

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,

        user:
          session?.user ??
          null,

        profile,

        isLoading,

        isAdmin:
          profile?.role ===
          'admin',

        signIn,

        signUp,

        signOut,

        refreshProfile,
      }),
      [
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      ]
    );

  /*
   * ==========================================================
   * PROVIDER
   * ==========================================================
   */

  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}