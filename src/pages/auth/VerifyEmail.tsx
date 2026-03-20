import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type VerifyState = 'verifying' | 'success' | 'error';

const ROLE_REDIRECT: Record<string, string> = {
  mechanic: '/dashboard/technician',
  technician: '/dashboard/technician',
  electrician: '/dashboard/technician',
  owner: '/dashboard/owner',
  supplier: '/dashboard/supplier',
  rental_provider: '/dashboard',
  admin: '/admin',
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const customToken = searchParams.get('token');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    const verify = async () => {
      if (customToken) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const res = await fetch(
            `${supabaseUrl}/functions/v1/verify-email/confirm?token=${customToken}`,
            { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
          );

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setState('error');
            setErrorMessage(body.error ?? 'Invalid or expired verification link.');
            return;
          }

          const data = await res.json();
          setState('success');
          startRedirect(data.role);
        } catch {
          setState('error');
          setErrorMessage('Something went wrong. Please try again.');
        }
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error || !data.user) {
          setState('error');
          setErrorMessage('Invalid or expired verification link. Please sign up again.');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        setState('success');
        startRedirect(profile?.role);
        return;
      }

      if (token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email' | 'signup',
        });
        if (error || !data.user) {
          setState('error');
          setErrorMessage('Invalid or expired verification link. Please sign up again.');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        setState('success');
        startRedirect(profile?.role);
        return;
      }

      setState('error');
      setErrorMessage('Invalid verification link. Please check your email and try again.');
    };

    verify();
  }, []);

  const startRedirect = (role?: string) => {
    const dest = role ? (ROLE_REDIRECT[role] ?? '/dashboard') : '/dashboard';
    let count = 5;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        navigate(dest, { replace: true });
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6 text-gray-900" />
          </div>
          <span className="text-white font-bold text-2xl">Equip<span className="text-yellow-400">Link</span></span>
        </div>

        {state === 'verifying' && (
          <div>
            <div className="w-20 h-20 bg-blue-900/30 border border-blue-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3">Verifying your email</h1>
            <p className="text-gray-400">Please wait while we confirm your account...</p>
          </div>
        )}

        {state === 'success' && (
          <div>
            <div className="w-20 h-20 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Email verified!</h1>
            <p className="text-gray-400 mb-2">Your account has been successfully verified.</p>
            <p className="text-gray-500 text-sm">
              Redirecting to your dashboard in{' '}
              <span className="text-yellow-400 font-bold">{countdown}</span> seconds...
            </p>
          </div>
        )}

        {state === 'error' && (
          <div>
            <div className="w-20 h-20 bg-red-900/30 border border-red-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Verification failed</h1>
            <p className="text-red-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/register', { replace: true })}
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Back to Sign Up
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
