import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, CheckCircle, MessageSquare, Lock,
  Crown, Wallet, Zap, DollarSign, Send, X, Filter,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ServiceRequest, ActiveJob, PlatformSetting } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { usePromoMode } from '../../lib/promoMode';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  open: { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  in_progress: { color: 'text-orange-400', bg: 'bg-orange-900/30' },
  completed: { color: 'text-green-400', bg: 'bg-green-900/30' },
  cancelled: { color: 'text-gray-400', bg: 'bg-gray-800' },
  accepted: { color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  disputed: { color: 'text-red-400', bg: 'bg-red-900/30' },
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanic: 'Mechanic',
  electrician: 'Electrician',
  hydraulics: 'Hydraulics',
  transmission: 'Transmission',
  engine: 'Engine',
  other: 'Other',
};

type TabType = 'feed' | 'my_jobs';

export default function Jobs() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const promoMode = usePromoMode();

  const [tab, setTab] = useState<TabType>('feed');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [myJobs, setMyJobs] = useState<ActiveJob[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [submittedOfferIds, setSubmittedOfferIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState<string | null>(null);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  const [offerForms, setOfferForms] = useState<Record<string, { price: string; message: string }>>({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [leadPrice, setLeadPrice] = useState(15);

  const [walletBalance, setWalletBalance] = useState(0);
  const isPro = profile?.subscription_tier === 'pro' || promoMode.promoEnabled;

  useEffect(() => {
    if (profile) {
      loadSettings();
      fetchUnlockedIds();
      fetchSubmittedOffers();
      fetchWalletBalance();
    }
  }, [profile]);

  const fetchWalletBalance = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', profile.id)
      .maybeSingle();
    setWalletBalance(data?.balance ?? 0);
  };

  useEffect(() => {
    if (profile) fetchTabData();
  }, [profile, tab, filterCategory]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'lead_price')
      .maybeSingle();
    if (data) setLeadPrice(data.setting_value);
  };

  const fetchUnlockedIds = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('contact_unlocks')
      .select('reference_id')
      .eq('unlocker_id', profile.id)
      .eq('unlock_type', 'technician_to_job');
    setUnlockedIds(new Set((data || []).map((u: { reference_id: string }) => u.reference_id)));
  };

  const fetchSubmittedOffers = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('offers')
      .select('service_request_id')
      .eq('technician_id', profile.id)
      .neq('status', 'withdrawn');
    setSubmittedOfferIds(new Set((data || []).map((o: { service_request_id: string }) => o.service_request_id)));
  };

  const fetchTabData = async () => {
    if (!profile) return;
    setLoading(true);
    if (tab === 'feed') {
      let query = supabase
        .from('service_requests')
        .select('*, customer:profiles!service_requests_customer_id_fkey(id, name, phone, location, avatar_url)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      const { data } = await query;
      setRequests((data || []) as ServiceRequest[]);
    } else {
      const { data } = await supabase
        .from('active_jobs')
        .select(`
          *,
          service_request:service_requests(*),
          customer:profiles!active_jobs_customer_id_fkey(id, name, phone, location, avatar_url)
        `)
        .eq('technician_id', profile.id)
        .order('created_at', { ascending: false });
      setMyJobs((data || []) as ActiveJob[]);
    }
    setLoading(false);
  };

  const handleUnlockJob = async (requestId: string) => {
    if (!profile) return;

    if (isPro) {
      await recordUnlock(requestId, 'subscription', 0);
      return;
    }

    if (walletBalance < leadPrice) {
      toast.error(`You need ${leadPrice} ETB to unlock this job. Top up your wallet.`);
      navigate('/wallet');
      return;
    }

    setUnlocking(requestId);
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, total_spent')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!walletData || walletData.balance < leadPrice) {
        toast.error('Insufficient wallet balance.');
        setUnlocking(null);
        return;
      }

      const newBalance = walletData.balance - leadPrice;
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletData.id,
          user_id: profile.id,
          type: 'deduction',
          amount: leadPrice,
          balance_after: newBalance,
          description: `Job unlock — view customer contact`,
          reference_id: requestId,
          reference_type: 'service_request',
          status: 'completed',
        })
        .select()
        .single();

      await supabase.from('wallets').update({
        balance: newBalance,
        total_spent: (walletData.total_spent ?? 0) + leadPrice,
      }).eq('id', walletData.id);

      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);
      setWalletBalance(newBalance);
      await recordUnlock(requestId, 'wallet', leadPrice, tx?.id);
      await refreshProfile();
    } catch {
      toast.error('Failed to unlock job. Please try again.');
    }
    setUnlocking(null);
  };

  const recordUnlock = async (requestId: string, method: 'wallet' | 'subscription', amount: number, txId?: string) => {
    if (!profile) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    const { error } = await supabase.from('contact_unlocks').insert({
      unlock_type: 'technician_to_job',
      unlocker_id: profile.id,
      target_id: req.customer_id,
      reference_id: requestId,
      amount_paid: amount,
      method,
    });

    if (!error) {
      setUnlockedIds(prev => new Set([...prev, requestId]));
      toast.success(method === 'subscription' ? 'Job unlocked (Pro plan)' : `Unlocked! ${amount} ETB deducted`);
    }
  };

  const handleSendOffer = async (requestId: string, customerId: string) => {
    if (!profile) return;
    const form = offerForms[requestId];
    const price = parseFloat(form?.price || '');
    if (!form?.price || isNaN(price) || price <= 0) {
      toast.error('Enter a valid price.');
      return;
    }
    setSendingOffer(requestId);
    const { error } = await supabase.from('offers').insert({
      service_request_id: requestId,
      technician_id: profile.id,
      customer_id: customerId,
      price,
      message: form.message || null,
      status: 'pending',
    });

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: 'New Offer Received',
        message: `${profile.name} submitted an offer of ${price.toLocaleString()} ETB for your request.`,
        type: 'job_request',
        related_id: requestId,
      });
      setSubmittedOfferIds(prev => new Set([...prev, requestId]));
      setShowOfferForm(null);
      toast.success('Offer sent!');
    } else {
      toast.error('Failed to send offer.');
    }
    setSendingOffer(null);
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    setUpdatingJob(jobId);
    const job = myJobs.find(j => j.id === jobId);
    if (!job) { setUpdatingJob(null); return; }

    const updates: Record<string, unknown> = { status };
    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      const commissionAmount = job.agreed_price * (job.commission_rate / 100);
      const techNet = job.agreed_price - commissionAmount;
      updates.commission_amount = commissionAmount;
      updates.technician_net = techNet;

      await supabase.from('service_requests').update({ status: 'completed' }).eq('id', job.service_request_id);
      await supabase.from('commissions').insert({
        breakdown_request_id: job.service_request_id,
        technician_id: job.technician_id,
        owner_id: job.customer_id,
        job_amount: job.agreed_price,
        commission_rate: job.commission_rate,
        commission_amount: commissionAmount,
        status: 'pending',
      });
      await supabase.from('notifications').insert({
        user_id: job.customer_id,
        title: 'Job Completed!',
        message: `${profile?.name} has marked your job as complete. Go to "My Requests → Completed Jobs" to rate the mechanic.`,
        type: 'success',
        related_id: job.service_request_id,
      });
      toast.success(`Job completed! Net earnings: ${techNet.toLocaleString()} ETB (after ${job.commission_rate}% commission)`);
    }

    await supabase.from('active_jobs').update(updates).eq('id', jobId);
    await fetchTabData();
    setUpdatingJob(null);
  };

  const categories = ['all', 'mechanic', 'electrician', 'hydraulics', 'transmission', 'engine', 'other'];

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-black text-white">Jobs</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 text-sm border border-gray-700 text-gray-300 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {walletBalance.toLocaleString()} ETB
            </Link>
            {!isPro && !promoMode.promoEnabled && (
              <Link
                to="/subscription"
                className="flex items-center gap-1.5 text-sm bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Crown className="w-3.5 h-3.5" /> Go Pro
              </Link>
            )}
          </div>
        </div>

        <div className={`rounded-xl border p-4 mb-6 ${promoMode.promoEnabled ? 'bg-green-950/30 border-green-800/40' : isPro ? 'bg-amber-950/30 border-amber-800/40' : 'bg-gray-900 border-gray-800'}`}>
          {promoMode.promoEnabled ? (
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">Free Promotional Period — All Features Unlocked!</p>
                <p className="text-gray-400 text-xs">{promoMode.promoMessage || 'Enjoy unlimited free access during our launch period.'}</p>
              </div>
            </div>
          ) : isPro ? (
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-400 font-semibold text-sm">Pro Plan — Unlimited Job Access</p>
                <p className="text-gray-400 text-xs">Unlock any job contact for free with your Pro subscription.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Pay-Per-Lead</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Unlock a job for {leadPrice} ETB to see customer contact · Balance: {walletBalance.toLocaleString()} ETB
                    {walletBalance < leadPrice && ' — Add credits to unlock jobs.'}
                  </p>
                </div>
              </div>
              {walletBalance < leadPrice && (
                <Link to="/wallet" className="flex-shrink-0 text-xs text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:border-blue-600 transition-colors whitespace-nowrap">
                  Top Up
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {(['feed', 'my_jobs'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'feed' ? 'Job Feed' : 'My Jobs'}
            </button>
          ))}
        </div>

        {tab === 'feed' && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
                  filterCategory === cat
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : tab === 'feed' ? (
          requests.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No available jobs</h3>
              <p className="text-gray-400">Check back soon for new service requests.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {requests.map(req => {
                const isUnlocked = unlockedIds.has(req.id);
                const hasOffer = submittedOfferIds.has(req.id);
                const canUnlock = isPro || walletBalance >= leadPrice;
                const customer = req.customer as Record<string, string> | undefined;
                const offerForm = offerForms[req.id] || { price: '', message: '' };

                return (
                  <motion.div
                    key={req.id}
                    layout
                    className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${
                      isUnlocked ? 'border-green-800/40' : 'border-gray-800'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-semibold">{req.title}</h3>
                            {isUnlocked && (
                              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Unlocked
                              </span>
                            )}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
                            {CATEGORY_LABELS[req.category] || req.category}
                          </span>
                        </div>
                        {req.budget && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-yellow-400 font-bold">{req.budget.toLocaleString()} ETB</p>
                            <p className="text-gray-600 text-xs">budget</p>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-3 leading-relaxed line-clamp-2">{req.description}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {req.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                      </div>

                      {isUnlocked && customer ? (
                        <div className="bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            {customer.avatar_url ? (
                              <img src={customer.avatar_url} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-900 font-bold text-sm">{(customer.name || '?')[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{customer.name}</p>
                            {customer.phone && <p className="text-green-400 text-xs">{customer.phone}</p>}
                            {customer.location && <p className="text-gray-500 text-xs">{customer.location}</p>}
                          </div>
                          <button
                            onClick={() => navigate(`/messages?user=${req.customer_id}`)}
                            className="flex items-center gap-1.5 text-xs border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message
                          </button>
                        </div>
                      ) : (
                        <div className="bg-gray-800/50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500 text-sm">Unlock to see customer contact</span>
                          </div>
                          <button
                            onClick={() => handleUnlockJob(req.id)}
                            disabled={unlocking === req.id || !canUnlock}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                              isPro
                                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30'
                                : canUnlock
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {unlocking === req.id ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : isPro ? (
                              <><Crown className="w-3 h-3" /> Free Unlock</>
                            ) : canUnlock ? (
                              <><Zap className="w-3 h-3" /> {leadPrice} ETB</>
                            ) : (
                              <><Wallet className="w-3 h-3" /> Need Credits</>
                            )}
                          </button>
                        </div>
                      )}

                      {isUnlocked && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {!hasOffer ? (
                            <button
                              onClick={() => setShowOfferForm(showOfferForm === req.id ? null : req.id)}
                              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                            >
                              <DollarSign className="w-4 h-4" /> Send Offer
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm text-green-400 bg-green-900/30 px-3 py-1.5 rounded-lg">
                              <CheckCircle className="w-4 h-4" /> Offer Sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {showOfferForm === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-800 overflow-hidden"
                        >
                          <div className="p-5 bg-gray-800/30">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-yellow-400" /> Send Offer
                              </h4>
                              <button onClick={() => setShowOfferForm(null)} className="text-gray-500 hover:text-gray-300">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mb-3">
                              <label className="block text-gray-400 text-xs mb-1">Your Price (ETB) *</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="e.g. 1500"
                                value={offerForm.price}
                                onChange={e => setOfferForms(prev => ({ ...prev, [req.id]: { ...offerForm, price: e.target.value } }))}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
                              />
                            </div>
                            <div className="mb-3">
                              <label className="block text-gray-400 text-xs mb-1">Message to Customer</label>
                              <textarea
                                rows={3}
                                placeholder="Describe what work you will do, your experience..."
                                value={offerForm.message}
                                onChange={e => setOfferForms(prev => ({ ...prev, [req.id]: { ...offerForm, message: e.target.value } }))}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 transition-colors resize-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Platform commission applies when job is completed.
                            </div>
                            <button
                              onClick={() => handleSendOffer(req.id, req.customer_id)}
                              disabled={sendingOffer === req.id}
                              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              {sendingOffer === req.id ? 'Sending...' : 'Send Offer'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        ) : (
          myJobs.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No active jobs</h3>
              <p className="text-gray-400 mb-4">Send offers on the Job Feed to get started.</p>
              <button
                onClick={() => setTab('feed')}
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse Jobs <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {myJobs.map(job => {
                const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.accepted;
                const customer = job.customer as Record<string, string> | undefined;
                const request = job.service_request as ServiceRequest | undefined;
                const commissionAmount = job.agreed_price * (job.commission_rate / 100);
                const techNet = job.agreed_price - commissionAmount;

                return (
                  <motion.div key={job.id} layout className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold mb-1">{request?.title || 'Service Job'}</h3>
                          <p className="text-gray-400 text-sm capitalize">{request?.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusStyle.color} ${statusStyle.bg}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                          <p className="text-white font-bold mt-1">{job.agreed_price.toLocaleString()} ETB</p>
                        </div>
                      </div>

                      <div className="bg-gray-800/50 rounded-xl px-4 py-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            {customer?.avatar_url ? (
                              <img src={customer.avatar_url} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-900 font-bold text-sm">{(customer?.name || '?')[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{customer?.name}</p>
                            {customer?.phone && <p className="text-gray-400 text-xs">{customer.phone}</p>}
                            {request?.location && (
                              <p className="text-gray-500 text-xs flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {request.location}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/messages?user=${job.customer_id}`)}
                            className="flex items-center gap-1.5 text-xs border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-800/30 rounded-xl px-4 py-2 mb-4 flex items-center justify-between text-xs">
                        <span className="text-gray-500">After {job.commission_rate}% commission</span>
                        <span className="text-green-400 font-bold">{techNet.toLocaleString()} ETB net</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'accepted' && (
                          <button
                            onClick={() => updateJobStatus(job.id, 'in_progress')}
                            disabled={updatingJob === job.id}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            {updatingJob === job.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                            Start Work
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => updateJobStatus(job.id, 'completed')}
                            disabled={updatingJob === job.id}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            {updatingJob === job.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Mark Complete
                          </button>
                        )}
                        {job.status === 'completed' && (
                          <span className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 px-3 py-1.5 rounded-lg">
                            <CheckCircle className="w-4 h-4" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
