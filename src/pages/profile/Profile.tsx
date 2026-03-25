import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, Save, Star, Wrench, Plus, Trash2, FileText, ChevronRight, Camera, Shield, Mail, AtSign, AlertCircle, CheckCircle, LogOut, CreditCard as Edit3, Wallet, Bell, MessageSquare, Briefcase, Bot, Crown, Settings, ChevronDown, Package, Truck, Zap, Search, BarChart3, Award, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MechanicProfile, Machine, Review } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SPECIALIZATIONS = ['hydraulics', 'engine', 'electrical', 'transmission', 'undercarriage', 'pneumatics'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'JCB', 'Case'];

export default function Profile() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'machines' | 'reviews'>('overview');
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
  });

  const [contactData, setContactData] = useState({
    contact_phone: profile?.contact_phone || '',
    contact_email: profile?.contact_email || '',
    contact_address: profile?.contact_address || '',
    contact_telegram: profile?.contact_telegram || '',
    contact_whatsapp: profile?.contact_whatsapp || '',
    contact_other: profile?.contact_other || '',
  });

  const [mechanicData, setMechanicData] = useState<Partial<MechanicProfile>>({});
  const [machines, setMachines] = useState<Machine[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMachine, setNewMachine] = useState({ machine_type: '', machine_model: '', brand: '', year: '' });
  const [addingMachine, setAddingMachine] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const loadData = async () => {
      const promises: Promise<any>[] = [];
      if (profile.role === 'mechanic') {
        promises.push(
          supabase.from('mechanic_profiles').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
            if (data) setMechanicData(data);
            else setMechanicData({ specializations: [], supported_brands: [], years_experience: 0 });
          }),
          supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)')
            .eq('mechanic_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => setReviews((data || []) as Review[]))
        );
      }
      if (profile.role === 'owner') {
        promises.push(
          supabase.from('machines').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false })
            .then(({ data }) => setMachines((data || []) as Machine[]))
        );
      }
      await Promise.all(promises);
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const contactComplete = !!(contactData.contact_phone || contactData.contact_email) && !!contactData.contact_address;
    const { error } = await supabase.from('profiles').update({
      ...profileData,
      ...contactData,
      contact_complete: contactComplete,
    }).eq('id', profile.id);
    if (!error && profile.role === 'mechanic') {
      const exists = !!(await supabase.from('mechanic_profiles').select('id').eq('user_id', profile.id).maybeSingle()).data;
      if (exists) {
        await supabase.from('mechanic_profiles').update(mechanicData).eq('user_id', profile.id);
      } else {
        await supabase.from('mechanic_profiles').insert({ user_id: profile.id, ...mechanicData });
      }
    }
    if (!error) {
      await refreshProfile();
      toast.success('Profile saved!');
      setActiveTab('overview');
    } else {
      toast.error('Failed to save profile.');
    }
    setSaving(false);
  };

  const toggleSpec = (spec: string) => {
    const specs = mechanicData.specializations || [];
    setMechanicData(prev => ({
      ...prev,
      specializations: specs.includes(spec) ? specs.filter(s => s !== spec) : [...specs, spec]
    }));
  };

  const toggleBrand = (brand: string) => {
    const brands = mechanicData.supported_brands || [];
    setMechanicData(prev => ({
      ...prev,
      supported_brands: brands.includes(brand) ? brands.filter(b => b !== brand) : [...brands, brand]
    }));
  };

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user || !profile) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar/profile.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      setAvatarUrl(url);
      await refreshProfile();
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, profile, refreshProfile]);

  const addMachine = async () => {
    if (!profile || !newMachine.machine_type || !newMachine.machine_model || !newMachine.brand) return;
    setAddingMachine(true);
    const { data, error } = await supabase.from('machines').insert({
      owner_id: profile.id,
      machine_type: newMachine.machine_type,
      machine_model: newMachine.machine_model,
      brand: newMachine.brand,
      year: newMachine.year ? parseInt(newMachine.year) : null,
    }).select().single();
    if (!error && data) {
      setMachines(prev => [data as Machine, ...prev]);
      setNewMachine({ machine_type: '', machine_model: '', brand: '', year: '' });
      toast.success('Machine added!');
    }
    setAddingMachine(false);
  };

  const deleteMachine = async (id: string) => {
    await supabase.from('machines').delete().eq('id', id);
    setMachines(prev => prev.filter(m => m.id !== id));
    toast.success('Machine removed.');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const roleLabel = profile?.role?.replace('_', ' ') || '';
  const isMechanic = profile?.role === 'mechanic';
  const isOwner = profile?.role === 'owner';
  const isSupplier = profile?.role === 'supplier';
  const isRentalProvider = profile?.role === 'rental_provider';
  const isPro = profile?.subscription_tier === 'pro';

  const quickActions = [
    { label: 'Messages', icon: MessageSquare, to: '/messages', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Notifications', icon: Bell, to: '/notifications', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { label: 'Wallet', icon: Wallet, to: '/wallet', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    { label: 'AI Diagnose', icon: Bot, to: '/ai-diagnose', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    ...(isMechanic || isSupplier ? [{ label: 'Subscription', icon: Crown, to: '/subscription', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }] : []),
    ...(isMechanic ? [{ label: 'Find Jobs', icon: Briefcase, to: '/jobs', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }] : []),
    ...(isOwner ? [{ label: 'My Requests', icon: Search, to: '/my-requests', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }] : []),
    ...(isSupplier ? [{ label: 'Parts Listing', icon: Package, to: '/listings/parts/new', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }] : []),
    ...(isRentalProvider ? [{ label: 'Add Rental', icon: Truck, to: '/listings/rental/new', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' }] : []),
    { label: 'Browse', icon: Zap, to: '/search', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    { label: 'Security', icon: Shield, to: '/sessions', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    { label: 'Forum', icon: MessageSquare, to: '/forum', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'edit', label: 'Edit Profile' },
    ...(isOwner ? [{ id: 'machines', label: 'Machines' }] : []),
    ...(isMechanic ? [{ id: 'reviews', label: 'Reviews' }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-gray-950 pt-16 pb-24 md:pb-12">
      {/* Sign Out Confirm Modal */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-red-400" />
                </div>
                <button onClick={() => setShowSignOutConfirm(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Sign out?</h3>
              <p className="text-gray-400 text-sm mb-5">You'll need to sign in again to access your account.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm hover:border-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {signingOut ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-gray-900 to-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden mb-4"
        >
          {/* Decorative gradient top strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-400" />

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0 group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center ring-2 ring-gray-700 group-hover:ring-yellow-400/60 transition-all">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profile?.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-900 font-black text-3xl sm:text-4xl">{profile?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 rounded-lg flex items-center justify-center shadow-lg transition-colors border-2 border-gray-900"
                    title="Change profile picture"
                  >
                    {uploadingAvatar ? (
                      <div className="w-3.5 h-3.5 border border-gray-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-gray-900" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }}
                  />
                </div>

                {/* Name & meta */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{profile?.name}</h1>
                    {isPro && (
                      <span className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" /> PRO
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm capitalize mt-0.5">{roleLabel}</p>
                  {profile?.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-500 text-xs">{profile.location}</span>
                    </div>
                  )}
                  {profile?.is_approved && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-green-400">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Sign out button - visible on desktop */}
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="hidden sm:flex items-center gap-2 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/5 text-gray-400 hover:text-red-400 px-3 py-2 rounded-xl transition-all text-sm font-medium flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-gray-800">
              <div className="text-center">
                <p className="text-white font-bold text-xl">
                  {isMechanic ? (reviews.length || mechanicData.total_reviews || 0) : isOwner ? machines.length : 0}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {isMechanic ? 'Reviews' : isOwner ? 'Machines' : 'Activity'}
                </p>
              </div>
              <div className="text-center border-x border-gray-800">
                <p className="text-white font-bold text-xl">
                  {isMechanic
                    ? ((mechanicData.rating || 0).toFixed(1))
                    : profile?.wallet_balance?.toFixed(0) || '0'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {isMechanic ? 'Rating' : 'ETB Balance'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xl capitalize">
                  {profile?.subscription_tier || 'Free'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Plan</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions - Mobile prominent, desktop compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {quickActions.slice(0, 8).map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${action.color} hover:scale-105 active:scale-95 transition-all`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold text-center leading-tight">{action.label}</span>
                </Link>
              );
            })}
          </div>
          {quickActions.length > 8 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-2">
              {quickActions.slice(8).map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${action.color} hover:scale-105 active:scale-95 transition-all`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-4 bg-gray-900/60 border border-gray-800 rounded-xl p-1 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-max px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">

              {/* Bio card */}
              {profile?.bio && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">About</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Mechanic marketplace visibility status */}
              {isMechanic && (() => {
                const missing: string[] = [];
                if (!profile?.phone && !profile?.contact_phone) missing.push('Phone number');
                if (!profile?.location && !mechanicData.service_area) missing.push('Location or service area');
                if (!profile?.contact_complete) missing.push('Business contact info (phone/email + address)');
                if ((mechanicData.specializations?.length ?? 0) === 0) missing.push('At least one specialization');
                if (!mechanicData.years_experience || mechanicData.years_experience === 0) missing.push('Years of experience');
                if (!profile?.bio) missing.push('Bio / description');
                const isApproved = profile?.is_approved;
                const isComplete = missing.length === 0;
                const isListed = isApproved && isComplete;

                return (
                  <div className={`bg-gray-900 border rounded-2xl p-5 space-y-3 ${
                    isListed ? 'border-green-500/25' : isApproved ? 'border-orange-500/25' : 'border-yellow-500/25'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Marketplace Visibility</h3>
                        {isListed ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm font-bold">Visible on marketplace</span>
                          </div>
                        ) : isApproved ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-400 text-sm font-bold">Profile incomplete — not visible yet</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm font-bold">Awaiting admin approval</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab('edit')}
                        className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors flex-shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Complete Profile
                      </button>
                    </div>

                    {!isApproved && (
                      <p className="text-gray-500 text-xs bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 leading-relaxed">
                        Your account is pending admin review. Complete your profile while you wait — once approved and all required info is filled, you'll automatically appear in the mechanics marketplace.
                      </p>
                    )}

                    {missing.length > 0 && (
                      <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                        <p className="text-orange-400 text-xs font-semibold mb-2">Complete these to appear on the marketplace:</p>
                        <div className="space-y-1.5">
                          {missing.map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                              <span className="text-orange-300/80 text-xs">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isListed && (
                      <p className="text-gray-500 text-xs">Clients can find and contact you. Keep your availability and info up to date.</p>
                    )}

                    {(mechanicData.specializations?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mechanicData.specializations!.map(s => (
                          <span key={s} className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs px-2.5 py-1 rounded-lg capitalize">{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${mechanicData.is_available ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span className={`text-xs font-medium ${mechanicData.is_available ? 'text-green-400' : 'text-gray-500'}`}>
                        {mechanicData.is_available ? 'Available for jobs' : 'Not available right now'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Contact info status for non-mechanics */}
              {!isMechanic && (['supplier', 'rental_provider', 'owner', 'technician'].includes(profile?.role || '')) && (
                <div className={`bg-gray-900 border rounded-2xl p-5 ${
                  profile?.contact_complete ? 'border-green-500/20' : 'border-orange-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Contact Status</h3>
                      {profile?.contact_complete ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-semibold">Contact info complete</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 text-sm font-semibold">Contact info incomplete</span>
                        </div>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {profile?.contact_complete
                          ? 'Clients can contact you after paying the fee.'
                          : 'Complete your contact info to accept listings.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('edit')}
                      className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              )}

              {/* Mechanic details preview (only when complete) */}
              {isMechanic && (mechanicData.years_experience || mechanicData.hourly_rate) && (
                <div className="grid grid-cols-2 gap-3">
                  {mechanicData.years_experience != null && mechanicData.years_experience > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                      <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-semibold">{mechanicData.years_experience} yrs</p>
                        <p className="text-gray-500 text-xs">Experience</p>
                      </div>
                    </div>
                  )}
                  {mechanicData.hourly_rate != null && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-semibold">{mechanicData.hourly_rate} ETB/hr</p>
                        <p className="text-gray-500 text-xs">Hourly Rate</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Account links */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-5 pt-4 pb-3">Account</h3>
                {[
                  { label: 'Edit Profile', icon: Edit3, action: () => setActiveTab('edit'), color: 'text-white' },
                  { label: 'Wallet & Payments', icon: Wallet, to: '/wallet', color: 'text-white' },
                  { label: 'Security & Sessions', icon: Shield, to: '/sessions', color: 'text-white' },
                  ...(isMechanic || isSupplier ? [{ label: 'Subscription', icon: Crown, to: '/subscription', color: 'text-yellow-400' }] : []),
                ].map((item, i) => {
                  const Icon = item.icon;
                  const content = (
                    <div className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/50 transition-colors ${i > 0 ? 'border-t border-gray-800' : ''}`}>
                      <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="text-gray-200 text-sm font-medium flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  );
                  if ('action' in item) {
                    return <button key={item.label} onClick={item.action} className="w-full text-left">{content}</button>;
                  }
                  return <Link key={item.label} to={item.to!}>{content}</Link>;
                })}

                {/* Sign Out row - mobile prominent */}
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 border-t border-gray-800 hover:bg-red-500/5 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-red-400 text-sm font-semibold flex-1 text-left">Sign Out</span>
                  <ChevronRight className="w-4 h-4 text-red-400/40" />
                </button>
              </div>

            </motion.div>
          )}

          {/* EDIT TAB */}
          {activeTab === 'edit' && (
            <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="tel" value={profileData.phone || ''} onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={profileData.location || ''} onChange={(e) => setProfileData(p => ({ ...p, location: e.target.value }))}
                      placeholder="City, State"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Bio</label>
                  <textarea value={profileData.bio || ''} onChange={(e) => setProfileData(p => ({ ...p, bio: e.target.value }))}
                    rows={3} placeholder="Tell others about yourself..."
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none resize-none transition-colors" />
                </div>
              </div>

              {(['mechanic', 'supplier', 'rental_provider', 'owner', 'technician'].includes(profile?.role || '')) && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold">Contact Information</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Revealed to clients who pay the contact fee.</p>
                    </div>
                    {contactData.contact_phone || contactData.contact_email ? (
                      contactData.contact_address ? (
                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold flex-shrink-0">
                          <CheckCircle className="w-4 h-4" /> Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold flex-shrink-0">
                          <AlertCircle className="w-4 h-4" /> Add address
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1.5 text-orange-400 text-xs font-semibold flex-shrink-0">
                        <AlertCircle className="w-4 h-4" /> Incomplete
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Business Phone <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="tel" value={contactData.contact_phone} onChange={(e) => setContactData(p => ({ ...p, contact_phone: e.target.value }))}
                          placeholder="+251 9XX XXX XXXX"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Business Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="email" value={contactData.contact_email} onChange={(e) => setContactData(p => ({ ...p, contact_email: e.target.value }))}
                          placeholder="business@example.com"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Physical Address <span className="text-red-400">*</span></label>
                    <textarea value={contactData.contact_address} onChange={(e) => setContactData(p => ({ ...p, contact_address: e.target.value }))}
                      rows={2} placeholder="e.g. Bole Road, Near Edna Mall, Addis Ababa"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none resize-none transition-colors text-sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Telegram</label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" value={contactData.contact_telegram} onChange={(e) => setContactData(p => ({ ...p, contact_telegram: e.target.value }))}
                          placeholder="@username"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="tel" value={contactData.contact_whatsapp} onChange={(e) => setContactData(p => ({ ...p, contact_whatsapp: e.target.value }))}
                          placeholder="+251 9XX XXX XXXX"
                          className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-3 outline-none transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Other Contact</label>
                    <input type="text" value={contactData.contact_other} onChange={(e) => setContactData(p => ({ ...p, contact_other: e.target.value }))}
                      placeholder="Any other contact details..."
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none transition-colors" />
                  </div>
                </div>
              )}

              {isMechanic && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-white font-semibold">Mechanic Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Years Experience</label>
                      <input type="number" value={mechanicData.years_experience || 0} min={0} max={60}
                        onChange={(e) => setMechanicData(p => ({ ...p, years_experience: parseInt(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-xl py-2.5 px-3 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1.5">Hourly Rate ($)</label>
                      <input type="number" value={mechanicData.hourly_rate || ''} min={0}
                        onChange={(e) => setMechanicData(p => ({ ...p, hourly_rate: parseFloat(e.target.value) }))}
                        placeholder="e.g. 85"
                        className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Service Area</label>
                    <input type="text" value={mechanicData.service_area || ''}
                      onChange={(e) => setMechanicData(p => ({ ...p, service_area: e.target.value }))}
                      placeholder="e.g. Greater Houston Area"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Specializations</label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATIONS.map(spec => (
                        <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                          className={`capitalize text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                            (mechanicData.specializations || []).includes(spec)
                              ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                              : 'border-gray-700 text-gray-400 hover:border-gray-500'
                          }`}>{spec}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Supported Brands</label>
                    <div className="flex flex-wrap gap-2">
                      {BRANDS.map(brand => (
                        <button key={brand} type="button" onClick={() => toggleBrand(brand)}
                          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                            (mechanicData.supported_brands || []).includes(brand)
                              ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                              : 'border-gray-700 text-gray-400 hover:border-gray-500'
                          }`}>{brand}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={mechanicData.is_available ?? true}
                      onChange={(e) => setMechanicData(p => ({ ...p, is_available: e.target.checked }))}
                      className="w-4 h-4 rounded accent-yellow-400" />
                    <span className="text-gray-300 text-sm">Available for new jobs</span>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={saveProfile} disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button onClick={() => setActiveTab('overview')}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-semibold text-sm transition-colors text-center">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* MACHINES TAB */}
          {activeTab === 'machines' && isOwner && (
            <motion.div key="machines" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
                <h3 className="text-white font-semibold mb-4">Add New Machine</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input type="text" value={newMachine.machine_type} onChange={(e) => setNewMachine(p => ({ ...p, machine_type: e.target.value }))}
                    placeholder="Type (e.g. excavator)"
                    className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none text-sm transition-colors" />
                  <input type="text" value={newMachine.machine_model} onChange={(e) => setNewMachine(p => ({ ...p, machine_model: e.target.value }))}
                    placeholder="Model (e.g. Cat D8R)"
                    className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none text-sm transition-colors" />
                  <input type="text" value={newMachine.brand} onChange={(e) => setNewMachine(p => ({ ...p, brand: e.target.value }))}
                    placeholder="Brand"
                    className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none text-sm transition-colors" />
                  <input type="number" value={newMachine.year} onChange={(e) => setNewMachine(p => ({ ...p, year: e.target.value }))}
                    placeholder="Year" min={1980} max={2024}
                    className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 px-3 outline-none text-sm transition-colors" />
                </div>
                <button onClick={addMachine} disabled={addingMachine}
                  className="mt-3 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> {addingMachine ? 'Adding...' : 'Add Machine'}
                </button>
              </div>

              {machines.length === 0 ? (
                <div className="text-center py-16">
                  <Wrench className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400">No machines added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {machines.map(m => (
                    <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-white font-medium">{m.machine_model}</p>
                          <p className="text-gray-400 text-sm capitalize">{m.machine_type} · {m.brand}{m.year ? ` · ${m.year}` : ''}</p>
                        </div>
                        <button onClick={() => deleteMachine(m.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Link to={`/machine/${m.id}`} className="mt-3 flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-xs font-medium transition-colors">
                        <FileText className="w-3 h-3" /> View Service History <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && isMechanic && (
            <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {reviews.length === 0 ? (
                <div className="text-center py-16">
                  <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-medium">{r.reviewer?.name}</p>
                          <p className="text-gray-500 text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-gray-300 mt-3 text-sm leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
