import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Package, Truck, AlertTriangle, CheckCircle, XCircle, Activity, BarChart3, CreditCard, DollarSign, Clock, Plus, Trash2, Pencil, X, Save, Mail, Phone, MapPin, Globe, TrendingUp, Crown, Wallet, PercentSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile, BreakdownRequest, UserPayment, PaymentMethod, Commission, Subscription, SubscriptionPlan } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminListings from './AdminListings';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

type AdminTab = 'overview' | 'users' | 'payments' | 'payment_methods' | 'subscriptions' | 'commissions' | 'breakdowns' | 'listings' | 'site_stats' | 'contact';

interface ContactSettings {
  id: string;
  email: string;
  phone: string;
  address: string;
  facebook_url: string;
  twitter_url: string;
  linkedin_url: string;
}

interface SiteStat {
  id: string;
  stat_key: string;
  stat_value: string;
  stat_label: string;
  sort_order: number;
}

export default function Admin() {
  const { profile: adminProfile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRequest[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subPlans, setSubPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState({ users: 0, mechanics: 0, breakdowns: 0, parts: 0, rentals: 0, pendingPayments: 0, activeSubscriptions: 0, totalCommissions: 0 });
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState({ min: 5, max: 10 });
  const [savingCommissionRate, setSavingCommissionRate] = useState(false);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState({
    method_name: '',
    provider: '',
    account_name: '',
    account_number: '',
    instructions: '',
    sort_order: 0,
  });
  const [savingMethod, setSavingMethod] = useState(false);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [contactForm, setContactForm] = useState({ email: '', phone: '', address: '', facebook_url: '', twitter_url: '', linkedin_url: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [siteStatsList, setSiteStatsList] = useState<SiteStat[]>([]);
  const [showStatForm, setShowStatForm] = useState(false);
  const [editingStat, setEditingStat] = useState<SiteStat | null>(null);
  const [statForm, setStatForm] = useState({ stat_key: '', stat_value: '', stat_label: '', sort_order: 0 });
  const [savingStat, setSavingStat] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      { data: usersData },
      { data: bds },
      { data: paymentsData },
      { count: partsCount },
      { count: rentalsCount },
      methodsRes,
      { data: contactData },
      { data: siteStatsData },
      { data: commissionsData },
      { data: subscriptionsData },
      { data: subPlansData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name)')
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('user_payments')
        .select('*, user:profiles!user_payments_user_id_fkey(name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('parts_listings').select('id', { count: 'exact' }),
      supabase.from('equipment_rentals').select('id', { count: 'exact' }),
      supabase.from('payment_methods').select('*').order('sort_order'),
      supabase.from('contact_settings').select('*').maybeSingle(),
      supabase.from('site_stats').select('*').order('sort_order'),
      supabase.from('commissions')
        .select('*, technician:profiles!commissions_technician_id_fkey(name, email), breakdown_request:breakdown_requests(machine_model, location)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('subscriptions')
        .select('*, user:profiles!subscriptions_user_id_fkey(name, email, role)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('*').order('price_monthly'),
    ]);

    const allUsers = (usersData || []) as Profile[];
    const allPayments = (paymentsData || []) as UserPayment[];
    const allCommissions = (commissionsData || []) as Commission[];
    setUsers(allUsers);
    setBreakdowns((bds || []) as BreakdownRequest[]);
    setPayments(allPayments);
    setPaymentMethods((methodsRes.data || []) as PaymentMethod[]);
    setCommissions(allCommissions);
    setSubscriptions((subscriptionsData || []) as Subscription[]);
    setSubPlans((subPlansData || []) as SubscriptionPlan[]);
    const contactRes = contactData as ContactSettings | null;
    if (contactRes) {
      setContactSettings(contactRes);
      setContactForm({
        email: contactRes.email || '',
        phone: contactRes.phone || '',
        address: contactRes.address || '',
        facebook_url: contactRes.facebook_url || '',
        twitter_url: contactRes.twitter_url || '',
        linkedin_url: contactRes.linkedin_url || '',
      });
    }
    setSiteStatsList((siteStatsData || []) as SiteStat[]);
    setStats({
      users: allUsers.length,
      mechanics: allUsers.filter(u => u.role === 'mechanic').length,
      breakdowns: (bds || []).length,
      parts: partsCount ?? 0,
      rentals: rentalsCount ?? 0,
      pendingPayments: allPayments.filter(p => p.status === 'pending').length,
      activeSubscriptions: (subscriptionsData || []).length,
      totalCommissions: allCommissions.reduce((s: number, c: Commission) => s + c.commission_amount, 0),
    });
    setLoading(false);
  };

  const toggleSuspend = async (userId: string, suspended: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: !suspended }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: !suspended } : u));
      toast.success(suspended ? 'User unsuspended' : 'User suspended');
    }
  };

  const approveMechanic = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
      toast.success('Mechanic approved');
    }
  };

  const approvePayment = async (paymentId: string, userId: string, feeType: string) => {
    const contactType = feeType === 'mechanic_contact' ? 'mechanic' :
                       feeType === 'parts_inquiry' ? 'supplier' :
                       feeType === 'rental_inquiry' ? 'rental' : 'breakdown';

    const payment = payments.find(p => p.id === paymentId);

    const { error } = await supabase
      .from('user_payments')
      .update({
        status: 'approved',
        reviewed_by: adminProfile?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (!error) {
      if (feeType === 'subscription_upgrade') {
        const user = users.find(u => u.id === userId);
        const subRole = user?.role === 'mechanic' ? 'mechanic' : 'supplier';
        await activateSubscription(userId, 'pro', subRole, paymentId);
      } else if (feeType === 'wallet_topup') {
        const paymentAmount = payment?.amount ?? 0;
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance, total_purchased')
          .eq('user_id', userId)
          .maybeSingle();

        if (walletData) {
          const newBalance = walletData.balance + paymentAmount;
          await supabase.from('wallets').update({
            balance: newBalance,
            total_purchased: walletData.total_purchased + paymentAmount,
          }).eq('id', walletData.id);
          await supabase.from('wallet_transactions').insert({
            wallet_id: walletData.id,
            user_id: userId,
            type: 'purchase',
            amount: paymentAmount,
            balance_after: newBalance,
            description: `Wallet top-up ($${paymentAmount.toFixed(2)})`,
            payment_id: paymentId,
            status: 'completed',
          });
          await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
          await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Wallet Credited',
            message: `$${paymentAmount.toFixed(2)} has been added to your wallet.`,
            type: 'wallet',
          });
        }
      } else if (payment?.provider_id) {
        await supabase.from('contact_history').upsert({
          user_id: userId,
          provider_id: payment.provider_id,
          contact_type: contactType,
          payment_id: paymentId,
        }, { onConflict: 'user_id,provider_id,contact_type' });

        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Payment Approved — Contact Unlocked',
          message: `Your payment has been approved. You can now contact the provider.`,
          type: 'payment',
          related_id: payment.provider_id,
        });
      } else {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Payment Approved',
          message: `Your payment has been approved.`,
          type: 'payment',
        });
      }

      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, status: 'approved' as const } : p
      ));
      setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
      toast.success('Payment approved');
    }
  };

  const rejectPayment = async (paymentId: string, userId: string) => {
    const { error } = await supabase
      .from('user_payments')
      .update({
        status: 'rejected',
        reviewed_by: adminProfile?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Payment Rejected',
        message: 'Your payment could not be verified. Please contact support.',
        type: 'payment',
      });

      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, status: 'rejected' as const } : p
      ));
      setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
      toast.success('Payment rejected');
    }
  };

  const approveProfile = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Profile Approved',
        message: 'Your profile has been approved. You can now access all platform features.',
        type: 'success',
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
      toast.success('Profile approved');
    }
  };

  const openAddMethod = () => {
    setEditingMethod(null);
    setMethodForm({ method_name: '', provider: '', account_name: '', account_number: '', instructions: '', sort_order: paymentMethods.length });
    setShowMethodForm(true);
  };

  const openEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setMethodForm({
      method_name: method.method_name,
      provider: method.provider,
      account_name: method.account_name,
      account_number: method.account_number,
      instructions: method.instructions || '',
      sort_order: method.sort_order,
    });
    setShowMethodForm(true);
  };

  const saveMethod = async () => {
    if (!methodForm.method_name || !methodForm.account_number) {
      toast.error('Method name and account number are required');
      return;
    }
    setSavingMethod(true);

    if (editingMethod) {
      const { error } = await supabase
        .from('payment_methods')
        .update({ ...methodForm, updated_at: new Date().toISOString() })
        .eq('id', editingMethod.id);
      if (!error) {
        setPaymentMethods(prev => prev.map(m => m.id === editingMethod.id ? { ...m, ...methodForm } : m));
        toast.success('Payment method updated');
        setShowMethodForm(false);
      } else {
        toast.error('Failed to update method');
      }
    } else {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(methodForm)
        .select()
        .single();
      if (!error && data) {
        setPaymentMethods(prev => [...prev, data as PaymentMethod]);
        toast.success('Payment method added');
        setShowMethodForm(false);
      } else {
        toast.error('Failed to add method');
      }
    }
    setSavingMethod(false);
  };

  const deleteMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (!error) {
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Payment method removed');
    }
  };

  const toggleMethodActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('payment_methods').update({ is_active: !current }).eq('id', id);
    if (!error) {
      setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m));
    }
  };

  const openAddStat = () => {
    setEditingStat(null);
    setStatForm({ stat_key: '', stat_value: '', stat_label: '', sort_order: siteStatsList.length });
    setShowStatForm(true);
  };

  const openEditStat = (stat: SiteStat) => {
    setEditingStat(stat);
    setStatForm({ stat_key: stat.stat_key, stat_value: stat.stat_value, stat_label: stat.stat_label, sort_order: stat.sort_order });
    setShowStatForm(true);
  };

  const saveStat = async () => {
    if (!statForm.stat_key || !statForm.stat_value || !statForm.stat_label) {
      toast.error('All fields are required');
      return;
    }
    setSavingStat(true);
    if (editingStat) {
      const { error } = await supabase
        .from('site_stats')
        .update({ ...statForm, updated_at: new Date().toISOString() })
        .eq('id', editingStat.id);
      if (!error) {
        setSiteStatsList(prev => prev.map(s => s.id === editingStat.id ? { ...s, ...statForm } : s));
        toast.success('Stat updated');
        setShowStatForm(false);
      } else {
        toast.error('Failed to update stat');
      }
    } else {
      const { data, error } = await supabase
        .from('site_stats')
        .insert(statForm)
        .select()
        .single();
      if (!error && data) {
        setSiteStatsList(prev => [...prev, data as SiteStat].sort((a, b) => a.sort_order - b.sort_order));
        toast.success('Stat added');
        setShowStatForm(false);
      } else {
        toast.error(error?.message || 'Failed to add stat');
      }
    }
    setSavingStat(false);
  };

  const deleteStat = async (id: string) => {
    const { error } = await supabase.from('site_stats').delete().eq('id', id);
    if (!error) {
      setSiteStatsList(prev => prev.filter(s => s.id !== id));
      toast.success('Stat removed');
    }
  };

  const saveContactSettings = async () => {
    setSavingContact(true);
    if (contactSettings) {
      const { error } = await supabase
        .from('contact_settings')
        .update({ ...contactForm, updated_at: new Date().toISOString() })
        .eq('id', contactSettings.id);
      if (!error) {
        setContactSettings(prev => prev ? { ...prev, ...contactForm } : prev);
        toast.success('Contact settings saved');
      } else {
        toast.error('Failed to save contact settings');
      }
    } else {
      const { data, error } = await supabase
        .from('contact_settings')
        .insert(contactForm)
        .select()
        .maybeSingle();
      if (!error && data) {
        setContactSettings(data as ContactSettings);
        toast.success('Contact settings saved');
      } else {
        toast.error('Failed to save contact settings');
      }
    }
    setSavingContact(false);
  };

  const updateCommissionStatus = async (commissionId: string, status: 'paid' | 'waived' | 'disputed') => {
    const { error } = await supabase.from('commissions').update({ status }).eq('id', commissionId);
    if (!error) {
      setCommissions(prev => prev.map(c => c.id === commissionId ? { ...c, status } : c));
      toast.success(`Commission marked as ${status}`);
    }
  };

  const activateSubscription = async (userId: string, tier: 'pro', role: string, paymentId?: string) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      tier,
      role,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_id: paymentId || null,
    }, { onConflict: 'user_id,role' });
    if (!error) {
      await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Pro Subscription Activated!',
        message: 'Your Pro subscription is now active. Enjoy unlimited job access and boosted visibility.',
        type: 'subscription',
      });
      toast.success('Subscription activated and user notified');
      loadData();
    }
  };

  const TABS: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: stats.pendingPayments },
    { id: 'payment_methods', label: 'Payment Methods', icon: DollarSign },
    { id: 'subscriptions', label: 'Subscriptions', icon: Crown, badge: stats.activeSubscriptions },
    { id: 'commissions', label: 'Commissions', icon: PercentSquare },
    { id: 'breakdowns', label: 'Breakdowns', icon: AlertTriangle },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'site_stats', label: 'Site Stats', icon: TrendingUp },
    { id: 'contact', label: 'Contact Info', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Platform management and moderation</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8 border-b border-gray-800 pb-4 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative ${
                tab === t.id ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {t.badge && t.badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Mechanics', value: stats.mechanics, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: 'Pending Payments', value: stats.pendingPayments, icon: CreditCard, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Breakdown Requests', value: stats.breakdowns, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                    { label: 'Parts Listed', value: stats.parts, icon: Package, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Commission Revenue', value: `$${stats.totalCommissions.toFixed(0)}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Rentals Listed', value: stats.rentals, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Role Distribution</h3>
                  {(['owner', 'mechanic', 'supplier', 'rental_provider'] as const).map(role => {
                    const count = users.filter(u => u.role === role).length;
                    const pct = stats.users ? Math.round((count / stats.users) * 100) : 0;
                    return (
                      <div key={role} className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 capitalize">{role.replace('_', ' ')}</span>
                          <span className="text-gray-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {tab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between gap-4 ${u.is_suspended ? 'border-red-900/50' : 'border-gray-800'}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full capitalize hidden sm:inline">{u.role?.replace('_', ' ')}</span>
                      {!u.is_approved && <span className="text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full hidden sm:inline">Pending Approval</span>}
                      {u.is_suspended && <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full hidden sm:inline">Suspended</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!u.is_approved && (
                        <button onClick={() => approveProfile(u.id)} className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors">
                          Approve Profile
                        </button>
                      )}
                      <button
                        onClick={() => toggleSuspend(u.id, u.is_suspended)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          u.is_suspended
                            ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'
                            : 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50'
                        }`}
                      >
                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === 'payments' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Pending', count: payments.filter(p => p.status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
                    { label: 'Approved', count: payments.filter(p => p.status === 'approved').length, color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
                    { label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length, color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                        <p className="text-gray-400 text-xs">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {payments.length === 0 ? (
                  <div className="text-center py-16">
                    <CreditCard className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No payments yet</h3>
                    <p className="text-gray-400">Payment submissions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map(payment => {
                      const statusStyles = {
                        pending: 'bg-yellow-900/50 text-yellow-400',
                        approved: 'bg-green-900/50 text-green-400',
                        rejected: 'bg-red-900/50 text-red-400',
                      };
                      const feeLabels: Record<string, string> = {
                        mechanic_contact: 'Mechanic Contact',
                        parts_inquiry: 'Parts Inquiry',
                        rental_inquiry: 'Rental Inquiry',
                        breakdown_post: 'Breakdown Post',
                      };
                      return (
                        <div key={payment.id} className={`bg-gray-900 border rounded-xl p-4 ${payment.status === 'pending' ? 'border-yellow-900/50' : 'border-gray-800'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-sm">
                                  {(payment as any).user?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{(payment as any).user?.name || 'Unknown'}</p>
                                  <p className="text-gray-500 text-xs">{(payment as any).user?.email}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs">Fee Type</p>
                                  <p className="text-gray-300">{feeLabels[payment.fee_type] || payment.fee_type}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Amount</p>
                                  <p className="text-yellow-400 font-semibold">${payment.amount.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Transaction ID</p>
                                  <p className="text-gray-300 font-mono text-xs">{payment.transaction_id || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Submitted</p>
                                  <p className="text-gray-300">{format(new Date(payment.created_at), 'MMM d, h:mm a')}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyles[payment.status]}`}>
                                {payment.status}
                              </span>
                              {payment.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => approvePayment(payment.id, payment.user_id, payment.fee_type)}
                                    className="flex items-center gap-1 text-xs bg-green-900/30 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => rejectPayment(payment.id, payment.user_id)}
                                    className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-900/50 transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'payment_methods' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold">Payment Methods</h3>
                    <p className="text-gray-400 text-sm mt-0.5">Configure payment options shown to users when paying commission fees</p>
                  </div>
                  <button
                    onClick={openAddMethod}
                    className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Method
                  </button>
                </div>

                {showMethodForm && (
                  <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold">{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h4>
                      <button onClick={() => setShowMethodForm(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Method Name *</label>
                        <input
                          type="text"
                          value={methodForm.method_name}
                          onChange={e => setMethodForm(p => ({ ...p, method_name: e.target.value }))}
                          placeholder="e.g. Bank Transfer, M-Pesa"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Provider / Bank</label>
                        <input
                          type="text"
                          value={methodForm.provider}
                          onChange={e => setMethodForm(p => ({ ...p, provider: e.target.value }))}
                          placeholder="e.g. First National Bank"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Account Name *</label>
                        <input
                          type="text"
                          value={methodForm.account_name}
                          onChange={e => setMethodForm(p => ({ ...p, account_name: e.target.value }))}
                          placeholder="e.g. EquipLink Ltd"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Account Number / Phone *</label>
                        <input
                          type="text"
                          value={methodForm.account_number}
                          onChange={e => setMethodForm(p => ({ ...p, account_number: e.target.value }))}
                          placeholder="e.g. 0012345678"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1">Payment Instructions (shown to users)</label>
                      <textarea
                        value={methodForm.instructions}
                        onChange={e => setMethodForm(p => ({ ...p, instructions: e.target.value }))}
                        rows={3}
                        placeholder="Step by step instructions for completing payment..."
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none resize-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowMethodForm(false)}
                        className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveMethod}
                        disabled={savingMethod}
                        className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {savingMethod ? 'Saving...' : 'Save Method'}
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethods.length === 0 && !showMethodForm ? (
                  <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
                    <DollarSign className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No payment methods yet</h3>
                    <p className="text-gray-400 mb-4">Add payment options for users to pay commission fees</p>
                    <button onClick={openAddMethod} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl transition-colors">
                      <Plus className="w-4 h-4" /> Add First Method
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map(method => (
                      <div key={method.id} className={`bg-gray-900 border rounded-xl p-4 ${method.is_active ? 'border-gray-800' : 'border-gray-800/50 opacity-60'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-semibold">{method.method_name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${method.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                                {method.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm">{method.provider}</p>
                            <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                              <div>
                                <span className="text-gray-500">Account: </span>
                                <span className="text-gray-300">{method.account_name}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Number: </span>
                                <span className="text-gray-300 font-mono">{method.account_number}</span>
                              </div>
                            </div>
                            {method.instructions && (
                              <p className="text-gray-500 text-xs mt-1.5 line-clamp-1">{method.instructions}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => toggleMethodActive(method.id, method.is_active)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                method.is_active
                                  ? 'border-gray-700 text-gray-400 hover:border-gray-500'
                                  : 'border-green-800 text-green-400 bg-green-900/20 hover:bg-green-900/40'
                              }`}
                            >
                              {method.is_active ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => openEditMethod(method)}
                              className="text-gray-400 hover:text-yellow-400 transition-colors p-1.5 rounded-lg hover:bg-yellow-400/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMethod(method.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <Crown className="w-5 h-5 text-amber-400 mb-2" />
                    <p className="text-2xl font-black text-amber-400">{stats.activeSubscriptions}</p>
                    <p className="text-gray-400 text-xs">Active Pro Subscriptions</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <DollarSign className="w-5 h-5 text-green-400 mb-2" />
                    <p className="text-2xl font-black text-green-400">
                      ${(subscriptions.reduce((s, sub) => {
                        const plan = subPlans.find(p => p.tier === sub.tier && p.role === sub.role);
                        return s + (plan?.price_monthly ?? 0);
                      }, 0)).toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">Monthly Recurring Revenue</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <Users className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-2xl font-black text-blue-400">
                      {users.filter(u => u.subscription_tier === 'pro').length}
                    </p>
                    <p className="text-gray-400 text-xs">Pro Users</p>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-gray-800">
                    <h3 className="text-white font-semibold">Subscription Plans</h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {subPlans.map(plan => (
                      <div key={plan.id} className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{plan.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${plan.tier === 'pro' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
                              {plan.tier}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full capitalize">{plan.role}</span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5">
                            ${plan.price_monthly}/month
                            {plan.job_access_limit && ` · ${plan.job_access_limit} jobs/month`}
                            {plan.lead_cost_per_job && ` · $${plan.lead_cost_per_job}/lead`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800">
                    <h3 className="text-white font-semibold">Active Subscriptions</h3>
                  </div>
                  {subscriptions.length === 0 ? (
                    <div className="py-12 text-center">
                      <Crown className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-400">No active subscriptions yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {subscriptions.map(sub => (
                        <div key={sub.id} className="px-5 py-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-white font-medium">{(sub as { user?: { name?: string } }).user?.name}</p>
                            <p className="text-gray-400 text-xs">{(sub as { user?: { email?: string } }).user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-full capitalize">{sub.tier} · {sub.role}</span>
                              {sub.expires_at && (
                                <span className="text-xs text-gray-500">Expires {format(new Date(sub.expires_at), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${
                            sub.status === 'active' ? 'bg-green-900/30 text-green-400' :
                            sub.status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-blue-900/10 border border-blue-800/30 rounded-xl p-4 text-sm text-gray-400">
                  To activate a Pro subscription for a payment: go to Payments tab, approve the subscription_upgrade payment — then manually activate it here if needed.
                </div>
              </motion.div>
            )}

            {tab === 'commissions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-2xl font-black text-gray-300">{commissions.length}</p>
                    <p className="text-gray-400 text-xs">Total Commissions</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-2xl font-black text-green-400">${stats.totalCommissions.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">Total Commission Revenue</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-2xl font-black text-yellow-400">{commissions.filter(c => c.status === 'pending').length}</p>
                    <p className="text-gray-400 text-xs">Pending</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-2xl font-black text-blue-400">{commissions.filter(c => c.status === 'paid').length}</p>
                    <p className="text-gray-400 text-xs">Paid Out</p>
                  </div>
                </div>

                {commissions.length === 0 ? (
                  <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
                    <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No commissions yet</p>
                    <p className="text-gray-400 text-sm">Commissions are generated when mechanics complete jobs.</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-800">
                      {commissions.map(c => (
                        <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">
                              {(c.breakdown_request as { machine_model?: string })?.machine_model || `Job #${c.breakdown_request_id.slice(0, 8)}`}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {(c.technician as { name?: string })?.name} · {c.commission_rate}% ·
                              {format(new Date(c.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-white text-sm font-medium">${c.job_amount.toFixed(2)}</p>
                            <p className="text-green-400 text-xs">+${c.commission_amount.toFixed(2)} commission</p>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              c.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                              c.status === 'paid' ? 'bg-green-900/30 text-green-400' :
                              c.status === 'disputed' ? 'bg-red-900/30 text-red-400' :
                              'bg-gray-800 text-gray-400'
                            }`}>{c.status}</span>
                            {c.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => updateCommissionStatus(c.id, 'paid')} className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2 py-0.5 rounded hover:bg-green-900/50 transition-colors">
                                  Mark Paid
                                </button>
                                <button onClick={() => updateCommissionStatus(c.id, 'waived')} className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded hover:bg-gray-700 transition-colors">
                                  Waive
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'breakdowns' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {breakdowns.map(bd => (
                  <div key={bd.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{bd.machine_model} — {bd.machine_type}</p>
                        <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{bd.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>By: {(bd as any).owner?.name}</span>
                          <span>·</span>
                          <span>{format(new Date(bd.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          bd.urgency === 'critical' ? 'bg-red-900/50 text-red-400' :
                          bd.urgency === 'high' ? 'bg-orange-900/50 text-orange-400' :
                          'bg-yellow-900/50 text-yellow-400'
                        }`}>{bd.urgency}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          bd.status === 'resolved' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                        }`}>{bd.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === 'listings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {adminProfile && <AdminListings adminId={adminProfile.id} />}
              </motion.div>
            )}

            {tab === 'site_stats' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold">Landing Page Statistics</h3>
                    <p className="text-gray-400 text-sm mt-0.5">Manage the numbers displayed on the landing page hero section</p>
                  </div>
                  <button
                    onClick={openAddStat}
                    className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Stat
                  </button>
                </div>

                {showStatForm && (
                  <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold">{editingStat ? 'Edit Stat' : 'Add Stat'}</h4>
                      <button onClick={() => setShowStatForm(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Key (unique identifier) *</label>
                        <input
                          type="text"
                          value={statForm.stat_key}
                          onChange={e => setStatForm(p => ({ ...p, stat_key: e.target.value }))}
                          placeholder="e.g. certified_mechanics"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Display Value *</label>
                        <input
                          type="text"
                          value={statForm.stat_value}
                          onChange={e => setStatForm(p => ({ ...p, stat_value: e.target.value }))}
                          placeholder="e.g. 12,000+"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Label *</label>
                        <input
                          type="text"
                          value={statForm.stat_label}
                          onChange={e => setStatForm(p => ({ ...p, stat_label: e.target.value }))}
                          placeholder="e.g. Certified Mechanics"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Sort Order</label>
                        <input
                          type="number"
                          value={statForm.sort_order}
                          onChange={e => setStatForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowStatForm(false)}
                        className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveStat}
                        disabled={savingStat}
                        className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {savingStat ? 'Saving...' : 'Save Stat'}
                      </button>
                    </div>
                  </div>
                )}

                {siteStatsList.length === 0 && !showStatForm ? (
                  <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
                    <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No stats configured</h3>
                    <p className="text-gray-400 mb-4">Add statistics to display on the landing page</p>
                    <button onClick={openAddStat} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl transition-colors">
                      <Plus className="w-4 h-4" /> Add First Stat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {siteStatsList.map(stat => (
                      <div key={stat.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="text-center min-w-[80px]">
                              <p className="text-xl font-black text-yellow-400">{stat.stat_value}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{stat.stat_label}</p>
                            </div>
                            <div className="text-xs text-gray-600 font-mono">{stat.stat_key}</div>
                            <div className="text-xs text-gray-600">Order: {stat.sort_order}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => openEditStat(stat)}
                              className="text-gray-400 hover:text-yellow-400 transition-colors p-1.5 rounded-lg hover:bg-yellow-400/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStat(stat.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'contact' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Contact Information</h3>
                      <p className="text-gray-400 text-sm mt-0.5">This information is displayed in the site footer</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-yellow-400" /> Support Email
                        </label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="support@equiplink.com"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-yellow-400" /> Phone Number
                        </label>
                        <input
                          type="text"
                          value={contactForm.phone}
                          onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+1 (800) 555-0123"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400" /> Address
                      </label>
                      <input
                        type="text"
                        value={contactForm.address}
                        onChange={e => setContactForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="City, State ZIP"
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                      />
                    </div>

                    <div className="border-t border-gray-800 pt-5">
                      <h4 className="text-gray-300 text-sm font-medium mb-4 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-yellow-400" /> Social Media Links
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-500 text-xs font-medium mb-1.5">Facebook URL</label>
                          <input
                            type="url"
                            value={contactForm.facebook_url}
                            onChange={e => setContactForm(p => ({ ...p, facebook_url: e.target.value }))}
                            placeholder="https://facebook.com/..."
                            className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs font-medium mb-1.5">Twitter / X URL</label>
                          <input
                            type="url"
                            value={contactForm.twitter_url}
                            onChange={e => setContactForm(p => ({ ...p, twitter_url: e.target.value }))}
                            placeholder="https://twitter.com/..."
                            className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs font-medium mb-1.5">LinkedIn URL</label>
                          <input
                            type="url"
                            value={contactForm.linkedin_url}
                            onChange={e => setContactForm(p => ({ ...p, linkedin_url: e.target.value }))}
                            placeholder="https://linkedin.com/..."
                            className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 text-sm outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={saveContactSettings}
                        disabled={savingContact}
                        className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-semibold px-6 py-2.5 rounded-xl transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {savingContact ? 'Saving...' : 'Save Contact Info'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
