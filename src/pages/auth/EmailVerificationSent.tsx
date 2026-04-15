import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Mail, RefreshCw, ArrowLeft, CheckCircle, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const RESEND_COOLDOWN = 60;
const VERIFICATION_CHECK_INTERVAL = 2000;

export default function EmailVerificationSent() {
  const loc = useLocation();
  const navigate = useNavigate();

  const state = (loc.state as { name?: string; email?: string; userId?: string }) || {};
  const { name = 'there', email = '', userId = '' } = state;

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        setChecking(true);
        const { data } = await supabase.auth.getUser();
        if (data.user?.email_confirmed_at) {
          toast.success('Email verified! Redirecting to dashboard...');
          setTimeout(() => {
            navigate('/onboarding', { replace: true });
          }, 500);
        }
      } catch (err) {
        console.error('Verification check error:', err);
      } finally {
        setChecking(false);
      }
    };

    const interval = setInterval(checkVerification, VERIFICATION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!userId || cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId, name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to resend. Please try again later.');
      } else {
        toast.success('Verification email resent successfully!');
        setCooldown(RESEND_COOLDOWN);
      }
    } catch {
      toast.error('Network error. Please check your connection.');
    } finally {
      setResending(false);
    }
  };

  const firstName = name.split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-gray-900" />
            </div>
            <span className="text-white font-bold text-2xl">Equip<span className="text-yellow-400">Link</span></span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-8 py-10 text-center border-b border-gray-800">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400/40 rounded-full flex items-center justify-center mx-auto mb-5"
              >
                <Mail className="w-9 h-9 text-yellow-400" />
              </motion.div>

              <h1 className="text-2xl font-black text-white mb-2">
                Check your inbox, {firstName}!
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                We've sent a verification email to
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                <Mail className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-white font-semibold text-sm break-all">{email}</span>
              </div>
            </div>

            <div className="px-8 py-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Check your inbox (and spam folder)</p>
                  <p className="text-gray-500 text-xs mt-0.5">Look for an email from EquipLink &lt;support@equiplink.org&gt;</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Click "Verify My Email Address"</p>
                  <p className="text-gray-500 text-xs mt-0.5">This activates your account and logs you in</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Link expires in 1 hour</p>
                  <p className="text-gray-500 text-xs mt-0.5">Request a new one below if it expires</p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-3">
              <div className="h-px bg-gray-800 mb-5" />

              {checking && (
                <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-900/50 rounded-lg p-3 mb-3">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                  <p className="text-blue-300 text-xs font-medium">Checking for email verification...</p>
                </div>
              )}

              {!checking && (
                <div className="bg-blue-950/40 border border-blue-900/50 rounded-lg p-3 mb-3">
                  <p className="text-blue-300 text-xs font-medium">Tip: If you don't see the email, check your spam or promotions folder and mark it as "Not Spam"</p>
                </div>
              )}

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resending || !userId}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-600 disabled:border-gray-800 text-white disabled:text-gray-600 font-medium py-3 rounded-xl transition-all text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend verification email'}
              </button>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm font-medium py-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Wrong email?{' '}
            <Link to="/register" className="text-gray-400 hover:text-white underline transition-colors">
              Sign up again
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
