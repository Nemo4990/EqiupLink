import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, ArrowRight, Star, Shield, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionPlan, Subscription } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
  const { profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const role = profile?.role === 'mechanic' ? 'mechanic' : 'supplier';

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, [profile]);

  const fetchPlans = async () => {
    if (!profile) return;
    const filterRole = profile.role === 'mechanic' ? 'mechanic' : 'supplier';
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('role', filterRole)
      .eq('is_active', true)
      .order('price_monthly');
    if (data) setPlans(data);
  };

  const fetchCurrentSubscription = async () => {
    if (!profile) return;
    const filterRole = profile.role === 'mechanic' ? 'mechanic' : 'supplier';
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('role', filterRole)
      .eq('status', 'active')
      .maybeSingle();
    setCurrentSub(data);
    setLoading(false);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.tier === 'free') return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    toast.success('Subscription upgrade request submitted! Our team will activate it shortly.');
    await fetchCurrentSubscription();
    await refreshProfile();
  };

  const handleCancelSubscription = async () => {
    if (!currentSub) return;
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', auto_renew: false })
      .eq('id', currentSub.id);
    if (!error) {
      toast.success('Subscription cancelled. Access continues until expiry.');
      fetchCurrentSubscription();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const freePlan = plans.find(p => p.tier === 'free');
  const proPlan = plans.find(p => p.tier === 'pro');
  const isProActive = profile?.subscription_tier === 'pro' || currentSub?.tier === 'pro';

  const tierBenefits = role === 'mechanic'
    ? [
        { icon: <Zap className="w-5 h-5" />, title: 'Instant Job Alerts', desc: 'Get notified the moment a new job matches your skills' },
        { icon: <Crown className="w-5 h-5" />, title: 'Boosted Visibility', desc: 'Your profile appears first in customer searches' },
        { icon: <Shield className="w-5 h-5" />, title: 'Unlimited Access', desc: 'No per-lead fees — access all jobs freely' },
        { icon: <TrendingUp className="w-5 h-5" />, title: 'Analytics Dashboard', desc: 'Track earnings, views, and job performance' },
      ]
    : [
        { icon: <Zap className="w-5 h-5" />, title: 'Unlimited Listings', desc: 'List as many parts as you need with no restrictions' },
        { icon: <Crown className="w-5 h-5" />, title: 'Featured Storefront', desc: 'Stand out with a premium supplier profile' },
        { icon: <Star className="w-5 h-5" />, title: 'Boosted Search Ranking', desc: 'Your parts appear at the top of search results' },
        { icon: <Users className="w-5 h-5" />, title: 'Promotional Tools', desc: 'Create deals and reach more customers' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Upgrade Your Plan</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {role === 'mechanic' ? 'Win More Jobs' : 'Grow Your Parts Business'}
            </h1>
            <p className="text-blue-200 text-lg max-w-xl mx-auto">
              {role === 'mechanic'
                ? 'Access unlimited job leads and boost your profile to attract more customers.'
                : 'List unlimited parts and get featured placement to reach more buyers.'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-8 pb-16">
        {isProActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center gap-3"
          >
            <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">You have an active Pro subscription</p>
              {currentSub?.expires_at && (
                <p className="text-amber-600 text-sm">
                  Renews on {new Date(currentSub.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {currentSub?.auto_renew && (
              <button
                onClick={handleCancelSubscription}
                className="text-sm text-amber-700 hover:text-amber-900 underline"
              >
                Cancel auto-renew
              </button>
            )}
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {freePlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <div className="mb-6">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Free Plan</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">0</span>
                  <span className="text-gray-500 mb-1"> ETB/month</span>
                </div>
                <p className="mt-2 text-gray-600 text-sm">Get started with basic access</p>
              </div>

              {freePlan.job_access_limit && (
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{freePlan.job_access_limit} job unlocks</span>/month
                    {freePlan.lead_cost_per_job && (
                      <span className="ml-1">· {freePlan.lead_cost_per_job} ETB per lead</span>
                    )}
                  </p>
                </div>
              )}

              <ul className="space-y-3 mb-8">
                {(freePlan.features as string[]).map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className={`w-full py-3 rounded-xl text-center text-sm font-medium ${
                !isProActive ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-gray-100 text-gray-500'
              }`}>
                {!isProActive ? 'Current Plan' : 'Downgrade Available at Expiry'}
              </div>
            </motion.div>
          )}

          {proPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-900 rounded-2xl p-8 text-white relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />

              <div className="mb-6 relative">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-blue-300 uppercase tracking-wide">Pro Plan</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{proPlan.price_monthly.toLocaleString()}</span>
                  <span className="text-blue-300 mb-1"> ETB/month</span>
                </div>
                <p className="mt-2 text-blue-200 text-sm">Everything you need to grow</p>
              </div>

              <ul className="space-y-3 mb-8 relative">
                {(proPlan.features as string[]).map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-blue-100">
                    <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-900" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(proPlan)}
                disabled={isProActive}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isProActive
                    ? 'bg-white/20 text-white/60 cursor-default'
                    : 'bg-amber-400 text-amber-900 hover:bg-amber-300 active:scale-95'
                }`}
              >
                {isProActive ? (
                  <>
                    <Crown className="w-4 h-4" />
                    Active Plan
                  </>
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            What you get with Pro
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {tierBenefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-500">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {showPaymentModal && selectedPlan && (
        <PaymentModal
          feeType="subscription_upgrade"
          feeAmount={selectedPlan.price_monthly}
          feeLabel={`Pro Plan — ${selectedPlan.price_monthly.toLocaleString()} ETB/month`}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
