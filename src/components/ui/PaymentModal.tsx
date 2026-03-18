import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, DollarSign, Clock, AlertCircle, Copy, ChevronDown, ChevronUp, Wallet, CheckCircle, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CommissionFee, PaymentMethod } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  feeType: string;
  feeAmount?: number;
  feeLabel?: string;
  providerId?: string;
  providerName?: string;
  onSuccess: (method?: 'wallet' | 'manual') => void;
}

type PaymentTab = 'wallet' | 'manual';

const FEE_LABELS: Record<string, string> = {
  mechanic_contact: 'Contact Mechanic',
  parts_inquiry: 'Parts Inquiry',
  rental_inquiry: 'Rental Inquiry',
  breakdown_post: 'Post Breakdown Request',
  subscription_upgrade: 'Subscription Upgrade',
  wallet_topup: 'Wallet Top-Up',
  listing_boost: 'Boost Listing',
};

export default function PaymentModal({ isOpen = true, onClose, feeType, feeAmount: overrideAmount, feeLabel: overrideLabel, providerId, providerName, onSuccess }: Props) {
  const { profile } = useAuth();
  const [fee, setFee] = useState<CommissionFee | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>('wallet');

  const displayAmount = overrideAmount ?? fee?.fee_amount ?? 0;
  const displayLabel = overrideLabel ?? FEE_LABELS[feeType] ?? feeType;
  const hasEnoughBalance = walletBalance !== null && walletBalance >= displayAmount;

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFee(null);
      setMethods([]);
      setSelectedMethod('');
      setExpandedMethod(null);
      setTransactionId('');
      setSubmitting(false);
      setWalletBalance(null);
      setWalletId(null);
      setActiveTab('wallet');

      Promise.all([
        overrideAmount
          ? Promise.resolve({ data: null })
          : supabase
              .from('commission_fees')
              .select('*')
              .eq('service_type', feeType)
              .eq('is_active', true)
              .maybeSingle(),
        supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        profile
          ? supabase
              .from('wallets')
              .select('id, balance')
              .eq('user_id', profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]).then(([feeRes, methodsRes, walletRes]) => {
        setFee(feeRes.data as CommissionFee | null);
        const methodList = (methodsRes.data || []) as PaymentMethod[];
        setMethods(methodList);
        if (methodList.length > 0) {
          setSelectedMethod(methodList[0].id);
          setExpandedMethod(methodList[0].id);
        }
        if (walletRes.data) {
          setWalletBalance(Number(walletRes.data.balance));
          setWalletId(walletRes.data.id);
        }
        setLoading(false);
      });
    }
  }, [isOpen, feeType, profile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleWalletPayment = async () => {
    if (!profile || !walletId || walletBalance === null) return;
    if (walletBalance < displayAmount) {
      toast.error('Insufficient wallet balance');
      return;
    }
    setSubmitting(true);

    const newBalance = walletBalance - displayAmount;

    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        user_id: profile.id,
        type: 'deduction',
        amount: displayAmount,
        balance_after: newBalance,
        description: `${displayLabel}${providerName ? ` - ${providerName}` : ''}`,
        reference_type: feeType,
        status: 'completed',
      });

    if (txError) {
      toast.error('Failed to process wallet payment. Please try again.');
      setSubmitting(false);
      return;
    }

    await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId);
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

    if (feeType === 'subscription_upgrade') {
      const subRole = ['mechanic', 'technician'].includes(profile.role) ? 'mechanic'
        : profile.role === 'supplier' ? 'supplier'
        : profile.role === 'rental_provider' ? 'rental_provider'
        : 'owner';

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabase.from('subscriptions').upsert({
        user_id: profile.id,
        tier: 'pro',
        role: subRole,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method_type: 'wallet',
        auto_renew: false,
      }, { onConflict: 'user_id,role' });

      await supabase.from('profiles').update({
        subscription_tier: 'pro',
        pro_badge: true,
        pro_expires_at: expiresAt.toISOString(),
      }).eq('id', profile.id);

      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Pro Subscription Activated!',
        message: `Your Pro subscription is now active until ${expiresAt.toLocaleDateString()}. Enjoy all exclusive Pro features!`,
        type: 'subscription',
      });

      toast.success('Pro plan activated instantly!');
    } else {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Payment Successful',
        message: `${displayAmount.toFixed(2)} ETB deducted from your wallet for ${displayLabel}.`,
        type: 'payment',
      });
      toast.success('Payment successful! Access granted instantly.');
    }

    setSubmitting(false);
    onSuccess('wallet');
  };

  const handleManualPayment = async () => {
    if (!profile || (!fee && !overrideAmount)) return;
    if (!transactionId.trim()) {
      toast.error('Please enter your transaction/reference ID');
      return;
    }
    setSubmitting(true);

    const method = methods.find(m => m.id === selectedMethod);
    const { data, error } = await supabase.from('user_payments').insert({
      user_id: profile.id,
      fee_type: feeType,
      amount: displayAmount,
      status: 'pending',
      transaction_id: transactionId.trim(),
      payment_method: method?.method_name || 'manual',
      provider_id: providerId || null,
    }).select().single();

    if (!error && data) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Payment Submitted',
        message: `Your payment of ${displayAmount.toFixed(2)} ETB for ${displayLabel} is under review. We'll notify you once approved.`,
        type: 'payment',
      });

      toast.success('Payment submitted! Awaiting admin approval.');
      onSuccess('manual');
    } else {
      toast.error('Failed to submit payment. Please try again.');
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden my-4"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-yellow-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Payment Required</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
              </div>
            ) : (!fee && !overrideAmount) ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-gray-400">Fee configuration not found. Please contact support.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-yellow-400/10 to-orange-400/5 border border-yellow-400/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">{displayLabel}</p>
                  {providerName && (
                    <p className="text-white font-medium text-sm mb-2">For: {providerName}</p>
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <DollarSign className="w-6 h-6 text-yellow-400" />
                    <span className="text-3xl font-black text-yellow-400">{displayAmount.toFixed(2)}</span>
                    <span className="text-gray-400 text-sm ml-1">ETB</span>
                  </div>
                  {fee?.description && (
                    <p className="text-gray-500 text-xs mt-2">{fee.description}</p>
                  )}
                </div>

                <div className="flex gap-2 bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'wallet'
                        ? 'bg-gray-900 text-yellow-400 shadow'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    Pay with Credits
                    {hasEnoughBalance && (
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'manual'
                        ? 'bg-gray-900 text-yellow-400 shadow'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Bank Transfer
                  </button>
                </div>

                {activeTab === 'wallet' ? (
                  <div className="space-y-4">
                    <div className={`rounded-xl border p-4 ${
                      hasEnoughBalance
                        ? 'bg-green-900/20 border-green-800'
                        : 'bg-red-900/20 border-red-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className={`w-5 h-5 ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`} />
                          <span className="text-gray-300 text-sm font-medium">Wallet Balance</span>
                        </div>
                        <span className={`font-bold text-lg ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                          {walletBalance !== null ? `${walletBalance.toFixed(2)} ETB` : '—'}
                        </span>
                      </div>
                      {hasEnoughBalance ? (
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <p className="text-green-300 text-xs">Sufficient balance — payment will be instant</p>
                        </div>
                      ) : (
                        <p className="text-red-300 text-xs mt-2">
                          Insufficient balance. You need {displayAmount.toFixed(2)} ETB but have{' '}
                          {walletBalance !== null ? walletBalance.toFixed(2) : '0.00'} ETB.
                          Add credits or use bank transfer.
                        </p>
                      )}
                    </div>

                    {hasEnoughBalance && (
                      <div className="bg-green-900/10 border border-green-800/50 rounded-xl p-3 flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-green-400 font-medium text-sm">Instant Access</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            Credits are deducted immediately and access is granted right away — no waiting for approval.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleWalletPayment}
                        disabled={submitting || !hasEnoughBalance}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        {submitting ? 'Processing...' : hasEnoughBalance ? `Pay ${displayAmount.toFixed(2)} ETB` : 'Insufficient Balance'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-400 font-medium text-sm">Requires Admin Approval</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          After submitting, an admin will verify your payment. Access is granted once approved.
                        </p>
                      </div>
                    </div>

                    {methods.length === 0 ? (
                      <div className="bg-gray-800 rounded-xl p-4 text-center">
                        <p className="text-gray-400 text-sm">No payment methods configured yet. Please contact admin.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-300 text-sm font-semibold mb-2">Select Payment Method</p>
                        <div className="space-y-2">
                          {methods.map((method) => (
                            <div key={method.id} className={`border rounded-xl overflow-hidden transition-colors ${
                              selectedMethod === method.id ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-gray-700 bg-gray-800/50'
                            }`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod(method.id);
                                  setExpandedMethod(expandedMethod === method.id ? null : method.id);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    selectedMethod === method.id ? 'border-yellow-400' : 'border-gray-600'
                                  }`}>
                                    {selectedMethod === method.id && (
                                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white font-medium text-sm">{method.method_name}</p>
                                    <p className="text-gray-400 text-xs">{method.provider}</p>
                                  </div>
                                </div>
                                {expandedMethod === method.id
                                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                                }
                              </button>

                              {expandedMethod === method.id && (
                                <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50">
                                  <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                                      <div>
                                        <p className="text-gray-500 text-xs">Account Name</p>
                                        <p className="text-white text-sm font-medium">{method.account_name}</p>
                                      </div>
                                      <button onClick={() => copyToClipboard(method.account_name)} className="text-gray-400 hover:text-yellow-400 transition-colors">
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                                      <div>
                                        <p className="text-gray-500 text-xs">Account Number</p>
                                        <p className="text-white text-sm font-mono font-medium">{method.account_number}</p>
                                      </div>
                                      <button onClick={() => copyToClipboard(method.account_number)} className="text-gray-400 hover:text-yellow-400 transition-colors">
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {method.instructions && (
                                    <div className="bg-gray-900 rounded-lg p-3">
                                      <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-line">{method.instructions}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">
                        Transaction / Reference ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter your payment reference number..."
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Enter the reference number from your payment confirmation
                      </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={onClose}
                        className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleManualPayment}
                        disabled={submitting || methods.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        {submitting ? 'Submitting...' : 'Submit Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
