import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, ShieldAlert, Clock, MailCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ROLE_REDIRECT: Record<string, string> = {
  mechanic: '/dashboard/technician',
  technician: '/dashboard/technician',
  electrician: '/dashboard/technician',
  supplier: '/dashboard/supplier',
  rental_provider: '/dashboard',
  owner: '/dashboard/owner',
  admin: '/admin',
};

export default function Login() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [resetIn, setResetIn] = useState(0);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimited(false);
    setEmailNotVerified(false);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.rateLimited) {
      setRateLimited(true);
      setResetIn(result.resetIn ?? 0);
      setError('');
      return;
    }

    if (result.error) {
      if (result.error.message === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        return;
      }
      const rem = result.remaining ?? null;
      setRemainingAttempts(rem);
      if (rem !== null && rem <= 2) {
        setError(`${t.auth.invalidCredentials} ${rem} ${t.auth.attemptsRemaining}`);
      } else {
        setError(t.auth.invalidEmailOrPassword);
      }
    } else {
      toast.success(t.auth.welcomeBackToast);
      if (result.profile && !result.profile.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        const dest = from || (result.profile?.role ? ROLE_REDIRECT[result.profile.role] ?? '/dashboard' : '/dashboard');
        navigate(dest, { replace: true });
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      toast.error(t.auth.resetLinkFailed || 'Failed to send reset email. Please try again.');
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1280"
          alt="Heavy machinery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 to-gray-950/30"></div>
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-3xl font-black text-white leading-tight">
            "EquipLink got my Caterpillar D8R back running within 3 hours of the breakdown."
          </p>
          <p className="text-yellow-400 mt-3 font-medium">Marcus T. — Site Manager, T&B Construction</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-gray-900" />
              </div>
              <span className="text-white font-bold text-2xl">Equip<span className="text-yellow-400">Link</span></span>
            </Link>
            <AnimatePresence mode="wait">
              {forgotMode ? (
                <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <h1 className="text-3xl font-black text-white">{t.auth.resetPassword}</h1>
                  <p className="text-gray-400 mt-2">{t.auth.resetSentTo}</p>
                </motion.div>
              ) : (
                <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <h1 className="text-3xl font-black text-white">{t.auth.welcomeBack}</h1>
                  <p className="text-gray-400 mt-2">{t.auth.signInToAccount}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {forgotMode ? (
              <motion.div key="forgot-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {resetSent ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{t.auth.checkInbox}</h3>
                    <p className="text-gray-400 text-sm mb-6">
                      {t.auth.resetLinkSent} <span className="text-white font-medium">{resetEmail}</span>
                    </p>
                    <button
                      onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); }}
                      className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium mx-auto transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> {t.auth.backToSignIn}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.emailAddress}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          placeholder="you@example.com"
                          className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-3 rounded-lg transition-colors"
                    >
                      {resetLoading ? t.auth.sending : t.auth.sendResetLink}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm transition-colors py-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> {t.auth.backToSignIn}
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div key="login-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {emailNotVerified && (
                    <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <MailCheck className="w-4 h-4 flex-shrink-0 text-blue-400" />
                        <span className="font-semibold text-blue-400">{t.auth.verifyEmailFirst}</span>
                      </div>
                      <p className="text-blue-300/80 text-xs mt-1">
                        {t.auth.checkInboxVerification}
                      </p>
                    </div>
                  )}
                  {rateLimited && (
                    <div className="bg-orange-900/30 border border-orange-800 text-orange-300 px-4 py-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 text-orange-400" />
                        <span className="font-semibold text-orange-400">{t.auth.accountTemporarilyLocked}</span>
                      </div>
                      <p>{t.auth.tooManyAttempts}</p>
                      {resetIn > 0 && (
                        <p className="flex items-center gap-1 mt-1 text-orange-400/80 text-xs">
                          <Clock className="w-3 h-3" /> {t.auth.resetsIn} {Math.ceil(resetIn / 60)} {t.auth.minutes}
                        </p>
                      )}
                    </div>
                  )}
                  {error && !rateLimited && (
                    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm border ${
                      remainingAttempts !== null && remainingAttempts <= 2
                        ? 'bg-orange-900/30 border-orange-800 text-orange-300'
                        : 'bg-red-900/30 border-red-800 text-red-400'
                    }`}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.emailAddress}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={t.auth.emailPlaceholder}
                        className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-gray-300 text-sm font-medium">{t.auth.password}</label>
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setResetEmail(email); }}
                        className="text-yellow-400 hover:text-yellow-300 text-xs font-medium transition-colors"
                      >
                        {t.auth.forgotPassword}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-10 outline-none transition-colors"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || rateLimited}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-lg transition-colors mt-2"
                  >
                    {loading ? t.auth.signingIn : rateLimited ? t.auth.accountLocked : t.auth.signIn}
                  </button>
                </form>

                <p className="text-center text-gray-400 text-sm mt-6">
                  {t.auth.noAccount}{' '}
                  <Link to="/register" className="text-yellow-400 hover:text-yellow-300 font-medium">{t.auth.createOne}</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
