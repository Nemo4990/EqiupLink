import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Wrench, Package, Truck,
  Briefcase, Lock, Zap, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, WalletTransaction } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import ReAuthModal from '../../components/ui/ReAuthModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TOPUP_AMOUNTS = [50, 100, 200, 500, 1000];

const CREDIT_RULES_INFO = [
  {
    icon: Wrench,
    label: 'View Mechanic Contact',
    roles: 'Owner / Customer',
    cost: '1 credit',
    free: null,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
  },
  {
    icon: Package,
    label: 'View Part Supplier Contact',
    roles: 'Owner / Customer',
    cost: '1 credit',
    free: null,
    color: 'text-green-400',
    bg: 'bg-green-900/20',
  },
  {
    icon: Truck,
    label: 'View Rental Provider Contact',
    roles: 'Owner / Customer',
    cost: '1 credit',
    free: null,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
  },
  {
    icon: Briefcase,
    label: 'Post Job / Breakdown Request',
    roles: 'Owner',
    cost: '2 credits',
    free: '3 free',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
  },
  {
    icon: Lock,
    label: 'Unlock Job Contact',
    roles: 'Mechanic',
    cost: '1 credit',
    free: null,
    color: 'text-cyan-400',
    bg: 'bg-cyan-900/20',
  },
  {
    icon: Package,
    label: 'List Part / Rental Equipment',
    roles: 'Supplier / Rental',
    cost: '2 credits',
    free: '3 free',
    color: 'text-rose-400',
    bg: 'bg-rose-900/20',
  },
];

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showReAuth, setShowReAuth] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'guide'>('history');

  useEffect(() => {
    if (profile) fetchWalletData();
  }, [profile]);

  const fetchWalletData = async () => {
    if (!profile) return;
    setLoading(true);

    let { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!walletData) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: profile.id, balance: 0 })
        .select()
        .single();
      walletData = newWallet;
    }

    setWallet(walletData);

    if (walletData) {
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(txData || []);
    }

    setLoading(false);
  };

  const getFinalAmount = () => {
    if (useCustom) {
      const val = parseFloat(customAmount);
      return isNaN(val) || val < 50 ? null : val;
    }
    return topupAmount;
  };

  const handleTopupSuccess = async () => {
    setShowTopupModal(false);
    toast.success('Top-up request submitted! Credits will be added after payment verification.');
    await fetchWalletData();
    await refreshProfile();
  };

  const txIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case 'deduction': return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'refund': return <ArrowDownLeft className="w-4 h-4 text-blue-400" />;
      case 'bonus': return <TrendingUp className="w-4 h-4 text-amber-400" />;
      default: return <WalletIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const txBg = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-900/30';
      case 'deduction': return 'bg-red-900/30';
      case 'refund': return 'bg-blue-900/30';
      case 'bonus': return 'bg-amber-900/30';
      default: return 'bg-gray-800';
    }
  };

  const txStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'pending': return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return null;
    }
  };

  const finalAmount = getFinalAmount();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const lowBalance = balance < 5;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <WalletIcon className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-black text-white">My Wallet</h1>
          </div>
          <p className="text-gray-400 text-sm">Credits power every action on EquipLink — top up anytime</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-5 ${lowBalance ? 'bg-red-950/30 border-red-800/50' : 'bg-gray-900 border-gray-800'}`}
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Available Balance</p>
            <p className={`text-3xl font-black ${lowBalance ? 'text-red-400' : 'text-white'}`}>
              {balance.toLocaleString()} <span className="text-lg font-semibold text-gray-400">ETB</span>
            </p>
            {lowBalance && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Low balance — top up to continue
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Purchased</p>
            <p className="text-3xl font-black text-green-400">
              {(wallet?.total_purchased ?? 0).toLocaleString()} <span className="text-lg font-semibold text-gray-500">ETB</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Spent</p>
            <p className="text-3xl font-black text-red-400">
              {(wallet?.total_spent ?? 0).toLocaleString()} <span className="text-lg font-semibold text-gray-500">ETB</span>
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4">
              {(['history', 'guide'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'history' ? 'Transaction History' : 'Credit Rules'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'history' ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {transactions.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                      <WalletIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No transactions yet</p>
                      <p className="text-gray-600 text-sm mt-1">Top up your wallet to get started</p>
                    </div>
                  ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 overflow-hidden">
                      {transactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-4 p-4 hover:bg-gray-800/40 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${txBg(tx.type)}`}>
                            {txIcon(tx.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-100 font-medium text-sm truncate">{tx.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {txStatusIcon(tx.status)}
                              <span className="text-gray-500 text-xs capitalize">{tx.status}</span>
                              <span className="text-gray-700 text-xs">·</span>
                              <span className="text-gray-500 text-xs">
                                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`font-bold text-sm ${
                              tx.type === 'deduction' ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {tx.type === 'deduction' ? '-' : '+'}{Math.abs(tx.amount).toLocaleString()} ETB
                            </span>
                            <p className="text-gray-600 text-xs mt-0.5">Bal: {tx.balance_after.toLocaleString()} ETB</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <p className="text-gray-400 text-sm mb-3">Credits are automatically deducted when you perform these actions. Each contact/resource is charged only once — repeat views are free.</p>
                  {CREDIT_RULES_INFO.map((rule, i) => (
                    <div key={i} className={`flex items-center gap-4 border border-gray-800 rounded-xl p-4 ${rule.bg}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-900/60`}>
                        <rule.icon className={`w-4.5 h-4.5 ${rule.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{rule.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{rule.roles}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-sm ${rule.color}`}>{rule.cost}</p>
                        {rule.free && (
                          <p className="text-green-400 text-xs">{rule.free}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 flex items-start gap-3">
                    <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-400/80 text-xs leading-relaxed">
                      Pro subscribers get unlimited free job unlocks (mechanics) and reduced contact fees. <Link to="/subscription" className="text-yellow-400 font-semibold underline">Upgrade to Pro</Link>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-bold mb-4">Quick Top-Up</h2>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {TOPUP_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setTopupAmount(amt); setUseCustom(false); }}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      !useCustom && topupAmount === amt
                        ? 'bg-yellow-400 text-gray-900'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all col-span-3 ${
                    useCustom ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Custom Amount
                </button>
              </div>

              {useCustom && (
                <div className="mb-3">
                  <input
                    type="number"
                    min={50}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Min 50 ETB"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                  {customAmount && parseFloat(customAmount) < 50 && (
                    <p className="text-red-400 text-xs mt-1">Minimum top-up is 50 ETB</p>
                  )}
                </div>
              )}

              <div className="bg-gray-800/60 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-gray-400 text-sm">Amount</span>
                <span className="font-bold text-white">{finalAmount ? `${finalAmount.toLocaleString()} ETB` : '—'}</span>
              </div>

              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-xs leading-relaxed">
                  Credits are added after payment is verified by our team (usually within 1 hour).
                </p>
              </div>

              <button
                onClick={() => finalAmount && setShowReAuth(true)}
                disabled={!finalAmount}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {finalAmount ? `Add ${finalAmount.toLocaleString()} ETB` : 'Select an Amount'}
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Ethiopian Payment Gateways</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wide">Coming Soon</span>
              </div>
              <p className="text-gray-500 text-xs mb-4 leading-relaxed">
                Instant top-ups with local providers. Currently under integration.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Telebirr', color: 'from-emerald-600/20 to-emerald-500/10', accent: 'text-emerald-300', border: 'border-emerald-800/40' },
                  { name: 'Chapa', color: 'from-cyan-600/20 to-cyan-500/10', accent: 'text-cyan-300', border: 'border-cyan-800/40' },
                  { name: 'CBEBirr', color: 'from-amber-600/20 to-amber-500/10', accent: 'text-amber-300', border: 'border-amber-800/40' },
                  { name: 'SantimPay', color: 'from-rose-600/20 to-rose-500/10', accent: 'text-rose-300', border: 'border-rose-800/40' },
                ].map(g => (
                  <div
                    key={g.name}
                    className={`relative overflow-hidden border ${g.border} bg-gradient-to-br ${g.color} rounded-xl p-3 flex items-center gap-2`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center ${g.accent} font-black text-sm`}>
                      {g.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{g.name}</p>
                      <p className="text-gray-500 text-[10px]">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 text-sm">How Credits Work</h3>
              <ul className="space-y-3">
                {[
                  { step: '1', text: 'Top up your wallet with ETB' },
                  { step: '2', text: 'Credits deduct automatically per action' },
                  { step: '3', text: 'Each contact unlocked once — free repeat views' },
                  { step: '4', text: 'Pro plan gives unlimited job access' },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      {step}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{text}</p>
                  </li>
                ))}
              </ul>
              <Link
                to="/subscription"
                className="mt-4 flex items-center justify-between text-sm text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              >
                Upgrade to Pro <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ReAuthModal
        isOpen={showReAuth}
        onClose={() => setShowReAuth(false)}
        onSuccess={() => { setShowReAuth(false); setShowTopupModal(true); }}
        actionLabel="wallet top-up"
      />

      {showTopupModal && finalAmount && (
        <PaymentModal
          feeType="wallet_topup"
          feeAmount={finalAmount}
          feeLabel={`Wallet Top-Up — ${finalAmount.toLocaleString()} ETB`}
          onSuccess={handleTopupSuccess}
          onClose={() => setShowTopupModal(false)}
        />
      )}
    </div>
  );
}
