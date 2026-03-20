import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Mail, Lock, User, Eye, EyeOff, AlertCircle, HardHat, Truck, Package, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'owner', label: 'Equipment Owner', desc: 'Post breakdown requests, manage machines', icon: HardHat, color: 'text-yellow-400' },
  { id: 'mechanic', label: 'Mechanic / Technician', desc: 'Offer repair and maintenance services', icon: Wrench, color: 'text-orange-400' },
  { id: 'supplier', label: 'Spare Parts Supplier', desc: 'List and sell spare parts', icon: Package, color: 'text-blue-400' },
  { id: 'rental_provider', label: 'Equipment Rental Provider', desc: 'List machines for rent', icon: Truck, color: 'text-green-400' },
];

const RESEND_COOLDOWN = 60;

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(searchParams.get('role') || 'owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [userId, setUserId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error, needsVerification, userId: uid } = await signUp(email, password, name, role);
    setLoading(false);
    if (error) {
      setError(error.message || 'Registration failed. Please try again.');
    } else if (needsVerification) {
      if (uid) setUserId(uid);
      setVerificationSent(true);
      setResendCooldown(RESEND_COOLDOWN);
    } else {
      toast.success('Account created! Welcome to EquipLink.');
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    if (!userId || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
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
        toast.success('Verification email resent!');
        setResendCooldown(RESEND_COOLDOWN);
      }
    } catch {
      toast.error('Failed to resend. Please check your connection.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>

          <h1 className="text-3xl font-black text-white mb-3">Check your email</h1>
          <p className="text-gray-400 text-base leading-relaxed mb-1">
            We sent a verification link to
          </p>
          <p className="text-white font-semibold text-lg mb-6">{email}</p>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-gray-400 text-sm leading-relaxed">
              Click the <span className="text-yellow-400 font-medium">Verify My Email Address</span> button in the email to activate your account. The link expires in <span className="text-white font-medium">1 hour</span>.
            </p>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Didn't receive it? Check your spam folder.
          </p>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-yellow-400 hover:text-yellow-300 disabled:text-gray-500"
          >
            <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendLoading
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend verification email'}
          </button>

          <div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-gray-900" />
            </div>
            <span className="text-white font-bold text-2xl">Equip<span className="text-yellow-400">Link</span></span>
          </Link>
          <h1 className="text-3xl font-black text-white">Create your account</h1>
          <p className="text-gray-400 mt-2">Join the heavy equipment service marketplace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-3">I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                    role === r.id
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <r.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${role === r.id ? r.color : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${role === r.id ? 'text-white' : 'text-gray-400'}`}>{r.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-10 outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
