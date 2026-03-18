import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Check, Zap, Star, Shield, TrendingUp, Users, Package,
  Truck, Wrench, Lock, ArrowRight, Wallet, Clock, CheckCircle, X,
  BarChart3, Bell, Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionPlan, Subscription } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  mechanic: 'Mechanic',
  technician: 'Technician',
  supplier: 'Parts Supplier',
  rental_provider: 'Rental Provider',
  owner: 'Machine Owner',
  customer: 'Customer',
};

const FEATURE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  unlimited_job_access: Zap,
  boosted_profile: TrendingUp,
  no_contact_fees: Shield,
  instant_job_alerts: Bell,
  analytics_dashboard: BarChart3,
  priority_support: Star,
  pro_badge: Crown,
  unlimited_listings: Package,
  featured_storefront: Star,
  boosted_search: TrendingUp,
  no_listing_fees: Shield,
  analytics: BarChart3,
  promotional_tools: Zap,
  unlimited_contacts: Users,
  unlimited_job_posts: Briefcase,
  priority_matching: Zap,
  dedicated_support: Shield,
};

interface ProFeature {
  feature_key: string;
  feature_label: string;
  feature_description: string;
  sort_order: number;
}

export default function SubscriptionPage() {
  const { profile, refreshProfile } = useAuth();
  const [freePlan, setFreePlan] = useState<SubscriptionPlan | null>(null);
  const [proPlan, setProPlan] = useState<SubscriptionPlan | null>(null);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [proFeatures, setProFeatures] = useState<ProFeature[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const role = profile?.role || 'owner';
  const planRole = ['mechanic', 'technician'].includes(role) ? 'mechanic'
    : role === 'supplier' ? 'supplier'
    : role === 'rental_provider' ? 'rental_provider'
    : 'owner';

  const isPro = profile?.subscription_tier === 'pro' || currentSub?.status === 'active';

  useEffect(() => {
    if (!profile) return;
    fetchAll();
  }, [profile]);

  const fetchAll = async () => {
    if (!profile) return;
    setLoading(true);
    const [plansRes, subRes, featuresRes, walletRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('role', planRole).eq('is_active', true).order('price_monthly'),
      supabase.from('subscriptions').select('*').eq('user_id', profile.id).eq('role', planRole).eq('status', 'active').maybeSingle(),
      supabase.from('pro_plan_features').select('feature_key, feature_label, feature_description, sort_order').eq('role', planRole).eq('is_active', true).order('sort_order'),
      supabase.from('wallets').select('balance').eq('user_id', profile.id).maybeSingle(),
    ]);
    const plans = (plansRes.data || []) as SubscriptionPlan[];
    setFreePlan(plans.find(p => p.tier === 'free') || null);
    setProPlan(plans.find(p => p.tier === 'pro') || null);
    setCurrentSub(subRes.data as Subscription | null);
    setProFeatures((featuresRes.data || []) as ProFeature[]);
    setWalletBalance(walletRes.data?.balance ?? 0);
    setLoading(false);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    await fetchAll();
    await refreshProfile();
  };

  const handleCancelSubscription = async () => {
    if (!currentSub) return;
    await supabase.from('subscriptions').update({ status: 'cancelled', auto_renew: false }).eq('id', currentSub.id);
    toast.success('Subscription cancelled. Access continues until expiry date.');
    setShowCancelConfirm(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const priceMonthly = proPlan?.price_monthly ?? 0;
  const canAffordWithWallet = walletBalance >= priceMonthly;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-sm text-yellow-400 mb-5">
            <Crown className="w-4 h-4" />
            <span>Pro Plan for {ROLE_LABELS[role] || 'All Roles'}</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Upgrade to Pro</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Unlock exclusive features, remove all limits, and stand out on EquipLink.
            Pay instantly from your wallet or via bank transfer.
          </p>
        </div>

        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5 mb-8 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-gray-900" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-400 font-bold">Pro Plan Active</p>
              {currentSub?.expires_at && (
                <p className="text-gray-400 text-sm mt-0.5">
                  Expires {format(new Date(currentSub.expires_at), 'MMMM d, yyyy')}
                  <span className="text-gray-600 ml-2">({formatDistanceToNow(new Date(currentSub.expires_at), { addSuffix: true })})</span>
                </p>
              )}
            </div>
            {currentSub?.auto_renew && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-5 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-7"
          >
            <div className="mb-5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Free Plan</span>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-black text-white">0</span>
                <span className="text-gray-500 text-sm mb-1"> ETB/month</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">Basic access to get started</p>
            </div>
            <ul className="space-y-3 mb-6">
              {(freePlan?.features as string[] || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="w-full py-3 rounded-xl bg-gray-800 text-gray-500 text-sm font-medium text-center">
              {!isPro ? 'Current Plan' : 'Free Plan (after expiry)'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-gray-900 border-2 border-yellow-400/60 rounded-2xl p-7 overflow-hidden"
          >
            <div className="absolute top-4 right-4">
              <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Pro
              </span>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-400/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-yellow-400/5 rounded-full pointer-events-none" />

            <div className="mb-5 relative">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Pro Plan</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">{priceMonthly.toLocaleString()}</span>
                <span className="text-gray-400 text-sm mb-1"> ETB/month</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">Everything you need to grow</p>
            </div>

            <ul className="space-y-3 mb-6 relative">
              {(proPlan?.features as string[] || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-200">
                  <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-gray-900" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            {!isPro ? (
              <div className="space-y-2.5 relative">
                {canAffordWithWallet && (
                  <div className="flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-xl px-3 py-2">
                    <Wallet className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-green-400 text-xs font-medium">
                      Your wallet ({walletBalance.toLocaleString()} ETB) — instant activation
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black py-3.5 rounded-xl transition-all active:scale-95 text-sm"
                >
                  <Crown className="w-4 h-4" />
                  {canAffordWithWallet ? `Pay ${priceMonthly.toLocaleString()} ETB — Instant Pro` : 'Upgrade to Pro'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!canAffordWithWallet && (
                  <Link
                    to="/wallet"
                    className="flex items-center justify-center gap-2 border border-gray-700 hover:border-yellow-400/50 text-gray-400 hover:text-yellow-400 font-semibold py-3 rounded-xl transition-colors text-sm w-full"
                  >
                    <Wallet className="w-4 h-4" />
                    Top Up Wallet ({walletBalance.toLocaleString()} ETB available)
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 relative">
                <div className="flex-1 flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl py-3 px-4">
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">Active Plan</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {proFeatures.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
            <h2 className="text-xl font-black text-white mb-6">Everything included in Pro</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {proFeatures.map((feat, i) => {
                const Icon = FEATURE_ICONS[feat.feature_key] || Zap;
                return (
                  <motion.div
                    key={feat.feature_key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{feat.feature_label}</p>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{feat.feature_description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
          <h2 className="text-lg font-bold text-white mb-4">How to activate Pro</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gray-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-white font-semibold text-sm">Instant — Pay from Wallet</span>
                <span className="text-xs text-green-400 bg-green-900/30 border border-green-800/30 px-1.5 py-0.5 rounded-full">Recommended</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Top up your wallet and pay directly. Pro is activated immediately — no waiting, no approval needed.
              </p>
              {!canAffordWithWallet && (
                <Link to="/wallet" className="mt-3 inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold hover:text-yellow-300 transition-colors">
                  <Wallet className="w-3 h-3" /> Top up now
                </Link>
              )}
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-white font-semibold text-sm">Bank Transfer — Manual</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Transfer to our bank account and submit the transaction ID. Admin verifies and activates Pro (usually within a few hours).
              </p>
            </div>
          </div>
        </div>

        {!isPro && (
          <p className="mt-6 text-center text-gray-600 text-sm">
            Need help? <Link to="/messages" className="text-yellow-400 hover:text-yellow-300 transition-colors">Contact support</Link>
          </p>
        )}
      </div>

      {showPaymentModal && proPlan && (
        <PaymentModal
          feeType="subscription_upgrade"
          feeAmount={proPlan.price_monthly}
          feeLabel={`Pro Plan — ${proPlan.price_monthly.toLocaleString()} ETB/month`}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">Cancel Auto-Renew?</h3>
                <button onClick={() => setShowCancelConfirm(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-5">
                Your Pro access continues until{' '}
                <span className="text-white font-medium">
                  {currentSub?.expires_at ? format(new Date(currentSub.expires_at), 'MMMM d, yyyy') : 'expiry'}
                </span>.
                After that, you will return to the Free plan.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Keep Pro
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel Renewal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
