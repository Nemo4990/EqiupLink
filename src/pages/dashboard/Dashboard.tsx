import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench, AlertTriangle, Package, Truck, MessageSquare, Bell,
  Plus, ChevronRight, Star, Clock, CheckCircle, Activity, Briefcase,
  Crown, Wallet, TrendingUp, CreditCard, Zap, ArrowRight, BarChart3, Siren
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BreakdownRequest, Notification, Wallet as WalletType, Subscription, Commission } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmergencyRepairModal from '../../components/ui/EmergencyRepairModal';
import SupplierDashboard from './SupplierDashboard';
import { format, formatDistanceToNow } from 'date-fns';

const URGENCY_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-400 bg-blue-900/30',
  assigned: 'text-yellow-400 bg-yellow-900/30',
  in_progress: 'text-orange-400 bg-orange-900/30',
  resolved: 'text-green-400 bg-green-900/30',
  cancelled: 'text-gray-400 bg-gray-800',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [breakdowns, setBreakdowns] = useState<BreakdownRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, messages: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const isMechanic = profile.role === 'mechanic';
    const isSupplier = profile.role === 'supplier';

    const queries: Promise<unknown>[] = [
      supabase.from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, avatar_url), assigned_mechanic:profiles!breakdown_requests_assigned_mechanic_id_fkey(name)')
        .eq(isMechanic ? 'assigned_mechanic_id' : 'owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', profile.id)
        .eq('is_read', false),
      supabase.from('user_payments')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('status', 'pending'),
    ];

    if (isMechanic || isSupplier) {
      const subRole = isMechanic ? 'mechanic' : 'supplier';
      queries.push(
        supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', profile.id).eq('role', subRole).eq('status', 'active').maybeSingle(),
      );
    }

    if (isMechanic) {
      queries.push(
        supabase.from('commissions').select('*').eq('technician_id', profile.id).order('created_at', { ascending: false }).limit(5),
      );
    }

    Promise.all(queries).then((results) => {
      const [br, notifs, msgs, pending] = results as [
        { data: BreakdownRequest[] },
        { data: Notification[] },
        { count: number },
        { count: number },
        ...unknown[]
      ];
      const bds = (br.data || []) as BreakdownRequest[];
      setBreakdowns(bds);
      setNotifications((notifs.data || []) as Notification[]);
      setStats({
        open: bds.filter(b => b.status === 'open').length,
        resolved: bds.filter(b => b.status === 'resolved').length,
        messages: msgs.count ?? 0,
        pendingPayments: pending.count ?? 0,
      });

      if (isMechanic || isSupplier) {
        const walletData = results[4] as { data: WalletType | null };
        const subData = results[5] as { data: Subscription | null };
        setWallet(walletData?.data || null);
        setSubscription(subData?.data || null);
        if (isMechanic && results[6]) {
          const commData = results[6] as { data: Commission[] };
          setCommissions(commData?.data || []);
        }
      }

      setLoading(false);
    });
  }, [profile]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const isOwner = profile?.role === 'owner';
  const isMechanic = profile?.role === 'mechanic';
  const isSupplier = profile?.role === 'supplier';
  const isRental = profile?.role === 'rental_provider';

  if (isSupplier) return <SupplierDashboard />;
  const isPro = profile?.subscription_tier === 'pro';

  const totalEarnings = commissions.reduce((s, c) => s + (c.job_amount - c.commission_amount), 0);
  const totalCommissionPaid = commissions.reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.name?.split(' ')[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 capitalize">{profile?.role?.replace('_', ' ')} Dashboard</p>
                {isPro && (
                  <span className="flex items-center gap-1 text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <>
                  <button
                    onClick={() => setShowEmergency(true)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors animate-pulse hover:animate-none"
                  >
                    <Siren className="w-4 h-4" /> Machine Down
                  </button>
                  <Link
                    to="/breakdown/new"
                    className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Post Breakdown
                  </Link>
                </>
              )}
              {isMechanic && (
                <>
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
                </>
              )}
              {isMechanic && (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  Edit Profile
                </Link>
              )}
              {isSupplier && !isPro && (
                <Link
                  to="/subscription"
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm"
                >
                  <Crown className="w-4 h-4" /> Go Pro
                </Link>
              )}
            </div>
          </div>

          {(isMechanic || isSupplier) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`rounded-xl p-5 border ${isPro ? 'bg-amber-950/30 border-amber-800/40' : 'bg-gray-900 border-gray-800'}`}>
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
                    ? subscription?.expires_at
                      ? `Renews ${format(new Date(subscription.expires_at), 'MMM d')}`
                      : 'Active'
                    : 'Limited access'}
                </p>
              </div>

              {isMechanic && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <Link to="/wallet" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                      Add Credits <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-lg font-bold text-white">{(wallet?.balance ?? profile?.wallet_balance ?? 0).toLocaleString()} ETB</p>
                  <p className="text-gray-500 text-sm mt-0.5">Wallet balance</p>
                </div>
              )}

              {isMechanic && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <Link to="/commissions" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-lg font-bold text-green-400">{totalEarnings.toLocaleString()} ETB</p>
                  <p className="text-gray-500 text-sm mt-0.5">Net earnings ({totalCommissionPaid.toLocaleString()} ETB commission)</p>
                </div>
              )}

              {isSupplier && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <Package className="w-5 h-5 text-blue-400" />
                    <Link to="/listings/new-part" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                      Add Listing <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {isPro ? 'Unlimited listings active — boost individual parts for extra visibility.' : 'Free plan: up to 5 listings. Upgrade Pro for unlimited.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: AlertTriangle, label: isOwner ? 'Open Requests' : 'Open Jobs', value: stats.open, color: 'text-orange-400', bg: 'bg-orange-400/10' },
              { icon: CheckCircle, label: 'Resolved', value: stats.resolved, color: 'text-green-400', bg: 'bg-green-400/10' },
              { icon: MessageSquare, label: 'Unread Messages', value: stats.messages, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { icon: CreditCard, label: 'Pending Payments', value: stats.pendingPayments, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-sm mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">
                    {isMechanic ? 'Assigned Jobs' : 'Breakdown Requests'}
                  </h2>
                  <Link to={isMechanic ? '/jobs' : '/breakdown'} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                {breakdowns.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No requests yet</p>
                    {isOwner && (
                      <Link to="/breakdown/new" className="mt-3 inline-block text-yellow-400 hover:text-yellow-300 text-sm">
                        Post your first breakdown request
                      </Link>
                    )}
                    {isMechanic && (
                      <Link to="/jobs" className="mt-3 inline-block text-yellow-400 hover:text-yellow-300 text-sm">
                        Browse available jobs
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {breakdowns.map((bd) => (
                      <div key={bd.id} className="px-5 py-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{bd.machine_model} — {bd.machine_type}</p>
                            <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{bd.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[bd.status]}`}>{bd.status.replace('_', ' ')}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${URGENCY_COLORS[bd.urgency]}`}>{bd.urgency}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-gray-500 text-xs">{format(new Date(bd.created_at), 'MMM d')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isMechanic && commissions.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      Recent Commissions
                    </h2>
                    <Link to="/commissions" className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">
                      View all <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {commissions.slice(0, 3).map((c) => (
                      <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-gray-300 text-sm font-medium">Job #{c.breakdown_request_id.slice(0, 8)}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {c.commission_rate}% commission · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-sm">{(c.job_amount - c.commission_amount).toLocaleString()} ETB</p>
                          <p className="text-gray-600 text-xs">-{c.commission_amount.toLocaleString()} ETB fee</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">Notifications</h2>
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
                    {notifications.map((n) => (
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

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {isOwner && (
                    <>
                      <Link to="/requests/new" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm py-2 transition-colors font-medium">
                        <Plus className="w-4 h-4" /> Post Service Request (Free)
                      </Link>
                      <Link to="/my-requests" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Briefcase className="w-4 h-4" /> My Service Requests
                      </Link>
                      <Link to="/breakdown/new" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <AlertTriangle className="w-4 h-4" /> Post Breakdown Request
                      </Link>
                      <Link to="/marketplace/mechanics" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Wrench className="w-4 h-4" /> Find a Mechanic
                      </Link>
                      <Link to="/marketplace/parts" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Package className="w-4 h-4" /> Browse Parts
                      </Link>
                    </>
                  )}
                  {isMechanic && (
                    <>
                      <Link to="/jobs" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Briefcase className="w-4 h-4" /> Available Jobs
                      </Link>
                      <Link to="/wallet" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Wallet className="w-4 h-4" /> My Wallet
                      </Link>
                      <Link to="/subscription" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Crown className="w-4 h-4" /> Subscription
                      </Link>
                      <Link to="/commissions" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <TrendingUp className="w-4 h-4" /> My Earnings
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Star className="w-4 h-4" /> Update Profile
                      </Link>
                    </>
                  )}
                  {isSupplier && (
                    <>
                      <Link to="/listings/new-part" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Package className="w-4 h-4" /> Add New Part
                      </Link>
                      <Link to="/subscription" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Crown className="w-4 h-4" /> Subscription
                      </Link>
                    </>
                  )}
                  {isRental && (
                    <Link to="/listings/new-rental" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                      <Truck className="w-4 h-4" /> Add Rental Listing
                    </Link>
                  )}
                  <Link to="/messages" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                    <MessageSquare className="w-4 h-4" /> Messages
                    {stats.messages > 0 && <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.messages}</span>}
                  </Link>
                </div>
              </div>

              {!isPro && (isMechanic || isSupplier) && (
                <Link
                  to="/subscription"
                  className="block bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/40 rounded-xl p-4 hover:border-amber-600/60 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-semibold text-sm">Upgrade to Pro</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {isMechanic
                      ? 'Get unlimited job access, boosted profile visibility, and zero per-lead fees.'
                      : 'Unlimited listings, featured storefront, and priority search placement.'}
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

      <EmergencyRepairModal isOpen={showEmergency} onClose={() => setShowEmergency(false)} />
    </div>
  );
}
