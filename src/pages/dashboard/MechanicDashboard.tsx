import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, MessageSquare, Bell, ChevronRight, Crown,
  Wallet, TrendingUp, ArrowRight, BarChart3,
  Flame, Trophy, Star, Zap, Award, CheckCircle,
  Briefcase, Package, AlertTriangle, MapPin, Navigation,
  Phone, Clock, User, FileText, Banknote
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Notification, Wallet as WalletType, Subscription, Commission } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format, formatDistanceToNow } from 'date-fns';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
}

interface RewardData {
  total_points: number;
  weekly_points: number;
  level: string;
  jobs_completed: number;
}

interface LeaderboardEntry {
  mechanic_id: string;
  points_earned: number;
  jobs_completed: number;
  mechanic_name?: string;
  mechanic_avatar?: string | null;
  rank: number;
}

interface ActiveJob {
  id: string;
  machine_type: string | null;
  machine_model: string | null;
  machine_serial: string | null;
  description: string | null;
  location: string | null;
  urgency: string | null;
  dispatch_status: string | null;
  mechanic_offer_status: string | null;
  mechanic_offer_sent_at: string | null;
  quote_amount: number | null;
  owner_location_shared: boolean | null;
  created_at: string;
  owner?: { name: string | null; phone: string | null } | null;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; min: number; max: number }> = {
  rookie:  { label: 'Rookie',  color: 'text-gray-400',   bg: 'bg-gray-800',       border: 'border-gray-700', min: 0,   max: 50 },
  skilled: { label: 'Skilled', color: 'text-green-400',  bg: 'bg-green-900/20',   border: 'border-green-800/40', min: 50,  max: 200 },
  pro:     { label: 'Pro',     color: 'text-blue-400',   bg: 'bg-blue-900/20',    border: 'border-blue-800/40', min: 200, max: 500 },
  expert:  { label: 'Expert',  color: 'text-orange-400', bg: 'bg-orange-900/20',  border: 'border-orange-800/40', min: 500, max: 1000 },
  master:  { label: 'Master',  color: 'text-yellow-400', bg: 'bg-yellow-900/20',  border: 'border-yellow-700/40', min: 1000, max: 1000 },
};

const DISPATCH_STEPS = [
  { key: 'accepted',    label: 'Accepted',        icon: CheckCircle },
  { key: 'quote_sent',  label: 'Quote Sent',       icon: FileText },
  { key: 'paid',        label: 'Owner Paid',       icon: Banknote },
  { key: 'dispatched',  label: 'Head to Site',     icon: Navigation },
  { key: 'completed',   label: 'Completed',        icon: CheckCircle },
];

const STEP_ORDER = ['accepted', 'quote_sent', 'paid', 'dispatched', 'completed'];

const URGENCY_COLORS: Record<string, string> = {
  low:      'text-green-400 bg-green-900/30',
  medium:   'text-yellow-400 bg-yellow-900/30',
  high:     'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function JobStatusProgress({ status }: { status: string | null }) {
  const currentIdx = STEP_ORDER.indexOf(status || 'accepted');
  return (
    <div className="flex items-center gap-0 mt-3 mb-4">
      {DISPATCH_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const StepIcon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${active ? '' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                done    ? 'bg-emerald-500 border-emerald-500' :
                active  ? 'bg-amber-400 border-amber-400' :
                          'bg-gray-800 border-gray-700'
              }`}>
                <StepIcon className={`w-3.5 h-3.5 ${done || active ? 'text-gray-900' : 'text-gray-600'}`} />
              </div>
              <p className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${
                active ? 'text-amber-300' : done ? 'text-emerald-400' : 'text-gray-600'
              }`}>{step.label}</p>
            </div>
            {i < DISPATCH_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentIdx ? 'bg-emerald-500' : 'bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MechanicDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, messages: 0 });
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [rewards, setRewards] = useState<RewardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);

  const isPro = profile?.subscription_tier === 'pro';

  const updateStreak = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.rpc('update_mechanic_streak', { p_mechanic_id: profile.id });
    if (data?.is_new_day && data?.streak > 1) {
      setShowStreakCelebration(true);
      setTimeout(() => setShowStreakCelebration(false), 4000);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const loadAll = async () => {
      setLoading(true);
      await updateStreak();

      const [activeJobsRes, offersRes, notifRes, msgRes, walletRes, subRes, commissionsRes, streakRes, rewardsRes, leaderboardRes, completedRes] = await Promise.all([
        supabase.from('breakdown_requests')
          .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone)')
          .eq('assigned_mechanic_id', profile.id)
          .eq('mechanic_offer_status', 'accepted')
          .neq('dispatch_status', 'completed')
          .order('created_at', { ascending: false }),
        supabase.from('breakdown_requests').select('id', { count: 'exact' })
          .eq('assigned_mechanic_id', profile.id).eq('mechanic_offer_status', 'pending'),
        supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', profile.id).eq('is_read', false),
        supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', profile.id).eq('role', 'mechanic').eq('status', 'active').maybeSingle(),
        supabase.from('commissions').select('*').eq('technician_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('mechanic_streaks').select('*').eq('mechanic_id', profile.id).maybeSingle(),
        supabase.from('mechanic_rewards').select('*').eq('mechanic_id', profile.id).maybeSingle(),
        supabase.from('mechanic_rewards').select('mechanic_id, total_points, weekly_points, level, jobs_completed').order('weekly_points', { ascending: false }).limit(10),
        supabase.from('breakdown_requests').select('id', { count: 'exact' }).eq('assigned_mechanic_id', profile.id).eq('dispatch_status', 'completed'),
      ]);

      const jobs = (activeJobsRes.data || []) as ActiveJob[];
      setActiveJobs(jobs);
      setPendingOfferCount(offersRes.count ?? 0);
      setNotifications((notifRes.data || []) as Notification[]);
      setStats({
        active: jobs.length,
        completed: completedRes.count ?? 0,
        messages: msgRes.count ?? 0,
      });
      setWallet(walletRes.data || null);
      setSubscription(subRes.data || null);
      setCommissions((commissionsRes.data || []) as Commission[]);
      setStreak(streakRes.data || null);
      setRewards(rewardsRes.data || null);

      if (leaderboardRes.data && leaderboardRes.data.length > 0) {
        const mechanicIds = leaderboardRes.data.map((e: Record<string, unknown>) => e.mechanic_id as string);
        const { data: profilesData } = await supabase.from('profiles').select('id, name, avatar_url').in('id', mechanicIds);
        const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
        (profilesData || []).forEach((p: { id: string; name: string; avatar_url: string | null }) => { profileMap[p.id] = p; });
        const entries: LeaderboardEntry[] = leaderboardRes.data.map((e: Record<string, unknown>, i: number) => ({
          mechanic_id: e.mechanic_id as string,
          points_earned: e.weekly_points as number,
          jobs_completed: e.jobs_completed as number,
          mechanic_name: profileMap[e.mechanic_id as string]?.name || 'Unknown',
          mechanic_avatar: profileMap[e.mechanic_id as string]?.avatar_url || null,
          rank: i + 1,
        }));
        setLeaderboard(entries);
      }

      setLoading(false);
    };

    loadAll();
  }, [profile, updateStreak]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const totalEarnings = commissions.reduce((s, c) => s + (c.job_amount - c.commission_amount), 0);
  const totalCommissionPaid = commissions.reduce((s, c) => s + c.commission_amount, 0);

  const levelCfg = rewards ? LEVEL_CONFIG[rewards.level] || LEVEL_CONFIG.rookie : LEVEL_CONFIG.rookie;
  const nextLevel = Object.entries(LEVEL_CONFIG).find(([, v]) => v.min > (rewards?.total_points ?? 0));
  const levelProgress = rewards && nextLevel
    ? ((rewards.total_points - levelCfg.min) / (nextLevel[1].min - levelCfg.min)) * 100
    : 100;
  const nextMilestone = STREAK_MILESTONES.find(m => m > (streak?.current_streak ?? 0));
  const currentRank = leaderboard.findIndex(e => e.mechanic_id === profile?.id) + 1;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <AnimatePresence>
          {showStreakCelebration && (
            <motion.div
              initial={{ opacity: 0, y: -60, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 0.9 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3"
            >
              <Flame className="w-6 h-6" />
              <div>
                <p className="font-black text-lg">{streak?.current_streak} Day Streak!</p>
                <p className="text-orange-100 text-sm">Keep it up — check back tomorrow!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.name?.split(' ')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-gray-400">Mechanic Dashboard</p>
                {isPro && (
                  <span className="flex items-center gap-1 text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                )}
                {rewards && (
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${levelCfg.bg} ${levelCfg.color} ${levelCfg.border}`}>
                    <Award className="w-3 h-3" /> {levelCfg.label}
                  </span>
                )}
                {currentRank > 0 && currentRank <= 3 && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-yellow-900/20 text-yellow-400 border border-yellow-700/40">
                    <Trophy className="w-3 h-3" /> #{currentRank} This Week
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/wallet"
                className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white font-medium px-3 py-2 rounded-xl transition-colors text-sm"
              >
                <Wallet className="w-4 h-4" />
                {(wallet?.balance ?? profile?.wallet_balance ?? 0).toLocaleString()} ETB
              </Link>
              {!isPro && (
                <Link
                  to="/subscription"
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm"
                >
                  <Crown className="w-4 h-4" /> Go Pro
                </Link>
              )}
            </div>
          </div>

          {/* Pending Job Offers — highest priority alert */}
          {pendingOfferCount > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <Link
                to="/breakdown/offers"
                className="flex items-center gap-4 bg-amber-500/10 border-2 border-amber-500/60 rounded-2xl p-5 hover:bg-amber-500/15 transition-colors group"
              >
                <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-300 font-black text-xl leading-tight">
                    {pendingOfferCount} Job Offer{pendingOfferCount > 1 ? 's' : ''} Require Your Response
                  </p>
                  <p className="text-amber-400/70 text-sm mt-0.5">Admin has assigned you to a breakdown repair. Review and accept or decline now.</p>
                </div>
                <div className="flex items-center gap-2 bg-amber-400 text-gray-900 font-bold text-sm px-4 py-2 rounded-xl group-hover:bg-amber-300 transition-colors flex-shrink-0">
                  View Offers <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Briefcase, label: 'Active Jobs', value: stats.active, color: 'text-orange-400', bg: 'bg-orange-400/10' },
              { icon: CheckCircle, label: 'Completed', value: stats.completed, color: 'text-green-400', bg: 'bg-green-400/10' },
              { icon: MessageSquare, label: 'Unread Messages', value: stats.messages, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-gray-400 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Active Jobs — Core workflow section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-yellow-400" />
                Active Jobs
                {activeJobs.length > 0 && (
                  <span className="ml-1 text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-black">{activeJobs.length}</span>
                )}
              </h2>
              <Link to="/breakdown/offers" className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">
                My Offers <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-14 text-center">
                <Wrench className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold">No active jobs at the moment</p>
                <p className="text-gray-600 text-sm mt-1">Job offers from the admin will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {activeJobs.map(job => {
                  const locationVisible = job.dispatch_status === 'dispatched' || job.dispatch_status === 'completed' || job.owner_location_shared;
                  return (
                    <div key={job.id} className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="font-bold text-white">{job.machine_type || 'Machine'} {job.machine_model || ''}</span>
                          </div>
                          {job.machine_serial && (
                            <span className="text-xs text-gray-500 font-mono">SN: {job.machine_serial}</span>
                          )}
                        </div>
                        {job.urgency && (
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${URGENCY_COLORS[job.urgency] || URGENCY_COLORS.low}`}>
                            {job.urgency.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 line-clamp-2 mb-1">{job.description}</p>

                      <JobStatusProgress status={job.dispatch_status} />

                      {/* Status-specific message */}
                      {job.dispatch_status === 'accepted' && (
                        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 text-sm text-blue-300 mb-3">
                          Admin is preparing a formal quotation for the owner. Stand by.
                        </div>
                      )}
                      {job.dispatch_status === 'quote_sent' && (
                        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 text-sm text-blue-300 mb-3">
                          Quote sent to owner. Waiting for owner to approve and pay.
                        </div>
                      )}
                      {job.dispatch_status === 'paid' && (
                        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3 text-sm text-emerald-300 mb-3">
                          Owner has paid. Admin will dispatch you shortly. Stand by for confirmation.
                        </div>
                      )}

                      {/* Dispatched — show location and contact */}
                      {job.dispatch_status === 'dispatched' && locationVisible && (
                        <div className="bg-teal-950/40 border border-teal-800/40 rounded-xl p-4 mb-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Navigation className="w-4 h-4 text-teal-400" />
                            <p className="text-teal-300 font-bold text-sm">Head to Site Now</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-white font-semibold text-sm">{job.location || '—'}</span>
                            </div>
                            {job.owner && (
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-300 text-sm">{job.owner.name}</span>
                              </div>
                            )}
                            {job.owner?.phone && (
                              <a
                                href={`tel:${job.owner.phone}`}
                                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors mt-1"
                              >
                                <Phone className="w-4 h-4" />
                                Call Owner: {job.owner.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </span>
                        {job.quote_amount && (
                          <span className="text-emerald-400 font-bold text-sm">{job.quote_amount.toLocaleString()} ETB</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gamification Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Streak Card */}
            <div className={`rounded-2xl border p-5 ${streak && streak.current_streak >= 3 ? 'bg-orange-950/20 border-orange-800/40' : 'bg-gray-900 border-gray-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className={`w-5 h-5 ${streak && streak.current_streak >= 3 ? 'text-orange-400' : 'text-gray-600'}`} />
                  <h3 className="text-white font-bold">Daily Streak</h3>
                </div>
                {streak && streak.current_streak >= 3 && (
                  <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold">On fire!</span>
                )}
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className={`text-5xl font-black ${streak && streak.current_streak >= 3 ? 'text-orange-400' : 'text-white'}`}>
                  {streak?.current_streak ?? 0}
                </p>
                <div className="pb-1">
                  <p className="text-gray-400 text-sm">day{(streak?.current_streak ?? 0) !== 1 ? 's' : ''}</p>
                  <p className="text-gray-600 text-xs">Best: {streak?.longest_streak ?? 0}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`flex-1 h-2 rounded-full ${i < (streak?.current_streak ?? 0) % 7 || (streak?.current_streak ?? 0) >= 7 ? 'bg-orange-400' : 'bg-gray-800'}`} />
                ))}
              </div>
              {nextMilestone && (
                <p className="text-gray-500 text-xs">
                  {nextMilestone - (streak?.current_streak ?? 0)} more days to reach <span className="text-orange-400 font-semibold">{nextMilestone}-day milestone</span>
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-gray-600 text-xs">{streak?.total_active_days ?? 0} total active days</p>
                <Flame className={`w-3 h-3 ${streak && streak.current_streak >= 7 ? 'text-orange-400' : 'text-gray-700'}`} />
              </div>
            </div>

            {/* Level & Points Card */}
            <div className={`rounded-2xl border p-5 ${levelCfg.bg} ${levelCfg.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className={`w-5 h-5 ${levelCfg.color}`} />
                  <h3 className="text-white font-bold">Your Level</h3>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-900/60 ${levelCfg.color}`}>
                  {levelCfg.label}
                </span>
              </div>
              <p className={`text-4xl font-black mb-1 ${levelCfg.color}`}>{rewards?.total_points ?? 0}</p>
              <p className="text-gray-500 text-sm mb-4">total points</p>
              {nextLevel && (
                <>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{levelCfg.label}</span>
                    <span>{nextLevel[1].label} ({nextLevel[1].min} pts)</span>
                  </div>
                  <div className="h-2 bg-gray-900/60 rounded-full overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(levelProgress, 100)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        rewards?.level === 'master'  ? 'from-yellow-400 to-amber-300' :
                        rewards?.level === 'expert'  ? 'from-orange-400 to-red-400' :
                        rewards?.level === 'pro'     ? 'from-blue-400 to-cyan-400' :
                        rewards?.level === 'skilled' ? 'from-green-400 to-emerald-300' :
                                                       'from-gray-500 to-gray-400'
                      }`}
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-900/40 rounded-xl py-2">
                  <p className="text-white font-bold text-sm">{rewards?.jobs_completed ?? 0}</p>
                  <p className="text-gray-500 text-xs">Jobs done</p>
                </div>
                <div className="bg-gray-900/40 rounded-xl py-2">
                  <p className="text-yellow-400 font-bold text-sm">{rewards?.weekly_points ?? 0}</p>
                  <p className="text-gray-500 text-xs">This week</p>
                </div>
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-bold">Earnings</h3>
                </div>
                <Link to="/commissions" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-4xl font-black text-green-400 mb-1">{totalEarnings.toLocaleString()}</p>
              <p className="text-gray-500 text-sm mb-4">ETB net earnings</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-white font-bold text-sm">{wallet?.balance?.toLocaleString() ?? 0}</p>
                  <p className="text-gray-500 text-xs">Wallet (ETB)</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-gray-400 font-bold text-sm">{totalCommissionPaid.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Commission paid</p>
                </div>
              </div>
              <Link
                to="/wallet"
                className="mt-3 flex items-center justify-center gap-2 border border-gray-700 hover:border-green-700 text-gray-300 hover:text-green-400 font-medium py-2 rounded-xl text-sm transition-colors"
              >
                <Wallet className="w-4 h-4" /> View Wallet
              </Link>
            </div>
          </div>

          {/* Weekly Leaderboard */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Weekly Leaderboard
                <span className="text-gray-500 text-sm font-normal">— resets every Monday</span>
              </h2>
              {currentRank > 0 && (
                <span className="text-xs text-gray-400">You're #{currentRank}</span>
              )}
            </div>
            {leaderboard.length === 0 ? (
              <div className="py-10 text-center">
                <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No rankings yet. Complete jobs to appear here!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {leaderboard.slice(0, 8).map((entry, i) => {
                  const isMe = entry.mechanic_id === profile?.id;
                  const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
                  return (
                    <div key={entry.mechanic_id} className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${isMe ? 'bg-yellow-400/5 border-l-2 border-yellow-400' : 'hover:bg-gray-800/50'}`}>
                      <span className={`text-lg font-black w-7 text-right flex-shrink-0 ${rankColors[i] ?? 'text-gray-600'}`}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {entry.mechanic_avatar ? (
                          <img src={entry.mechanic_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Wrench className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.mechanic_name} {isMe ? '(You)' : ''}
                        </p>
                        <p className="text-gray-500 text-xs">{entry.jobs_completed} jobs this week</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-black text-sm ${i === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>{entry.points_earned}</p>
                        <p className="text-gray-600 text-xs">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* How to earn points */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  How to Earn Points
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { action: 'Complete a job', pts: '+10 pts', color: 'text-green-400' },
                    { action: 'Receive a review', pts: '+5 pts', color: 'text-blue-400' },
                    { action: 'Daily login', pts: '+2 pts', color: 'text-orange-400' },
                    { action: '7-day streak', pts: '+20 pts', color: 'text-orange-500' },
                    { action: '30-day streak', pts: '+100 pts', color: 'text-red-400' },
                    { action: 'Reach Pro level', pts: 'Bonus', color: 'text-yellow-400' },
                  ].map(item => (
                    <div key={item.action} className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                      <p className={`text-lg font-black ${item.color}`}>{item.pts}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Subscription */}
              <div className={`rounded-xl border p-5 ${isPro ? 'bg-amber-950/30 border-amber-800/40' : 'bg-gray-900 border-gray-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Crown className={`w-5 h-5 ${isPro ? 'text-amber-400' : 'text-gray-600'}`} />
                  {!isPro && (
                    <Link to="/subscription" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                      Upgrade <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <p className={`text-lg font-bold ${isPro ? 'text-amber-400' : 'text-gray-400'}`}>
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </p>
                <p className="text-gray-500 text-sm mt-0.5">
                  {isPro
                    ? subscription?.expires_at ? `Renews ${format(new Date(subscription.expires_at), 'MMM d')}` : 'Active'
                    : 'Limited job access'}
                </p>
              </div>

              {/* Notifications */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold text-sm">Recent Notifications</h2>
                  <Link to="/notifications">
                    <Bell className="w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors" />
                  </Link>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-yellow-400/5' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-yellow-400' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{n.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-gray-600 text-xs mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'My Job Offers', icon: Briefcase, to: '/breakdown/offers', accent: true },
                    { label: 'My Wallet', icon: Wallet, to: '/wallet' },
                    { label: 'Earnings', icon: TrendingUp, to: '/commissions' },
                    { label: 'Messages', icon: MessageSquare, to: '/messages', badge: stats.messages },
                    { label: 'Subscription', icon: Crown, to: '/subscription' },
                    { label: 'Update Profile', icon: Star, to: '/profile' },
                    { label: 'Spare Parts', icon: Package, to: '/marketplace/parts' },
                  ].map(a => (
                    <Link
                      key={a.label}
                      to={a.to}
                      className={`flex items-center gap-2 text-sm py-2 transition-colors ${a.accent ? 'text-yellow-400 font-semibold' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      <a.icon className="w-4 h-4" />
                      {a.label}
                      {a.badge && a.badge > 0 ? (
                        <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{a.badge}</span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-700" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Upsell */}
              {!isPro && (
                <Link
                  to="/subscription"
                  className="block bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/40 rounded-xl p-4 hover:border-amber-600/60 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-semibold text-sm">Upgrade to Pro</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Unlimited job access, boosted profile visibility, and zero per-lead fees. Earn 2x points!
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-amber-400 text-xs font-medium">
                    Learn more <Zap className="w-3 h-3" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
