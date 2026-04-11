import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Package, Truck, AlertTriangle, CheckCircle, XCircle,
  Activity, BarChart3, CreditCard, DollarSign, Clock, Plus, Trash2,
  Pencil, X, Save, Mail, Phone, MapPin, Globe, TrendingUp, Crown,
  Wallet, PercentSquare, Settings, FileText, Search, BadgeCheck,
  ShieldAlert, Star, Wrench, ChevronRight, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile, BreakdownRequest, UserPayment, PaymentMethod, Commission, Subscription, SubscriptionPlan, PlatformSetting, SupplierDocument } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminListings from './AdminListings';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

type AdminTab =
  | 'overview'
  | 'verification'
  | 'trade_licenses'
  | 'users'
  | 'payments'
  | 'payment_methods'
  | 'subscriptions'
  | 'commissions'
  | 'breakdowns'
  | 'listings'
  | 'platform_settings'
  | 'site_stats'
  | 'contact'
  | 'legal';

interface MechanicWithProfile {
  id: string;
  user_id: string;
  specializations: string[];
  years_experience: number;
  service_area: string | null;
  supported_brands: string[];
  hourly_rate: number | null;
  is_available: boolean;
  is_verified: boolean;
  verified_at: string | null;
  verification_notes: string | null;
  rating: number;
  total_reviews: number;
  created_at: string;
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    bio: string | null;
    avatar_url: string | null;
    is_approved: boolean;
    is_suspended: boolean;
    contact_phone: string | null;
    contact_email: string | null;
    contact_address: string | null;
    contact_complete: boolean;
  } | null;
}

interface LegalSettings {
  id: string;
  privacy_email: string;
  legal_email: string;
}

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

const FEE_LABELS: Record<string, string> = {
  mechanic_contact: 'Mechanic Contact',
  parts_inquiry: 'Parts Inquiry',
  rental_inquiry: 'Rental Inquiry',
  breakdown_post: 'Breakdown Post',
  subscription_upgrade: 'Subscription Upgrade',
  wallet_topup: 'Wallet Top-up',
};

export default function Admin() {
  const { profile: adminProfile, session } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRequest[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subPlans, setSubPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState({
    users: 0, mechanics: 0, breakdowns: 0, parts: 0, rentals: 0,
    pendingPayments: 0, activeSubscriptions: 0, totalCommissions: 0,
    pendingVerification: 0, verifiedMechanics: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mechanicProfiles, setMechanicProfiles] = useState<MechanicWithProfile[]>([]);
  const [mechSearch, setMechSearch] = useState('');
  const [verifyFilter, setVerifyFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [verificationNoteId, setVerificationNoteId] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState('');

  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState({
    method_name: '', provider: '', account_name: '', account_number: '', instructions: '', sort_order: 0,
  });
  const [savingMethod, setSavingMethod] = useState(false);

  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [contactForm, setContactForm] = useState({ email: '', phone: '', address: '', facebook_url: '', twitter_url: '', linkedin_url: '' });
  const [savingContact, setSavingContact] = useState(false);

  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [platformSettingsForm, setPlatformSettingsForm] = useState<Record<string, string>>({});
  const [savingPlatformSettings, setSavingPlatformSettings] = useState(false);

  const [siteStatsList, setSiteStatsList] = useState<SiteStat[]>([]);
  const [showStatForm, setShowStatForm] = useState(false);
  const [editingStat, setEditingStat] = useState<SiteStat | null>(null);
  const [statForm, setStatForm] = useState({ stat_key: '', stat_value: '', stat_label: '', sort_order: 0 });
  const [savingStat, setSavingStat] = useState(false);

  const [legalSettings, setLegalSettings] = useState<LegalSettings | null>(null);
  const [legalForm, setLegalForm] = useState({ privacy_email: '', legal_email: '' });
  const [savingLegal, setSavingLegal] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [supplierDocs, setSupplierDocs] = useState<SupplierDocument[]>([]);
  const [docFilter, setDocFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

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
      { data: platformSettingsData },
      { data: legalSettingsData },
      { data: mechanicProfilesData },
      { data: supplierDocsData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name)')
        .order('created_at', { ascending: false }).limit(30),
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
      supabase.from('platform_settings').select('*').order('setting_key'),
      supabase.from('legal_settings').select('*').maybeSingle(),
      supabase.from('mechanic_profiles')
        .select('*, profile:profiles!mechanic_profiles_user_id_fkey(id,name,email,phone,location,bio,avatar_url,is_approved,is_suspended,contact_phone,contact_email,contact_address,contact_complete)')
        .order('created_at', { ascending: false }),
      supabase.from('supplier_documents')
        .select('*, user:profiles!supplier_documents_user_id_fkey(name, email, phone, location)')
        .order('created_at', { ascending: false }),
    ]);

    const allUsers = (usersData || []) as Profile[];
    const allPayments = (paymentsData || []) as UserPayment[];
    const allCommissions = (commissionsData || []) as Commission[];
    const mechProfiles = (mechanicProfilesData || []) as MechanicWithProfile[];

    setUsers(allUsers);
    setBreakdowns((bds || []) as BreakdownRequest[]);
    setPayments(allPayments);
    setPaymentMethods((methodsRes.data || []) as PaymentMethod[]);
    setCommissions(allCommissions);
    setSubscriptions((subscriptionsData || []) as Subscription[]);
    setSubPlans((subPlansData || []) as SubscriptionPlan[]);
    setMechanicProfiles(mechProfiles);
    setSupplierDocs((supplierDocsData || []) as SupplierDocument[]);

    const ps = (platformSettingsData || []) as PlatformSetting[];
    setPlatformSettings(ps);
    const psForm: Record<string, string> = {};
    ps.forEach(s => { psForm[s.setting_key] = String(s.setting_value); });
    setPlatformSettingsForm(psForm);

    const contactRes = contactData as ContactSettings | null;
    if (contactRes) {
      setContactSettings(contactRes);
      setContactForm({ email: contactRes.email || '', phone: contactRes.phone || '', address: contactRes.address || '', facebook_url: contactRes.facebook_url || '', twitter_url: contactRes.twitter_url || '', linkedin_url: contactRes.linkedin_url || '' });
    }

    const legalRes = legalSettingsData as LegalSettings | null;
    if (legalRes) {
      setLegalSettings(legalRes);
      setLegalForm({ privacy_email: legalRes.privacy_email || '', legal_email: legalRes.legal_email || '' });
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
      totalCommissions: allCommissions.reduce((s, c) => s + c.commission_amount, 0),
      pendingVerification: mechProfiles.filter(m => !m.is_verified && m.profile?.is_approved && !m.profile?.is_suspended).length,
      verifiedMechanics: mechProfiles.filter(m => m.is_verified).length,
    });

    setLoading(false);
  };

  const verifyMechanic = async (mechId: string, userId: string, approve: boolean) => {
    const notes = verificationNote.trim() || null;
    const { error } = await supabase.from('mechanic_profiles').update({
      is_verified: approve,
      verified_at: approve ? new Date().toISOString() : null,
      verified_by: adminProfile?.id ?? null,
      verification_notes: notes,
    }).eq('id', mechId);

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: approve ? 'Profile Verified — Now on Marketplace!' : 'Profile Verification Update',
        message: approve
          ? 'Congratulations! Your mechanic profile has been verified by the admin. You are now visible on the EquipLink marketplace.'
          : `Your profile verification was not approved. ${notes ? `Reason: ${notes}` : 'Please complete your profile and reapply.'}`,
        type: approve ? 'success' : 'warning',
      });
      setMechanicProfiles(prev => prev.map(m =>
        m.id === mechId
          ? { ...m, is_verified: approve, verified_at: approve ? new Date().toISOString() : null, verification_notes: notes }
          : m
      ));
      setStats(prev => ({
        ...prev,
        verifiedMechanics: approve ? prev.verifiedMechanics + 1 : Math.max(0, prev.verifiedMechanics - 1),
        pendingVerification: approve ? Math.max(0, prev.pendingVerification - 1) : prev.pendingVerification,
      }));
      setVerificationNoteId(null);
      setVerificationNote('');
      toast.success(approve ? 'Mechanic verified and notified' : 'Verification declined');
    } else {
      toast.error('Action failed');
    }
  };

  const toggleSuspend = async (userId: string, suspended: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: !suspended }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: !suspended } : u));
      toast.success(suspended ? 'User unsuspended' : 'User suspended');
    }
  };

  const approveProfile = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Account Approved',
        message: 'Your account has been approved. Complete your mechanic profile to get verified and appear on the marketplace.',
        type: 'success',
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
      setMechanicProfiles(prev => prev.map(m => m.user_id === userId && m.profile ? { ...m, profile: { ...m.profile, is_approved: true } } : m));
      toast.success('Account approved');
    }
  };

  const approvePayment = async (paymentId: string, userId: string, feeType: string) => {
    const payment = payments.find(p => p.id === paymentId);
    const { error } = await supabase.from('user_payments').update({
      status: 'approved', reviewed_by: adminProfile?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', paymentId);

    if (!error) {
      if (feeType === 'subscription_upgrade') {
        const user = users.find(u => u.id === userId);
        const subRole = user?.role === 'mechanic' ? 'mechanic' : user?.role === 'supplier' ? 'supplier' : user?.role === 'rental_provider' ? 'rental_provider' : 'owner';
        await activateSubscription(userId, 'pro', subRole, paymentId);
      } else if (feeType === 'wallet_topup') {
        const paymentAmount = payment?.amount ?? 0;
        const { data: walletData } = await supabase.from('wallets').select('id, balance, total_purchased').eq('user_id', userId).maybeSingle();
        if (walletData) {
          const newBalance = walletData.balance + paymentAmount;
          await supabase.from('wallets').update({ balance: newBalance, total_purchased: walletData.total_purchased + paymentAmount }).eq('id', walletData.id);
          await supabase.from('wallet_transactions').insert({ wallet_id: walletData.id, user_id: userId, type: 'purchase', amount: paymentAmount, balance_after: newBalance, description: `Wallet top-up (${paymentAmount.toLocaleString()} ETB)`, payment_id: paymentId, status: 'completed' });
          await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
          await supabase.from('notifications').insert({ user_id: userId, title: 'Wallet Credited', message: `${paymentAmount.toLocaleString()} ETB has been added to your wallet.`, type: 'success' });
        }
      } else if (payment?.provider_id) {
        const contactType = feeType === 'mechanic_contact' ? 'mechanic' : feeType === 'parts_inquiry' ? 'supplier' : feeType === 'rental_inquiry' ? 'rental' : 'breakdown';
        await supabase.from('contact_history').upsert({ user_id: userId, provider_id: payment.provider_id, contact_type: contactType, payment_id: paymentId }, { onConflict: 'user_id,provider_id,contact_type' });
        await supabase.from('notifications').insert({ user_id: userId, title: 'Payment Approved — Contact Unlocked', message: 'Your payment has been approved. You can now contact the provider.', type: 'success', related_id: payment.provider_id });
      } else {
        await supabase.from('notifications').insert({ user_id: userId, title: 'Payment Approved', message: 'Your payment has been approved.', type: 'success' });
      }
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'approved' as const } : p));
      setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
      toast.success('Payment approved');
    }
  };

  const rejectPayment = async (paymentId: string, userId: string) => {
    const { error } = await supabase.from('user_payments').update({ status: 'rejected', reviewed_by: adminProfile?.id, reviewed_at: new Date().toISOString() }).eq('id', paymentId);
    if (!error) {
      await supabase.from('notifications').insert({ user_id: userId, title: 'Payment Rejected', message: 'Your payment could not be verified. Please contact support.', type: 'warning' });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'rejected' as const } : p));
      setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
      toast.success('Payment rejected');
    }
  };

  const activateSubscription = async (userId: string, tier: 'pro', role: string, paymentId?: string) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const { error } = await supabase.from('subscriptions').upsert({ user_id: userId, tier, role, status: 'active', started_at: new Date().toISOString(), expires_at: expiresAt.toISOString(), payment_id: paymentId || null }, { onConflict: 'user_id,role' });
    if (!error) {
      await supabase.from('profiles').update({ subscription_tier: tier, pro_badge: true, pro_expires_at: expiresAt.toISOString() }).eq('id', userId);
      await supabase.from('notifications').insert({ user_id: userId, title: 'Pro Subscription Activated!', message: 'Your Pro subscription is now active. Enjoy unlimited access and boosted visibility.', type: 'success' });
      toast.success('Pro subscription activated');
      loadData();
    }
  };

  const saveMethod = async () => {
    if (!methodForm.method_name || !methodForm.account_number) { toast.error('Method name and account number required'); return; }
    setSavingMethod(true);
    if (editingMethod) {
      const { error } = await supabase.from('payment_methods').update({ ...methodForm, updated_at: new Date().toISOString() }).eq('id', editingMethod.id);
      if (!error) { setPaymentMethods(prev => prev.map(m => m.id === editingMethod.id ? { ...m, ...methodForm } : m)); toast.success('Updated'); setShowMethodForm(false); } else toast.error('Failed');
    } else {
      const { data, error } = await supabase.from('payment_methods').insert(methodForm).select().single();
      if (!error && data) { setPaymentMethods(prev => [...prev, data as PaymentMethod]); toast.success('Added'); setShowMethodForm(false); } else toast.error('Failed');
    }
    setSavingMethod(false);
  };

  const deleteMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (!error) { setPaymentMethods(prev => prev.filter(m => m.id !== id)); toast.success('Removed'); }
  };

  const toggleMethodActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('payment_methods').update({ is_active: !current }).eq('id', id);
    if (!error) setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m));
  };

  const saveStat = async () => {
    if (!statForm.stat_key || !statForm.stat_value || !statForm.stat_label) { toast.error('All fields required'); return; }
    setSavingStat(true);
    if (editingStat) {
      const { error } = await supabase.from('site_stats').update({ ...statForm, updated_at: new Date().toISOString() }).eq('id', editingStat.id);
      if (!error) { setSiteStatsList(prev => prev.map(s => s.id === editingStat.id ? { ...s, ...statForm } : s)); toast.success('Updated'); setShowStatForm(false); } else toast.error('Failed');
    } else {
      const { data, error } = await supabase.from('site_stats').insert(statForm).select().single();
      if (!error && data) { setSiteStatsList(prev => [...prev, data as SiteStat].sort((a, b) => a.sort_order - b.sort_order)); toast.success('Added'); setShowStatForm(false); } else toast.error(error?.message || 'Failed');
    }
    setSavingStat(false);
  };

  const deleteStat = async (id: string) => {
    const { error } = await supabase.from('site_stats').delete().eq('id', id);
    if (!error) { setSiteStatsList(prev => prev.filter(s => s.id !== id)); toast.success('Removed'); }
  };

  const saveContactSettings = async () => {
    setSavingContact(true);
    if (contactSettings) {
      const { error } = await supabase.from('contact_settings').update({ ...contactForm, updated_at: new Date().toISOString() }).eq('id', contactSettings.id);
      if (!error) { setContactSettings(prev => prev ? { ...prev, ...contactForm } : prev); toast.success('Saved'); } else toast.error('Failed');
    } else {
      const { data, error } = await supabase.from('contact_settings').insert(contactForm).select().maybeSingle();
      if (!error && data) { setContactSettings(data as ContactSettings); toast.success('Saved'); } else toast.error('Failed');
    }
    setSavingContact(false);
  };

  const saveLegalSettings = async () => {
    setSavingLegal(true);
    if (legalSettings) {
      const { error } = await supabase.from('legal_settings').update({ ...legalForm, updated_at: new Date().toISOString() }).eq('id', legalSettings.id);
      if (!error) { setLegalSettings(prev => prev ? { ...prev, ...legalForm } : prev); toast.success('Saved'); } else toast.error('Failed');
    } else {
      const { data, error } = await supabase.from('legal_settings').insert(legalForm).select().maybeSingle();
      if (!error && data) { setLegalSettings(data as LegalSettings); toast.success('Saved'); } else toast.error('Failed');
    }
    setSavingLegal(false);
  };

  const savePlatformSettings = async () => {
    setSavingPlatformSettings(true);
    for (const [key, val] of Object.entries(platformSettingsForm)) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        await supabase.from('platform_settings').update({ setting_value: num, updated_by: adminProfile?.id, updated_at: new Date().toISOString() }).eq('setting_key', key);
      }
    }
    await loadData();
    toast.success('Platform settings saved');
    setSavingPlatformSettings(false);
  };

  const updateCommissionStatus = async (id: string, status: 'paid' | 'waived' | 'disputed') => {
    const { error } = await supabase.from('commissions').update({ status }).eq('id', id);
    if (!error) { setCommissions(prev => prev.map(c => c.id === id ? { ...c, status } : c)); toast.success(`Commission marked as ${status}`); }
  };

  const filteredMechanics = mechanicProfiles.filter(m => {
    const s = mechSearch.toLowerCase();
    const matchSearch = !s || m.profile?.name?.toLowerCase().includes(s) || m.profile?.email?.toLowerCase().includes(s) || m.profile?.location?.toLowerCase().includes(s);
    const matchFilter =
      verifyFilter === 'all' ? true :
      verifyFilter === 'pending' ? (!m.is_verified && m.profile?.is_approved && !m.profile?.is_suspended) :
      verifyFilter === 'verified' ? m.is_verified :
      verifyFilter === 'rejected' ? (!m.is_verified && m.profile?.is_approved && m.verification_notes != null) :
      true;
    return matchSearch && matchFilter;
  });

  const approveTradeLicense = async (doc: SupplierDocument) => {
    const { error } = await supabase.from('supplier_documents').update({
      status: 'approved', reviewed_by: adminProfile?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', doc.id);
    if (!error) {
      await supabase.from('profiles').update({ trade_license_status: 'approved' }).eq('id', doc.user_id);
      await supabase.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Trade License Approved',
        message: 'Your trade license has been verified. You can now list spare parts on EquipLink.',
        type: 'success',
      });
      setSupplierDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'approved' as const } : d));
      toast.success('Trade license approved');
    } else { toast.error('Failed to approve'); }
  };

  const rejectTradeLicense = async (doc: SupplierDocument, reason: string) => {
    const { error } = await supabase.from('supplier_documents').update({
      status: 'rejected', reviewed_by: adminProfile?.id, reviewed_at: new Date().toISOString(), rejection_reason: reason,
    }).eq('id', doc.id);
    if (!error) {
      await supabase.from('profiles').update({ trade_license_status: 'rejected' }).eq('id', doc.user_id);
      await supabase.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Trade License Rejected',
        message: `Your trade license was not approved. ${reason ? `Reason: ${reason}` : 'Please re-submit a valid document.'}`,
        type: 'warning',
      });
      setSupplierDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'rejected' as const, rejection_reason: reason } : d));
      setRejectingDocId(null);
      setRejectionReason('');
      toast.success('Trade license rejected');
    } else { toast.error('Failed to reject'); }
  };

  const getUserMissingFields = (u: Profile): string[] => {
    const missing: string[] = [];
    if (!u.phone) missing.push('Phone');
    if (!u.location) missing.push('Location');
    if (!u.bio) missing.push('Bio');
    if (!u.contact_phone && !u.contact_email) missing.push('Business contact');
    if (!u.is_verified) missing.push('Email not verified');
    return missing;
  };

  const filteredUsers = users.filter(u => {
    const s = userSearch.toLowerCase();
    const matchSearch = !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    const matchRole = userRoleFilter === 'all' || userRoleFilter === 'incomplete' || u.role === userRoleFilter;
    const matchIncomplete = userRoleFilter !== 'incomplete' || (getUserMissingFields(u).length > 0 && u.role !== 'admin');
    return matchSearch && matchRole && matchIncomplete;
  });

  const sendReminder = async (u: Profile) => {
    if (!session?.access_token) { toast.error('Session expired. Please log in again.'); return; }
    setSendingReminderId(u.id);
    const missing = getUserMissingFields(u);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-profile-reminder`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: u.id,
            name: u.name,
            email: u.email,
            missingFields: missing,
          }),
        }
      );
      if (res.ok) {
        toast.success(`Reminder sent to ${u.name}`);
      } else {
        const errBody = await res.json().catch(() => ({}));
        toast.error(errBody?.error || 'Failed to send reminder');
      }
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminderId(null);
    }
  };

  const TABS: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'verification', label: 'Verify Mechanics', icon: BadgeCheck, badge: stats.pendingVerification },
    { id: 'trade_licenses', label: 'Trade Licenses', icon: FileText, badge: supplierDocs.filter(d => d.status === 'pending').length },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: stats.pendingPayments },
    { id: 'payment_methods', label: 'Payment Methods', icon: DollarSign },
    { id: 'subscriptions', label: 'Subscriptions', icon: Crown, badge: stats.activeSubscriptions },
    { id: 'commissions', label: 'Commissions', icon: PercentSquare },
    { id: 'breakdowns', label: 'Breakdowns', icon: AlertTriangle },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'platform_settings', label: 'Platform Fees', icon: Settings },
    { id: 'site_stats', label: 'Site Stats', icon: TrendingUp },
    { id: 'contact', label: 'Contact Info', icon: Mail },
    { id: 'legal', label: 'Legal', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-900/30 border border-red-800/40 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Admin Panel</h1>
              <p className="text-gray-500 text-sm">EquipLink Platform Management</p>
            </div>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-xl text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 mb-8 border-b border-gray-800 pb-4 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all relative flex-shrink-0 ${
                tab === t.id
                  ? t.id === 'verification' ? 'bg-green-400 text-gray-900' : 'bg-yellow-400 text-gray-900'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ===== OVERVIEW ===== */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                      { label: 'Total Mechanics', value: stats.mechanics, icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                      { label: 'Verified Mechanics', value: stats.verifiedMechanics, icon: BadgeCheck, color: 'text-green-400', bg: 'bg-green-400/10' },
                      { label: 'Pending Verification', value: stats.pendingVerification, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                      { label: 'Pending Payments', value: stats.pendingPayments, icon: CreditCard, color: 'text-red-400', bg: 'bg-red-400/10' },
                      { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                      { label: 'Commission Revenue', value: `${stats.totalCommissions.toLocaleString()} ETB`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
                      { label: 'Breakdown Requests', value: stats.breakdowns, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                        <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" /> Role Distribution
                      </h3>
                      {(['owner', 'mechanic', 'supplier', 'rental_provider'] as const).map(role => {
                        const count = users.filter(u => u.role === role).length;
                        const pct = stats.users ? Math.round((count / stats.users) * 100) : 0;
                        const colors: Record<string, string> = { owner: 'bg-blue-500', mechanic: 'bg-yellow-400', supplier: 'bg-green-400', rental_provider: 'bg-orange-400' };
                        return (
                          <div key={role} className="mb-4">
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="text-gray-300 capitalize">{role.replace('_', ' ')}</span>
                              <span className="text-gray-500">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${colors[role]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-green-400" /> Mechanic Verification Status
                      </h3>
                      {[
                        { label: 'Verified & On Marketplace', value: stats.verifiedMechanics, color: 'text-green-400', bg: 'bg-green-400/10', icon: BadgeCheck },
                        { label: 'Pending Verification', value: stats.pendingVerification, color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Clock },
                        { label: 'Not Yet Approved', value: mechanicProfiles.filter(m => !m.profile?.is_approved).length, color: 'text-gray-400', bg: 'bg-gray-700/30', icon: ShieldAlert },
                      ].map(s => (
                        <div key={s.label} className={`flex items-center gap-3 p-3 ${s.bg} rounded-xl mb-3`}>
                          <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{s.label}</p>
                          </div>
                          <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                      <button
                        onClick={() => setTab('verification')}
                        className="w-full mt-2 flex items-center justify-center gap-2 text-green-400 hover:text-green-300 border border-green-800/40 hover:border-green-700 rounded-xl py-2.5 text-sm font-medium transition-colors"
                      >
                        Go to Verification <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== MECHANIC VERIFICATION ===== */}
              {tab === 'verification' && (
                <div className="space-y-5">
                  <div className="bg-green-950/20 border border-green-800/30 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-white font-bold text-lg">Mechanic Verification</h2>
                        <p className="text-gray-400 text-sm mt-0.5">
                          Only verified mechanics appear on the public marketplace. Review each profile, check credentials, and approve or decline. Mechanics are notified automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={mechSearch}
                        onChange={e => setMechSearch(e.target.value)}
                        placeholder="Search by name, email, or location..."
                        className="w-full bg-gray-900 border border-gray-700 focus:border-green-400 text-white placeholder-gray-500 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {(['pending', 'verified', 'all'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setVerifyFilter(f)}
                          className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${verifyFilter === f ? 'bg-green-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                          {f === 'pending' ? `Pending (${stats.pendingVerification})` : f === 'verified' ? `Verified (${stats.verifiedMechanics})` : 'All'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredMechanics.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                      <BadgeCheck className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No mechanics match this filter</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMechanics.map(m => {
                        const p = m.profile;
                        const missingFields: string[] = [];
                        if (!p?.phone && !p?.contact_phone) missingFields.push('Phone');
                        if (!p?.location && !m.service_area) missingFields.push('Location');
                        if (!p?.contact_complete) missingFields.push('Business contact info');
                        if ((m.specializations?.length ?? 0) === 0) missingFields.push('Specializations');
                        if (!m.years_experience) missingFields.push('Years of experience');
                        if (!p?.bio) missingFields.push('Bio');
                        const profileComplete = missingFields.length === 0;
                        const showNoteForm = verificationNoteId === m.id;

                        return (
                          <div
                            key={m.id}
                            className={`bg-gray-900 border rounded-2xl p-5 ${
                              m.is_verified ? 'border-green-800/40' :
                              !p?.is_approved ? 'border-gray-700' :
                              'border-orange-800/40'
                            }`}
                          >
                            <div className="flex items-start gap-4 flex-wrap">
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-lg overflow-hidden">
                                  {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p?.name?.charAt(0) || 'M'}
                                </div>
                                {m.is_verified && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5 text-gray-900" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-white font-bold">{p?.name || 'Unknown'}</p>
                                  {m.is_verified && <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-800/40 rounded-full"><BadgeCheck className="w-3 h-3" /> Verified — On Marketplace</span>}
                                  {!p?.is_approved && <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">Account not approved yet</span>}
                                  {p?.is_approved && !m.is_verified && <span className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 border border-orange-800/30 rounded-full">Awaiting Verification</span>}
                                  {p?.is_suspended && <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-800/30 rounded-full">Suspended</span>}
                                  {m.rating > 0 && <span className="flex items-center gap-0.5 text-xs text-yellow-400"><Star className="w-3 h-3 fill-yellow-400" /> {m.rating.toFixed(1)} ({m.total_reviews})</span>}
                                </div>
                                <p className="text-gray-500 text-xs">{p?.email}</p>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                                  {(p?.location || m.service_area) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p?.location || m.service_area}</span>}
                                  {m.years_experience > 0 && <span>{m.years_experience} yrs experience</span>}
                                  {m.hourly_rate && <span>{m.hourly_rate.toLocaleString()} ETB/hr</span>}
                                </div>

                                {(m.specializations?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {m.specializations.map(s => (
                                      <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg capitalize">{s}</span>
                                    ))}
                                  </div>
                                )}

                                {(m.supported_brands?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {m.supported_brands.map(b => (
                                      <span key={b} className="text-xs bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded-lg">{b}</span>
                                    ))}
                                  </div>
                                )}

                                {missingFields.length > 0 && (
                                  <div className="mt-3 p-3 bg-orange-950/30 border border-orange-800/30 rounded-xl">
                                    <p className="text-orange-400 text-xs font-semibold mb-1.5">Profile incomplete — missing:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {missingFields.map(f => <span key={f} className="text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded-full">{f}</span>)}
                                    </div>
                                  </div>
                                )}

                                {m.verification_notes && (
                                  <div className="mt-2 p-2.5 bg-gray-800 rounded-xl">
                                    <p className="text-gray-500 text-xs font-medium mb-0.5">Verification note:</p>
                                    <p className="text-gray-300 text-xs">{m.verification_notes}</p>
                                  </div>
                                )}

                                {m.verified_at && (
                                  <p className="text-gray-600 text-xs mt-2">Verified {formatDistanceToNow(new Date(m.verified_at), { addSuffix: true })}</p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                {!p?.is_approved && (
                                  <button
                                    onClick={() => approveProfile(m.user_id)}
                                    className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve Account
                                  </button>
                                )}

                                {p?.is_approved && !m.is_verified && (
                                  <>
                                    <button
                                      onClick={() => { setVerificationNoteId(m.id); setVerificationNote(''); }}
                                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${profileComplete ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                                    >
                                      <BadgeCheck className="w-3.5 h-3.5" /> {profileComplete ? 'Verify & List' : 'Verify Anyway'}
                                    </button>
                                    <button
                                      onClick={() => { setVerificationNoteId(m.id + '_reject'); setVerificationNote(''); }}
                                      className="text-xs bg-red-900/20 text-red-400 border border-red-800/50 px-3 py-1.5 rounded-lg hover:bg-red-900/40 transition-colors flex items-center gap-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Decline
                                    </button>
                                  </>
                                )}

                                {m.is_verified && (
                                  <button
                                    onClick={() => verifyMechanic(m.id, m.user_id, false)}
                                    className="text-xs bg-orange-900/20 text-orange-400 border border-orange-800/50 px-3 py-1.5 rounded-lg hover:bg-orange-900/40 transition-colors flex items-center gap-1"
                                  >
                                    <EyeOff className="w-3.5 h-3.5" /> Remove from Marketplace
                                  </button>
                                )}

                                <button
                                  onClick={() => toggleSuspend(m.user_id, p?.is_suspended ?? false)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${p?.is_suspended ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/20 text-red-400 border-red-800/50'}`}
                                >
                                  {p?.is_suspended ? 'Unsuspend' : 'Suspend'}
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {(showNoteForm || verificationNoteId === m.id + '_reject') && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t border-gray-800"
                                >
                                  <p className="text-gray-400 text-sm mb-2">
                                    {verificationNoteId === m.id + '_reject' ? 'Reason for declining (sent to mechanic):' : 'Optional verification note:'}
                                  </p>
                                  <textarea
                                    value={verificationNote}
                                    onChange={e => setVerificationNote(e.target.value)}
                                    placeholder={verificationNoteId === m.id + '_reject' ? 'e.g. Missing certifications, incomplete profile...' : 'e.g. Verified credentials, background check passed...'}
                                    rows={2}
                                    className="w-full bg-gray-800 border border-gray-700 focus:border-green-400 text-white placeholder-gray-500 rounded-xl py-2 px-3 text-sm outline-none resize-none transition-colors mb-3"
                                  />
                                  <div className="flex gap-2">
                                    {verificationNoteId === m.id && (
                                      <button
                                        onClick={() => verifyMechanic(m.id, m.user_id, true)}
                                        className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-400 text-gray-900 font-semibold px-4 py-2 rounded-xl transition-colors"
                                      >
                                        <BadgeCheck className="w-4 h-4" /> Confirm Verification
                                      </button>
                                    )}
                                    {verificationNoteId === m.id + '_reject' && (
                                      <button
                                        onClick={() => verifyMechanic(m.id, m.user_id, false)}
                                        className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" /> Confirm Decline
                                      </button>
                                    )}
                                    <button
                                      onClick={() => { setVerificationNoteId(null); setVerificationNote(''); }}
                                      className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-xl transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== TRADE LICENSES ===== */}
              {tab === 'trade_licenses' && (
                <div className="space-y-5">
                  <div className="bg-blue-950/20 border border-blue-800/30 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <FileText className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-white font-bold text-lg">Supplier Trade License Review</h2>
                        <p className="text-gray-400 text-sm mt-0.5">
                          Review trade license documents submitted by suppliers. The registered business name must match their account name. Approved suppliers can list parts on the marketplace.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setDocFilter(f)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${docFilter === f ? 'bg-blue-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                      >
                        {f === 'pending' ? `Pending (${supplierDocs.filter(d => d.status === 'pending').length})` : f === 'approved' ? `Approved (${supplierDocs.filter(d => d.status === 'approved').length})` : f === 'rejected' ? `Rejected (${supplierDocs.filter(d => d.status === 'rejected').length})` : 'All'}
                      </button>
                    ))}
                  </div>

                  {supplierDocs.filter(d => docFilter === 'all' || d.status === docFilter).length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                      <FileText className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No documents match this filter</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supplierDocs.filter(d => docFilter === 'all' || d.status === docFilter).map(doc => {
                        const supplierUser = doc.user as Profile | undefined;
                        const nameMatches = supplierUser?.name?.trim().toLowerCase() === doc.registered_name.trim().toLowerCase();
                        return (
                          <div key={doc.id} className={`bg-gray-900 border rounded-2xl overflow-hidden ${doc.status === 'pending' ? 'border-blue-800/40' : doc.status === 'approved' ? 'border-green-800/40' : 'border-red-800/40'}`}>
                            <div className="p-5">
                              <div className="flex items-start gap-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className="text-white font-bold">{supplierUser?.name || 'Unknown'}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${doc.status === 'pending' ? 'bg-blue-900/40 text-blue-400' : doc.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{doc.status}</span>
                                  </div>
                                  <p className="text-gray-500 text-xs">{supplierUser?.email}</p>

                                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs">Registered Name (on license)</p>
                                      <p className={`font-medium ${nameMatches ? 'text-green-400' : 'text-red-400'}`}>
                                        {doc.registered_name}
                                        {nameMatches ? <span className="text-green-500 text-xs ml-1">(matches)</span> : <span className="text-red-500 text-xs ml-1">(MISMATCH)</span>}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">Account Name</p>
                                      <p className="text-gray-300 font-medium">{supplierUser?.name}</p>
                                    </div>
                                    {doc.license_number && (
                                      <div>
                                        <p className="text-gray-500 text-xs">License Number</p>
                                        <p className="text-gray-300 font-mono text-xs">{doc.license_number}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-gray-500 text-xs">Submitted</p>
                                      <p className="text-gray-300 text-xs">{format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}</p>
                                    </div>
                                  </div>

                                  {doc.rejection_reason && (
                                    <div className="mt-3 p-2.5 bg-red-950/30 border border-red-800/30 rounded-xl">
                                      <p className="text-red-400 text-xs font-medium">Rejection reason:</p>
                                      <p className="text-red-300 text-xs mt-0.5">{doc.rejection_reason}</p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-shrink-0">
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img
                                      src={doc.file_url}
                                      alt="Trade License"
                                      className="w-40 h-28 object-cover rounded-xl border border-gray-700 hover:border-yellow-400 transition-colors cursor-pointer"
                                    />
                                    <p className="text-center text-gray-500 text-xs mt-1 hover:text-yellow-400 transition-colors">Click to view full</p>
                                  </a>
                                </div>
                              </div>

                              {doc.status === 'pending' && (
                                <div className="mt-4 pt-4 border-t border-gray-800">
                                  {rejectingDocId === doc.id ? (
                                    <div className="space-y-3">
                                      <p className="text-gray-400 text-sm">Reason for rejection:</p>
                                      <textarea
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        placeholder="e.g. Document is blurry, name doesn't match, expired license..."
                                        rows={2}
                                        className="w-full bg-gray-800 border border-gray-700 focus:border-red-400 text-white placeholder-gray-500 rounded-xl py-2 px-3 text-sm outline-none resize-none transition-colors"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => rejectTradeLicense(doc, rejectionReason)}
                                          className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
                                        >
                                          <XCircle className="w-4 h-4" /> Confirm Reject
                                        </button>
                                        <button
                                          onClick={() => { setRejectingDocId(null); setRejectionReason(''); }}
                                          className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-xl transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => approveTradeLicense(doc)}
                                        disabled={!nameMatches}
                                        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${nameMatches ? 'bg-green-500 hover:bg-green-400 text-gray-900' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                      >
                                        <CheckCircle className="w-4 h-4" /> {nameMatches ? 'Approve License' : 'Name mismatch - cannot approve'}
                                      </button>
                                      <button
                                        onClick={() => setRejectingDocId(doc.id)}
                                        className="flex items-center gap-1.5 text-sm bg-red-900/20 text-red-400 border border-red-800/50 px-4 py-2 rounded-xl hover:bg-red-900/40 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" /> Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== USERS ===== */}
              {tab === 'users' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors" />
                    </div>
                    <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="bg-gray-900 border border-gray-700 text-gray-300 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-yellow-400 transition-colors">
                      <option value="all">All Roles</option>
                      <option value="owner">Equipment Owner</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="supplier">Supplier</option>
                      <option value="rental_provider">Rental Provider</option>
                    </select>
                    <button
                      onClick={() => setUserRoleFilter(userRoleFilter === 'incomplete' ? 'all' : 'incomplete')}
                      className={`text-xs px-3.5 py-2.5 rounded-xl border transition-colors font-medium whitespace-nowrap ${userRoleFilter === 'incomplete' ? 'bg-orange-400 text-gray-900 border-orange-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
                    >
                      Incomplete Profiles
                    </button>
                  </div>

                  <div className="space-y-2">
                    {filteredUsers.map(u => (
                      <div key={u.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between gap-4 ${u.is_suspended ? 'border-red-900/50' : 'border-gray-800'}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
                            {u.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{u.name}</p>
                            <p className="text-gray-500 text-xs">{u.email}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full capitalize">{u.role?.replace('_', ' ')}</span>
                            {u.subscription_tier === 'pro' && <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 bg-amber-900/40 text-amber-400 border border-amber-800/50 rounded-full"><Crown className="w-2.5 h-2.5" /> Pro</span>}
                            {!u.is_approved && <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded-full">Pending</span>}
                            {u.is_suspended && <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded-full">Suspended</span>}
                            {!u.is_verified && u.role !== 'admin' && <span className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded-full">Unverified Email</span>}
                            {getUserMissingFields(u).length > 0 && u.role !== 'admin' && <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full">Incomplete</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getUserMissingFields(u).length > 0 && u.role !== 'admin' && (
                            <button
                              onClick={() => sendReminder(u)}
                              disabled={sendingReminderId === u.id}
                              className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3" /> {sendingReminderId === u.id ? 'Sending...' : 'Remind'}
                            </button>
                          )}
                          {!u.is_approved && (
                            <button onClick={() => approveProfile(u.id)} className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors">Approve</button>
                          )}
                          {u.subscription_tier !== 'pro' && u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                const r = ['mechanic', 'technician'].includes(u.role ?? '') ? 'mechanic' : u.role === 'supplier' ? 'supplier' : u.role === 'rental_provider' ? 'rental_provider' : 'owner';
                                activateSubscription(u.id, 'pro', r);
                              }}
                              className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-900/50 transition-colors hidden sm:flex items-center gap-1"
                            >
                              <Crown className="w-3 h-3" /> Grant Pro
                            </button>
                          )}
                          <button
                            onClick={() => toggleSuspend(u.id, u.is_suspended)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${u.is_suspended ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50' : 'bg-red-900/20 text-red-400 border-red-800/50 hover:bg-red-900/40'}`}
                          >
                            {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== PAYMENTS ===== */}
              {tab === 'payments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    {[
                      { label: 'Pending', count: payments.filter(p => p.status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
                      { label: 'Approved', count: payments.filter(p => p.status === 'approved').length, color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
                      { label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length, color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                        <div><p className={`text-xl font-bold ${s.color}`}>{s.count}</p><p className="text-gray-500 text-xs">{s.label}</p></div>
                      </div>
                    ))}
                  </div>

                  {payments.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                      <CreditCard className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">No payments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map(payment => (
                        <div key={payment.id} className={`bg-gray-900 border rounded-xl p-4 ${payment.status === 'pending' ? 'border-yellow-900/50' : 'border-gray-800'}`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
                                  {(payment as any).user?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{(payment as any).user?.name || 'Unknown'}</p>
                                  <p className="text-gray-500 text-xs">{(payment as any).user?.email}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div><p className="text-gray-500 text-xs">Fee Type</p><p className="text-gray-300 text-sm">{FEE_LABELS[payment.fee_type] || payment.fee_type}</p></div>
                                <div><p className="text-gray-500 text-xs">Amount</p><p className="text-yellow-400 font-semibold">{payment.amount.toLocaleString()} ETB</p></div>
                                <div><p className="text-gray-500 text-xs">Transaction ID</p><p className="text-gray-300 font-mono text-xs break-all">{payment.transaction_id || '-'}</p></div>
                                <div><p className="text-gray-500 text-xs">Submitted</p><p className="text-gray-300 text-xs">{format(new Date(payment.created_at), 'MMM d, h:mm a')}</p></div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${payment.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400' : payment.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                {payment.status}
                              </span>
                              {payment.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button onClick={() => approvePayment(payment.id, payment.user_id, payment.fee_type)} className="flex items-center gap-1 text-xs bg-green-900/30 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors">
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button onClick={() => rejectPayment(payment.id, payment.user_id)} className="flex items-center gap-1 text-xs bg-red-900/20 text-red-400 border border-red-800/50 px-3 py-1.5 rounded-lg hover:bg-red-900/40 transition-colors">
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== PAYMENT METHODS ===== */}
              {tab === 'payment_methods' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Payment Methods</h3>
                      <p className="text-gray-400 text-sm mt-0.5">Configure payment options shown to users</p>
                    </div>
                    <button onClick={() => { setEditingMethod(null); setMethodForm({ method_name: '', provider: '', account_name: '', account_number: '', instructions: '', sort_order: paymentMethods.length }); setShowMethodForm(true); }} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                      <Plus className="w-4 h-4" /> Add Method
                    </button>
                  </div>

                  {showMethodForm && (
                    <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-semibold">{editingMethod ? 'Edit Method' : 'Add Method'}</h4>
                        <button onClick={() => setShowMethodForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'method_name', label: 'Method Name *', placeholder: 'e.g. Bank Transfer' },
                          { key: 'provider', label: 'Provider / Bank', placeholder: 'e.g. CBE' },
                          { key: 'account_name', label: 'Account Name', placeholder: '' },
                          { key: 'account_number', label: 'Account Number *', placeholder: '' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-gray-400 text-xs font-medium mb-1">{f.label}</label>
                            <input type="text" value={methodForm[f.key as keyof typeof methodForm]} onChange={e => setMethodForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Instructions</label>
                        <textarea value={methodForm.instructions} onChange={e => setMethodForm(p => ({ ...p, instructions: e.target.value }))} rows={2} className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none resize-none transition-colors" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveMethod} disabled={savingMethod} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                          <Save className="w-4 h-4" /> {savingMethod ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setShowMethodForm(false)} className="text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl text-sm transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {paymentMethods.map(m => (
                      <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${m.is_active ? 'border-gray-800' : 'border-gray-800 opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{m.method_name}</p>
                          <p className="text-gray-400 text-sm">{m.provider} · {m.account_number}</p>
                          {m.instructions && <p className="text-gray-500 text-xs mt-1">{m.instructions}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => toggleMethodActive(m.id, m.is_active)} className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${m.is_active ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button onClick={() => { setEditingMethod(m); setMethodForm({ method_name: m.method_name, provider: m.provider, account_name: m.account_name, account_number: m.account_number, instructions: m.instructions || '', sort_order: m.sort_order }); setShowMethodForm(true); }} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMethod(m.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-gray-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== SUBSCRIPTIONS ===== */}
              {tab === 'subscriptions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">{subscriptions.length} Active Subscriptions</h3>
                  </div>
                  {subscriptions.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                      <Crown className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">No active subscriptions</p>
                    </div>
                  ) : (
                    subscriptions.map(s => (
                      <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-900/30 flex items-center justify-center"><Crown className="w-5 h-5 text-amber-400" /></div>
                          <div>
                            <p className="text-white font-medium">{(s as any).user?.name || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs">{(s as any).user?.email} · {(s as any).user?.role?.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-semibold text-sm capitalize">{s.tier}</span>
                          <p className="text-gray-500 text-xs mt-0.5">{s.expires_at ? `Expires ${format(new Date(s.expires_at), 'MMM d, yyyy')}` : 'No expiry'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ===== COMMISSIONS ===== */}
              {tab === 'commissions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    {[
                      { label: 'Total Revenue', value: `${stats.totalCommissions.toLocaleString()} ETB`, color: 'text-green-400', bg: 'bg-green-400/10', icon: TrendingUp },
                      { label: 'Pending', value: commissions.filter(c => c.status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
                      { label: 'Paid', value: commissions.filter(c => c.status === 'paid').length, color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                        <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {commissions.map(c => (
                      <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-white font-medium">{(c as any).technician?.name || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs">{(c as any).technician?.email} · {(c as any).breakdown_request?.machine_model}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-sm">
                              <span className="text-gray-300">{c.job_amount.toLocaleString()} ETB total</span>
                              <span className="text-red-400">-{c.commission_amount.toLocaleString()} ETB ({c.commission_rate}%)</span>
                              <span className="text-green-400 font-medium">{(c.job_amount - c.commission_amount).toLocaleString()} ETB net</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${c.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400' : c.status === 'paid' ? 'bg-green-900/40 text-green-400' : c.status === 'waived' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'}`}>{c.status}</span>
                            {c.status === 'pending' && (
                              <>
                                <button onClick={() => updateCommissionStatus(c.id, 'paid')} className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2.5 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors">Mark Paid</button>
                                <button onClick={() => updateCommissionStatus(c.id, 'waived')} className="text-xs bg-blue-900/20 text-blue-400 border border-blue-800/50 px-2.5 py-1.5 rounded-lg hover:bg-blue-900/40 transition-colors">Waive</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== BREAKDOWNS ===== */}
              {tab === 'breakdowns' && (
                <div className="space-y-3">
                  <h3 className="text-white font-semibold mb-2">{breakdowns.length} Breakdown Requests</h3>
                  {breakdowns.map(bd => (
                    <div key={bd.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-medium">{bd.machine_model} — {bd.machine_type}</p>
                          <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{bd.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${bd.status === 'open' ? 'text-blue-400 bg-blue-900/30' : bd.status === 'resolved' ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>{bd.status}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${bd.urgency === 'critical' ? 'text-red-400 bg-red-900/30' : bd.urgency === 'high' ? 'text-orange-400 bg-orange-900/30' : 'text-gray-400 bg-gray-800'}`}>{bd.urgency}</span>
                            {(bd as any).owner && <span className="text-gray-500 text-xs">{(bd as any).owner.name}</span>}
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs flex-shrink-0">{format(new Date(bd.created_at), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== LISTINGS ===== */}
              {tab === 'listings' && <AdminListings />}

              {/* ===== PLATFORM SETTINGS ===== */}
              {tab === 'platform_settings' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Platform Fee Settings</h3>
                    <p className="text-gray-400 text-sm">Configure commission rates and access fees across the platform.</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                    {platformSettings.map(s => (
                      <div key={s.id}>
                        <label className="block text-gray-300 text-sm font-medium mb-1.5 capitalize">{s.setting_key.replace(/_/g, ' ')}</label>
                        <div className="flex items-center gap-3">
                          <input type="number" value={platformSettingsForm[s.setting_key] ?? ''} onChange={e => setPlatformSettingsForm(p => ({ ...p, [s.setting_key]: e.target.value }))} className="flex-1 bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2.5 px-3 text-sm outline-none transition-colors" />
                          <span className="text-gray-400 text-sm">ETB</span>
                        </div>
                        {s.description && <p className="text-gray-500 text-xs mt-1">{s.description}</p>}
                      </div>
                    ))}
                    <button onClick={savePlatformSettings} disabled={savingPlatformSettings} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors mt-2">
                      <Save className="w-4 h-4" /> {savingPlatformSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== SITE STATS ===== */}
              {tab === 'site_stats' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Site Statistics</h3>
                      <p className="text-gray-400 text-sm mt-0.5">Stats displayed on the landing page</p>
                    </div>
                    <button onClick={() => { setEditingStat(null); setStatForm({ stat_key: '', stat_value: '', stat_label: '', sort_order: siteStatsList.length }); setShowStatForm(true); }} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                      <Plus className="w-4 h-4" /> Add Stat
                    </button>
                  </div>

                  {showStatForm && (
                    <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-semibold">{editingStat ? 'Edit Stat' : 'Add Stat'}</h4>
                        <button onClick={() => setShowStatForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'stat_key', label: 'Key (unique)', placeholder: 'e.g. total_mechanics' },
                          { key: 'stat_value', label: 'Value', placeholder: 'e.g. 500+' },
                          { key: 'stat_label', label: 'Display Label', placeholder: 'e.g. Mechanics Registered' },
                          { key: 'sort_order', label: 'Sort Order', placeholder: '0', type: 'number' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-gray-400 text-xs font-medium mb-1">{f.label}</label>
                            <input type={f.type || 'text'} value={statForm[f.key as keyof typeof statForm]} onChange={e => setStatForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} placeholder={f.placeholder} className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveStat} disabled={savingStat} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                          <Save className="w-4 h-4" /> {savingStat ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setShowStatForm(false)} className="text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl text-sm transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {siteStatsList.map(stat => (
                      <div key={stat.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-yellow-400 text-xl font-black">{stat.stat_value}</p>
                          <p className="text-gray-300 text-sm">{stat.stat_label}</p>
                          <p className="text-gray-600 text-xs font-mono">{stat.stat_key}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingStat(stat); setStatForm({ stat_key: stat.stat_key, stat_value: stat.stat_value, stat_label: stat.stat_label, sort_order: stat.sort_order }); setShowStatForm(true); }} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteStat(stat.id)} className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== CONTACT INFO ===== */}
              {tab === 'contact' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Contact Information</h3>
                    <p className="text-gray-400 text-sm">Shown on the landing page and footer</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                    {[
                      { key: 'email', label: 'Email Address', icon: Mail, placeholder: 'support@example.com' },
                      { key: 'phone', label: 'Phone Number', icon: Phone, placeholder: '+251 912 345 678' },
                      { key: 'address', label: 'Physical Address', icon: MapPin, placeholder: 'Addis Ababa, Ethiopia' },
                      { key: 'facebook_url', label: 'Facebook URL', icon: Globe, placeholder: 'https://facebook.com/...' },
                      { key: 'twitter_url', label: 'Twitter / X URL', icon: Globe, placeholder: 'https://twitter.com/...' },
                      { key: 'linkedin_url', label: 'LinkedIn URL', icon: Globe, placeholder: 'https://linkedin.com/...' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5">{f.label}</label>
                        <div className="relative">
                          <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={contactForm[f.key as keyof typeof contactForm]}
                            onChange={e => setContactForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                    <button onClick={saveContactSettings} disabled={savingContact} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                      <Save className="w-4 h-4" /> {savingContact ? 'Saving...' : 'Save Contact Info'}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== LEGAL ===== */}
              {tab === 'legal' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Legal & Compliance</h3>
                    <p className="text-gray-400 text-sm">Email addresses displayed on legal pages</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                    {[
                      { key: 'privacy_email', label: 'Privacy Inquiries Email', placeholder: 'privacy@example.com' },
                      { key: 'legal_email', label: 'Legal Team Email', placeholder: 'legal@example.com' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5">{f.label}</label>
                        <input
                          type="email"
                          value={legalForm[f.key as keyof typeof legalForm]}
                          onChange={e => setLegalForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 text-sm outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <button onClick={saveLegalSettings} disabled={savingLegal} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                      <Save className="w-4 h-4" /> {savingLegal ? 'Saving...' : 'Save Legal Settings'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
