import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, WalletTransaction } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TOPUP_AMOUNTS = [10, 25, 50, 100, 200];

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchWalletData();
    }
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
        .limit(20);
      setTransactions(txData || []);
    }

    setLoading(false);
  };

  const getFinalAmount = () => {
    if (useCustom) {
      const val = parseFloat(customAmount);
      return isNaN(val) || val < 5 ? null : val;
    }
    return topupAmount;
  };

  const handleTopupSuccess = async () => {
    setShowTopupModal(false);
    toast.success('Top-up request submitted! Credits will be added once payment is verified.');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <WalletIcon className="w-4 h-4" />
                <span>My Wallet</span>
              </div>
              <h1 className="text-3xl font-bold">Credit Balance</h1>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowTopupModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Credits
            </motion.button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-5"
            >
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-white">${(wallet?.balance ?? 0).toFixed(2)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-5"
            >
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Purchased</p>
              <p className="text-3xl font-bold text-green-400">${(wallet?.total_purchased ?? 0).toFixed(2)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-5"
            >
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-red-400">${(wallet?.total_spent ?? 0).toFixed(2)}</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Transaction History</h2>
            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <WalletIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-gray-400 text-sm mt-1">Top up your wallet to get started</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'purchase' || tx.type === 'bonus' ? 'bg-green-50' :
                      tx.type === 'refund' ? 'bg-blue-50' : 'bg-red-50'
                    }`}>
                      {txIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {txStatusIcon(tx.status)}
                        <span className="text-gray-400 text-xs capitalize">{tx.status}</span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-gray-400 text-xs">
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`font-bold text-sm ${
                        tx.type === 'deduction' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.type === 'deduction' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                      <p className="text-gray-400 text-xs mt-0.5">Bal: ${tx.balance_after.toFixed(2)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Top-Up</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {TOPUP_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setTopupAmount(amt); setUseCustom(false); }}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      !useCustom && topupAmount === amt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all col-span-3 ${
                    useCustom ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Custom Amount
                </button>
              </div>

              {useCustom && (
                <div className="mb-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min={5}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Min $5.00"
                      className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {useCustom && customAmount && parseFloat(customAmount) < 5 && (
                    <p className="text-red-500 text-xs mt-1">Minimum top-up is $5.00</p>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Top-up amount</span>
                  <span className="font-bold text-gray-900">${finalAmount ? finalAmount.toFixed(2) : '—'}</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-blue-700 text-xs">
                  Credits are added to your wallet after payment verification by our team (usually within 1 hour).
                </p>
              </div>

              <button
                onClick={() => finalAmount && setShowTopupModal(true)}
                disabled={!finalAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Add ${finalAmount ? finalAmount.toFixed(2) : '0.00'} Credits
              </button>
            </div>

            <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">How it works</h3>
              <ul className="space-y-2.5">
                {[
                  'Add credits to your wallet',
                  'Each job lead costs a small credit fee',
                  'Unlock a job to see full contact details',
                  'Pro subscribers get unlimited free access',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-gray-600 text-xs">{step}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showTopupModal && finalAmount && (
        <PaymentModal
          feeType="wallet_topup"
          feeAmount={finalAmount}
          feeLabel={`Wallet Top-Up — $${finalAmount.toFixed(2)}`}
          onSuccess={handleTopupSuccess}
          onClose={() => setShowTopupModal(false)}
        />
      )}
    </div>
  );
}
