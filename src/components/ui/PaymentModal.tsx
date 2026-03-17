import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, DollarSign, Clock, AlertCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react';
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
  onSuccess: () => void;
}

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

  const displayAmount = overrideAmount ?? fee?.fee_amount ?? 0;
  const displayLabel = overrideLabel ?? FEE_LABELS[feeType] ?? feeType;

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFee(null);
      setMethods([]);
      setSelectedMethod('');
      setExpandedMethod(null);
      setTransactionId('');
      setSubmitting(false);
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
      ]).then(([feeRes, methodsRes]) => {
        setFee(feeRes.data as CommissionFee | null);
        const methodList = (methodsRes.data || []) as PaymentMethod[];
        setMethods(methodList);
        if (methodList.length > 0) {
          setSelectedMethod(methodList[0].id);
          setExpandedMethod(methodList[0].id);
        }
        setLoading(false);
      });
    }
  }, [isOpen, feeType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSubmitPayment = async () => {
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
        message: `Your payment of $${displayAmount.toFixed(2)} for ${displayLabel} is under review. We'll notify you once approved.`,
        type: 'payment',
      });

      toast.success('Payment submitted! Awaiting admin approval.');
      onSuccess();
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
              <h2 className="text-white font-bold text-lg">Commission Fee Required</h2>
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
                  </div>
                  {fee?.description && (
                    <p className="text-gray-500 text-xs mt-2">{fee.description}</p>
                  )}
                </div>

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
                    onClick={handleSubmitPayment}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
