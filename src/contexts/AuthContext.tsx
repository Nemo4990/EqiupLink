import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import {
  recordSession,
  revokeCurrentSession,
  updateSessionActivity,
  checkRateLimit,
  recordLoginAttempt,
  isNewDevice,
  sendNewDeviceNotification,
  logSecurityEvent,
  parseDeviceInfo,
} from '../lib/security';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const IDLE_WARNING_MS = 5 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL = 2 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  idleWarning: boolean;
  idleSecondsLeft: number;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: Error | null; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; profile: Profile | null; rateLimited?: boolean; remaining?: number; resetIn?: number }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetIdleTimer: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(0);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activitySyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userRef = useRef<User | null>(null);

  userRef.current = user;

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
  };

  const clearTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (activitySyncRef.current) clearInterval(activitySyncRef.current);
  };

  const doSignOut = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser) {
      await revokeCurrentSession(currentUser.id);
      await logSecurityEvent(currentUser.id, 'logout', parseDeviceInfo().deviceName);
    }
    clearTimers();
    await supabase.auth.signOut();
    setProfile(null);
    setIdleWarning(false);
    setIdleSecondsLeft(0);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!userRef.current) return;
    setIdleWarning(false);
    setIdleSecondsLeft(0);
    clearTimers();

    warningTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
      setIdleSecondsLeft(IDLE_WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        setIdleSecondsLeft(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    idleTimerRef.current = setTimeout(() => {
      doSignOut();
    }, IDLE_TIMEOUT_MS);

    activitySyncRef.current = setInterval(() => {
      const u = userRef.current;
      if (u) updateSessionActivity(u.id);
    }, ACTIVITY_SYNC_INTERVAL);
  }, [doSignOut]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      setIdleWarning(false);
      setIdleSecondsLeft(0);
      return;
    }
    resetIdleTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimers();
    };
  }, [user, resetIdleTimer]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    if (error) return { error, needsVerification: false };
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        email,
        role,
      });
      if (profileError) return { error: profileError, needsVerification: false };

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-registration-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ name, email, role }),
      }).catch(() => {});
    }
    const needsVerification = !data.session;
    return { error: null, needsVerification };
  };

  const signIn = async (email: string, password: string) => {
    const rateCheck = await checkRateLimit(email);
    if (rateCheck.blocked) {
      return {
        error: new Error('Too many failed attempts.') as Error,
        profile: null,
        rateLimited: true,
        remaining: 0,
        resetIn: rateCheck.resetIn,
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await recordLoginAttempt(email, false);
      await logSecurityEvent(null, 'login_failed', parseDeviceInfo().deviceName, { email });
      const newRateCheck = await checkRateLimit(email);
      return {
        error: error as Error,
        profile: null,
        rateLimited: false,
        remaining: newRateCheck.remaining,
        resetIn: newRateCheck.resetIn,
      };
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        error: new Error('EMAIL_NOT_VERIFIED') as Error,
        profile: null,
        rateLimited: false,
        remaining: 5,
        resetIn: 0,
      };
    }

    await recordLoginAttempt(email, true);

    let fetchedProfile: Profile | null = null;
    if (data.user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      fetchedProfile = p as Profile | null;

      const newDevice = await isNewDevice(data.user.id);
      const { deviceName } = parseDeviceInfo();

      await recordSession(data.user.id);
      await logSecurityEvent(data.user.id, newDevice ? 'new_device_login' : 'login_success', deviceName);

      if (newDevice) {
        await sendNewDeviceNotification(data.user.id, deviceName);
      }
    }

    return { error: null, profile: fetchedProfile, rateLimited: false, remaining: 5, resetIn: 0 };
  };

  const signOut = async () => {
    await doSignOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    return !error;
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, idleWarning, idleSecondsLeft,
      signUp, signIn, signOut, refreshProfile, resetIdleTimer, verifyPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
