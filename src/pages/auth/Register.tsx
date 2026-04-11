import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Mail, Lock, User, Eye, EyeOff, AlertCircle, HardHat, Truck, Package, Phone, MapPin, ChevronDown, Gift, Check, X as XIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateReferralCode, processReferral } from '../../lib/referrals';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'owner', label: 'Equipment Owner', desc: 'Post breakdown requests, manage machines', icon: HardHat, color: 'text-yellow-400' },
  { id: 'mechanic', label: 'Mechanic / Technician', desc: 'Offer repair and maintenance services', icon: Wrench, color: 'text-orange-400' },
  { id: 'supplier', label: 'Spare Parts Supplier', desc: 'List and sell spare parts', icon: Package, color: 'text-blue-400' },
  { id: 'rental_provider', label: 'Equipment Rental Provider', desc: 'List machines for rent', icon: Truck, color: 'text-green-400' },
];

const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'South West Ethiopia',
  'Tigray',
];

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(searchParams.get('role') || 'owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('ref');
    if (code) {
      setReferralCode(code);
      checkReferral(code);
    }
  }, []);

  const checkReferral = async (code: string) => {
    if (!code || code.length < 4) { setReferralValid(null); setReferrerId(null); return; }
    setReferralChecking(true);
    const result = await validateReferralCode(code);
    setReferralValid(result.valid);
    setReferrerId(result.referrerId || null);
    setReferrerName(result.referrerName || null);
    setReferralChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error, needsVerification, userId } = await signUp(email, password, name, role, phone, location);
    setLoading(false);
    if (error) {
      setError(error.message || 'Registration failed. Please try again.');
    } else if (needsVerification) {
      if (userId && referrerId && referralValid) {
        await processReferral(referrerId, userId).catch(() => {});
      }
      navigate('/verify-email-sent', { state: { name, email, userId, referrerId: referralValid ? referrerId : null }, replace: true });
    } else {
      toast.success('Account created! Welcome to EquipLink.');
      navigate('/onboarding');
    }
  };

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
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </motion.div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 9XX XXX XXX"
                  className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Region</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-3 pl-10 pr-8 outline-none transition-colors appearance-none"
                >
                  <option value="" className="text-gray-500">Select region</option>
                  {ETHIOPIAN_REGIONS.map((r) => (
                    <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                  ))}
                </select>
              </div>
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

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Referral Code <span className="text-gray-500">(optional)</span></label>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setReferralCode(val);
                  if (val.length >= 4) checkReferral(val);
                  else { setReferralValid(null); setReferrerId(null); }
                }}
                placeholder="Enter referral code"
                maxLength={12}
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-10 outline-none transition-colors font-mono tracking-wider"
              />
              {referralChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              )}
              {!referralChecking && referralValid === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              )}
              {!referralChecking && referralValid === false && (
                <XIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
              )}
            </div>
            {referralValid === true && referrerName && (
              <p className="text-green-400 text-xs mt-1">Referred by {referrerName} - you'll both get bonus credits!</p>
            )}
            {referralValid === false && referralCode.length >= 4 && (
              <p className="text-red-400 text-xs mt-1">Invalid referral code</p>
            )}
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
