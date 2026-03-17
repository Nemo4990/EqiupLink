import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, CheckCircle, MessageSquare, AlertTriangle,
  Lock, Crown, Wallet, Zap, DollarSign, Send, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BreakdownRequest, JobUnlock, Quote } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  open: { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  assigned: { color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  in_progress: { color: 'text-orange-400', bg: 'bg-orange-900/30' },
  resolved: { color: 'text-green-400', bg: 'bg-green-900/30' },
  cancelled: { color: 'text-gray-400', bg: 'bg-gray-800' },
};

const URGENCY_STYLES: Record<string, string> = {
  low: 'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
};

type TabType = 'available' | 'my_jobs';

interface QuoteFormState {
  amount: string;
  description: string;
  hours: string;
}

export default function Jobs() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<BreakdownRequest[]>([]);
  const [unlockedJobIds, setUnlockedJobIds] = useState<Set<string>>(new Set());
  const [submittedQuoteIds, setSubmittedQuoteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('available');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<Record<string, QuoteFormState>>({});
  const [sendingQuote, setSendingQuote] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState<string | null>(null);

  const isPro = profile?.subscription_tier === 'pro';
  const walletBalance = profile?.wallet_balance ?? 0;
  const LEAD_COST = 5;

  useEffect(() => {
    if (profile) {
      fetchUnlocks();
      fetchSubmittedQuotes();
    }
  }, [profile]);

  useEffect(() => {
    fetchJobs();
  }, [profile, tab]);

  const fetchUnlocks = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('job_unlocks')
      .select('breakdown_request_id')
      .eq('technician_id', profile.id);
    setUnlockedJobIds(new Set((data || []).map((u: JobUnlock) => u.breakdown_request_id)));
  };

  const fetchSubmittedQuotes = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('quotes')
      .select('breakdown_request_id')
      .eq('technician_id', profile.id);
    setSubmittedQuoteIds(new Set((data || []).map((q: Quote) => q.breakdown_request_id)));
  };

  const fetchJobs = async () => {
    if (!profile) return;
    setLoading(true);
    let query;
    if (tab === 'available') {
      query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone, location, avatar_url)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
    } else {
      query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone, location, avatar_url)')
        .eq('assigned_mechanic_id', profile.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
    }
    const { data } = await query;
    setJobs((data || []) as BreakdownRequest[]);
    setLoading(false);
  };

  const handleUnlockJob = async (jobId: string, ownerId: string) => {
    if (!profile) return;
    if (isPro) {
      await recordUnlock(jobId, 'subscription', 0);
      return;
    }
    if (walletBalance < LEAD_COST) {
      toast.error(`Insufficient credits. You need $${LEAD_COST} to unlock this job. Add credits to your wallet.`);
      return;
    }
    setUnlocking(jobId);
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!walletData || walletData.balance < LEAD_COST) {
        toast.error('Insufficient wallet balance.');
        setUnlocking(null);
        return;
      }

      const newBalance = walletData.balance - LEAD_COST;
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletData.id,
          user_id: profile.id,
          type: 'deduction',
          amount: LEAD_COST,
          balance_after: newBalance,
          description: `Job unlock — ${jobId.slice(0, 8)}`,
          reference_id: jobId,
          reference_type: 'breakdown_request',
          status: 'completed',
        })
        .select()
        .single();

      await supabase
        .from('wallets')
        .update({ balance: newBalance, total_spent: (walletData as { total_spent?: number }).total_spent ?? 0 + LEAD_COST })
        .eq('id', walletData.id);

      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', profile.id);

      await recordUnlock(jobId, 'wallet', LEAD_COST, tx?.id);
      await refreshProfile();
    } catch {
      toast.error('Failed to unlock job.');
    }
    setUnlocking(null);
  };

  const recordUnlock = async (
    jobId: string,
    method: 'wallet' | 'subscription',
    creditsSpent: number,
    txId?: string,
  ) => {
    if (!profile) return;
    const { error } = await supabase.from('job_unlocks').insert({
      technician_id: profile.id,
      breakdown_request_id: jobId,
      unlock_method: method,
      credits_spent: creditsSpent,
      wallet_transaction_id: txId || null,
    });
    if (!error) {
      setUnlockedJobIds(prev => new Set([...prev, jobId]));
      toast.success(method === 'subscription' ? 'Job unlocked via Pro subscription!' : `Job unlocked! $${creditsSpent} deducted.`);
    }
  };

  const handleSendQuote = async (jobId: string, ownerId: string) => {
    if (!profile) return;
    const form = quoteForm[jobId];
    if (!form?.amount || isNaN(parseFloat(form.amount))) {
      toast.error('Please enter a valid quote amount.');
      return;
    }
    setSendingQuote(jobId);
    const { error } = await supabase.from('quotes').insert({
      breakdown_request_id: jobId,
      technician_id: profile.id,
      owner_id: ownerId,
      amount: parseFloat(form.amount),
      description: form.description || null,
      estimated_hours: form.hours ? parseFloat(form.hours) : null,
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    });

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        title: 'New Quote Received',
        message: `${profile.name} sent a quote of $${parseFloat(form.amount).toFixed(2)} for your breakdown request.`,
        type: 'job_request',
        related_id: jobId,
      });
      setSubmittedQuoteIds(prev => new Set([...prev, jobId]));
      setShowQuoteForm(null);
      toast.success('Quote sent successfully!');
    } else {
      toast.error('Failed to send quote.');
    }
    setSendingQuote(null);
  };

  const handleAcceptJob = async (jobId: string, ownerId: string) => {
    if (!profile) return;
    setAccepting(jobId);
    const { error } = await supabase
      .from('breakdown_requests')
      .update({ assigned_mechanic_id: profile.id, status: 'assigned' })
      .eq('id', jobId)
      .eq('status', 'open');

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        title: 'Mechanic Accepted Your Request',
        message: `${profile.name} has accepted your breakdown request and will contact you shortly.`,
        type: 'job_request',
        related_id: jobId,
      });
      toast.success('Job accepted! Contact the owner to discuss details.');
      fetchJobs();
    } else {
      toast.error('Failed to accept job. It may have been taken.');
    }
    setAccepting(null);
  };

  const updateStatus = async (jobId: string, status: string, ownerId: string) => {
    const { error } = await supabase
      .from('breakdown_requests')
      .update({ status })
      .eq('id', jobId);

    if (!error) {
      if (status === 'in_progress') {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Repair Work Started',
          message: 'The mechanic has started working on your machine.',
          type: 'info',
        });
      } else if (status === 'resolved') {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Repair Completed!',
          message: 'Your breakdown request has been resolved. Please leave a review and record the final job amount.',
          type: 'success',
        });
      }
      toast.success('Status updated!');
      fetchJobs();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-black text-white">Jobs</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 text-sm border border-gray-700 text-gray-300 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4" />
              ${walletBalance.toFixed(2)}
            </Link>
            {!isPro && (
              <Link
                to="/subscription"
                className="flex items-center gap-1.5 text-sm bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Crown className="w-3.5 h-3.5" /> Go Pro
              </Link>
            )}
          </div>
        </div>

        <div className={`rounded-xl border p-4 mb-6 ${
          isPro
            ? 'bg-amber-950/30 border-amber-800/40'
            : 'bg-gray-900 border-gray-800'
        }`}>
          {isPro ? (
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-400 font-semibold text-sm">Pro Plan — Unlimited Job Access</p>
                <p className="text-gray-400 text-xs">You can unlock any job for free with your Pro subscription.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Pay-Per-Lead Model</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Each job unlock costs ${LEAD_COST} from your wallet. Balance: ${walletBalance.toFixed(2)}.
                    {walletBalance < LEAD_COST && ' — Add credits to unlock jobs.'}
                  </p>
                </div>
              </div>
              <Link to="/wallet" className="flex-shrink-0 text-xs text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:border-blue-600 transition-colors">
                Top Up
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {(['available', 'my_jobs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'available' ? 'Available Jobs' : 'My Jobs'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {tab === 'available' ? 'No available jobs' : 'No jobs yet'}
            </h3>
            <p className="text-gray-400">
              {tab === 'available'
                ? 'Check back soon for new breakdown requests.'
                : 'Accept jobs from the Available Jobs tab to see them here.'}
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {jobs.map((job) => {
              const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.open;
              const isUnlocked = unlockedJobIds.has(job.id) || tab === 'my_jobs';
              const hasQuote = submittedQuoteIds.has(job.id);
              const jobQuoteForm = quoteForm[job.id] || { amount: '', description: '', hours: '' };
              const canUnlock = isPro || walletBalance >= LEAD_COST;

              return (
                <motion.div
                  key={job.id}
                  layout
                  className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
                    isUnlocked ? 'border-gray-700' : 'border-gray-800'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">{job.machine_model}</h3>
                          {isUnlocked && (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm capitalize">{job.machine_type}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${URGENCY_STYLES[job.urgency]}`}>
                          {job.urgency}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusStyle.color} ${statusStyle.bg}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-3 leading-relaxed">{job.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                    </div>

                    {isUnlocked && (job as { owner?: { name?: string; phone?: string; location?: string } }).owner ? (
                      <div className="bg-gray-800/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                          {((job as { owner?: { name?: string } }).owner?.name || '?')[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{(job as { owner?: { name?: string } }).owner?.name}</p>
                          {(job as { owner?: { phone?: string } }).owner?.phone && (
                            <p className="text-gray-400 text-xs">{(job as { owner?: { phone?: string } }).owner?.phone}</p>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/messages?user=${job.owner_id}`)}
                          className="flex items-center gap-1.5 text-xs border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Message
                        </button>
                      </div>
                    ) : tab === 'available' && !isUnlocked ? (
                      <div className="bg-gray-800/50 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 text-sm">Unlock to see contact details</span>
                        </div>
                        <button
                          onClick={() => handleUnlockJob(job.id, job.owner_id)}
                          disabled={unlocking === job.id || !canUnlock}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            isPro
                              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30'
                              : canUnlock
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {unlocking === job.id ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : isPro ? (
                            <><Crown className="w-3 h-3" /> Unlock Free</>
                          ) : canUnlock ? (
                            <><Zap className="w-3 h-3" /> ${LEAD_COST} Unlock</>
                          ) : (
                            <><Wallet className="w-3 h-3" /> Add Credits</>
                          )}
                        </button>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 flex-wrap">
                      {tab === 'available' && job.status === 'open' && isUnlocked && (
                        <>
                          <button
                            onClick={() => handleAcceptJob(job.id, job.owner_id)}
                            disabled={accepting === job.id}
                            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {accepting === job.id ? 'Accepting...' : 'Accept Job'}
                          </button>
                          {!hasQuote ? (
                            <button
                              onClick={() => setShowQuoteForm(showQuoteForm === job.id ? null : job.id)}
                              className="flex items-center gap-1.5 border border-blue-600 text-blue-400 hover:bg-blue-600/10 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
                            >
                              <DollarSign className="w-4 h-4" /> Send Quote
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-lg">
                              <CheckCircle className="w-4 h-4" /> Quote Sent
                            </span>
                          )}
                        </>
                      )}

                      {tab === 'my_jobs' && (
                        <>
                          {job.status === 'assigned' && (
                            <button
                              onClick={() => updateStatus(job.id, 'in_progress', job.owner_id)}
                              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                            >
                              <AlertTriangle className="w-4 h-4" /> Start Work
                            </button>
                          )}
                          {job.status === 'in_progress' && (
                            <button
                              onClick={() => updateStatus(job.id, 'resolved', job.owner_id)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> Mark Resolved
                            </button>
                          )}
                          {job.status === 'resolved' && (
                            <span className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 px-3 py-1.5 rounded-lg">
                              <CheckCircle className="w-4 h-4" /> Completed
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {showQuoteForm === job.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-800 overflow-hidden"
                      >
                        <div className="p-5 bg-gray-800/30">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-blue-400" />
                              Send a Quote
                            </h4>
                            <button onClick={() => setShowQuoteForm(null)} className="text-gray-500 hover:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-gray-400 text-xs mb-1">Quote Amount ($) *</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="e.g. 250"
                                value={jobQuoteForm.amount}
                                onChange={e => setQuoteForm(prev => ({ ...prev, [job.id]: { ...jobQuoteForm, amount: e.target.value } }))}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-400 text-xs mb-1">Estimated Hours</label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="e.g. 3.5"
                                value={jobQuoteForm.hours}
                                onChange={e => setQuoteForm(prev => ({ ...prev, [job.id]: { ...jobQuoteForm, hours: e.target.value } }))}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-gray-400 text-xs mb-1">Description / Notes</label>
                            <textarea
                              rows={2}
                              placeholder="Describe what work will be done..."
                              value={jobQuoteForm.description}
                              onChange={e => setQuoteForm(prev => ({ ...prev, [job.id]: { ...jobQuoteForm, description: e.target.value } }))}
                              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                            />
                          </div>
                          <p className="text-gray-500 text-xs mb-3">
                            Note: A 5–10% commission will apply when the job is completed.
                          </p>
                          <button
                            onClick={() => handleSendQuote(job.id, job.owner_id)}
                            disabled={sendingQuote === job.id}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            {sendingQuote === job.id ? 'Sending...' : 'Send Quote'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
