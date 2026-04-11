import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, MapPin, MessageCircle, Send, Copy, ArrowLeft,
  Lock, Unlock, Wallet, Package, Award, Shield, ChevronRight,
  ExternalLink, MessageSquare, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePromoMode } from '../../lib/promoMode';
import { spendCredits, hasAccessGrant, getCreditRule } from '../../lib/credits';
import { trackEvent } from '../../lib/analytics';
import { Profile } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const BADGE_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bronze: { label: 'Bronze Supplier', color: 'text-amber-600', bg: 'bg-amber-900/20', border: 'border-amber-700/40' },
  silver: { label: 'Silver Supplier', color: 'text-slate-300', bg: 'bg-slate-800/40', border: 'border-slate-600/40' },
  gold: { label: 'Gold Supplier', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/40' },
  platinum: { label: 'Platinum Supplier', color: 'text-cyan-300', bg: 'bg-cyan-900/20', border: 'border-cyan-700/40' },
};

export default function SupplierContact() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const { promoEnabled } = usePromoMode();

  const [supplier, setSupplier] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cost, setCost] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!supplierId) return;
    loadSupplier();
  }, [supplierId]);

  useEffect(() => {
    if (!user || !supplierId) { setChecking(false); return; }
    if (promoEnabled || myProfile?.role === 'admin' || user.id === supplierId) {
      setUnlocked(true);
      setChecking(false);
      return;
    }
    Promise.all([
      hasAccessGrant(user.id, supplierId, 'part'),
      getCreditRule('view_part_contact'),
      supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    ]).then(([granted, rule, walletRes]) => {
      setUnlocked(granted);
      setCost(rule?.credits_cost ?? 1);
      setWalletBalance(walletRes.data?.balance ?? 0);
      setChecking(false);
    });
  }, [user, supplierId, promoEnabled, myProfile]);

  const loadSupplier = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supplierId)
      .eq('role', 'supplier')
      .maybeSingle();
    setSupplier(data as Profile | null);
    setLoading(false);
  };

  const handleUnlock = async () => {
    if (!user) { navigate('/login'); return; }
    if (!supplierId) return;
    setUnlocking(true);

    const result = await spendCredits(
      user.id,
      'view_part_contact',
      supplierId,
      'part',
      `Unlocked supplier contact: ${supplier?.name}`,
      promoEnabled
    );

    setUnlocking(false);

    if (result.alreadyGranted || result.success) {
      setUnlocked(true);
      await refreshProfile();
      if (!result.alreadyGranted) {
        setWalletBalance(prev => prev - cost);
        trackEvent(user.id, 'contact_unlocked', { target: supplierId, type: 'part', cost });
        toast.success(promoEnabled ? 'Contact unlocked — free during promo!' : 'Contact unlocked!');
      }
    } else if (result.insufficientBalance) {
      toast.error('Not enough credits. Top up your wallet.');
      navigate('/wallet');
    }
  };

  const copyField = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const hasAnyContact = supplier?.contact_phone || supplier?.contact_email ||
    supplier?.contact_address || supplier?.contact_whatsapp || supplier?.contact_telegram;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex flex-col items-center justify-center gap-4">
        <Package className="w-16 h-16 text-gray-700" />
        <p className="text-white font-semibold text-lg">Supplier not found</p>
        <Link to="/parts" className="text-yellow-400 hover:text-yellow-300 text-sm">Browse Parts</Link>
      </div>
    );
  }

  const badge = supplier.merchant_badge ? BADGE_STYLES[supplier.merchant_badge] : null;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {supplier.avatar_url ? (
                <img src={supplier.avatar_url} alt={supplier.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center text-gray-900 font-bold text-xl flex-shrink-0">
                  {supplier.name?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white font-bold text-xl">{supplier.name}</h1>
                  {supplier.is_verified && (
                    <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" title="Verified Supplier" />
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-0.5">Spare Parts Supplier</p>
                {supplier.location && (
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{supplier.location}</span>
                  </div>
                )}
                {badge && (
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold mt-2 border ${badge.bg} ${badge.color} ${badge.border}`}>
                    <Award className="w-3 h-3" /> {badge.label}
                  </span>
                )}
              </div>
            </div>

            {supplier.bio && (
              <p className="text-gray-400 text-sm mt-4 leading-relaxed border-t border-gray-800 pt-4">{supplier.bio}</p>
            )}
          </div>

          {promoEnabled && (
            <div className="flex items-center gap-3 bg-green-950/30 border border-green-800/40 rounded-xl px-4 py-3">
              <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm font-medium">Free Promotional Period — All contacts unlocked for free!</p>
            </div>
          )}

          {checking ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
              <div className="h-12 bg-gray-800 rounded-xl mb-3" />
              <div className="h-10 bg-gray-800 rounded-xl" />
            </div>
          ) : !unlocked ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="relative mb-5">
                  <div className="space-y-3 filter blur-sm select-none pointer-events-none">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Phone className="w-5 h-5" />
                      <span className="text-sm">+251 9XX XXX XXX</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <Mail className="w-5 h-5" />
                      <span className="text-sm">supplier@example.com</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <MapPin className="w-5 h-5" />
                      <span className="text-sm">Addis Ababa, Ethiopia</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gray-900/90 border border-gray-700 rounded-2xl px-5 py-4 text-center">
                      <Lock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-semibold text-sm">Contact Details Hidden</p>
                      <p className="text-gray-400 text-xs mt-1">Unlock to view full contact info</p>
                    </div>
                  </div>
                </div>

                {!promoEnabled && (
                  <div className="bg-gray-800/50 rounded-xl p-3 mb-4 text-xs text-gray-400 flex items-start gap-2">
                    <Wallet className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-500" />
                    <div>
                      <span className="text-white font-medium">{cost} ETB</span> one-time charge · Your balance:{' '}
                      <span className={walletBalance >= cost ? 'text-green-400' : 'text-red-400'}>
                        {walletBalance.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUnlock}
                  disabled={unlocking || (!promoEnabled && walletBalance < cost)}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/40 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {unlocking ? (
                    <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> Unlocking...</>
                  ) : (
                    <><Unlock className="w-4 h-4" /> {promoEnabled ? 'Unlock Contact — Free' : `Unlock Contact (${cost} ETB)`}</>
                  )}
                </button>

                {!promoEnabled && walletBalance < cost && (
                  <Link to="/wallet" className="mt-3 w-full flex items-center justify-center gap-2 border border-gray-700 hover:border-yellow-400 text-gray-300 hover:text-yellow-400 font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    <Wallet className="w-4 h-4" /> Top Up Wallet
                  </Link>
                )}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              <motion.div
                key="unlocked"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-900 border border-green-800/40 rounded-2xl overflow-hidden"
              >
                <div className="bg-green-900/20 px-5 py-3 flex items-center gap-2 border-b border-green-800/30">
                  <Unlock className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">Contact Unlocked</span>
                </div>

                {!hasAnyContact ? (
                  <div className="p-6 text-center">
                    <Package className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">This supplier has not added contact details yet.</p>
                  </div>
                ) : (
                  <div className="p-5 space-y-3">
                    {supplier.contact_phone && (
                      <div className="flex items-center justify-between gap-3 bg-gray-800/50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <div>
                            <p className="text-gray-500 text-xs">Phone</p>
                            <a href={`tel:${supplier.contact_phone}`} className="text-white text-sm font-medium hover:text-yellow-400 transition-colors">
                              {supplier.contact_phone}
                            </a>
                          </div>
                        </div>
                        <button onClick={() => copyField(supplier.contact_phone!, 'Phone')} className="text-gray-600 hover:text-gray-300 p-1.5 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {supplier.contact_email && (
                      <div className="flex items-center justify-between gap-3 bg-gray-800/50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-gray-500 text-xs">Email</p>
                            <a href={`mailto:${supplier.contact_email}`} className="text-white text-sm font-medium hover:text-yellow-400 transition-colors">
                              {supplier.contact_email}
                            </a>
                          </div>
                        </div>
                        <button onClick={() => copyField(supplier.contact_email!, 'Email')} className="text-gray-600 hover:text-gray-300 p-1.5 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {supplier.contact_address && (
                      <div className="flex items-start gap-3 bg-gray-800/50 rounded-xl px-4 py-3">
                        <MapPin className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Address</p>
                          <p className="text-white text-sm font-medium">{supplier.contact_address}</p>
                        </div>
                      </div>
                    )}

                    {supplier.contact_other && (
                      <div className="flex items-start gap-3 bg-gray-800/50 rounded-xl px-4 py-3">
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Other</p>
                          <p className="text-white text-sm">{supplier.contact_other}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {supplier.contact_whatsapp && (
                        <a
                          href={`https://wa.me/${supplier.contact_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${supplier.name}, I found your profile on EquipLink and I'd like to inquire about your spare parts.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
                        </a>
                      )}
                      {supplier.contact_telegram && (
                        <a
                          href={`https://t.me/${supplier.contact_telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                          <Send className="w-5 h-5" /> Message on Telegram
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/messages?user=${supplier.id}`)}
                        className="flex items-center justify-center gap-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
                      >
                        <MessageSquare className="w-5 h-5" /> In-App Chat
                      </button>
                      {supplier.contact_phone && (
                        <a
                          href={`tel:${supplier.contact_phone}`}
                          className="flex items-center justify-center gap-2.5 border border-gray-700 hover:border-yellow-400 text-gray-300 hover:text-yellow-400 font-semibold py-3 rounded-xl transition-colors"
                        >
                          <Phone className="w-5 h-5" /> Call Directly
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <div className="flex items-center justify-between text-sm">
            <Link to="/parts" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
              <Package className="w-4 h-4" /> Browse Parts
            </Link>
            <Link to={`/messages?user=${supplier.id}`} className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors">
              Start Chat <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
