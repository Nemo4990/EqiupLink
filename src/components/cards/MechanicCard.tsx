import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Clock, MessageSquare, CheckCircle, Lock, Phone, X, Wallet, Zap } from 'lucide-react';
import { MechanicProfile } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { spendCredits } from '../../lib/credits';
import { usePromoMode } from '../../lib/promoMode';
import toast from 'react-hot-toast';

interface Props {
  mechanic: MechanicProfile;
}

const SPECIALIZATION_COLORS: Record<string, string> = {
  hydraulics: 'bg-blue-900/50 text-blue-300',
  engine: 'bg-red-900/50 text-red-300',
  electrical: 'bg-yellow-900/50 text-yellow-300',
  transmission: 'bg-green-900/50 text-green-300',
};

export default function MechanicCard({ mechanic }: Props) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { promoEnabled } = usePromoMode();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [creditCost, setCreditCost] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  const isPro = profile?.subscription_tier === 'pro' || promoEnabled;

  useEffect(() => {
    if (user) {
      Promise.all([
        supabase
          .from('access_grants')
          .select('id')
          .eq('user_id', user.id)
          .eq('resource_id', mechanic.user_id)
          .eq('resource_type', 'mechanic')
          .maybeSingle(),
        supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('credit_rules')
          .select('credits_cost')
          .eq('action_key', 'view_mechanic_contact')
          .eq('is_active', true)
          .maybeSingle(),
      ]).then(([grantRes, walletRes, ruleRes]) => {
        setHasAccess(!!grantRes.data || isPro);
        setWalletBalance(walletRes.data?.balance ?? 0);
        setCreditCost(ruleRes.data?.credits_cost ?? 1);
      });
    }
  }, [user, mechanic.user_id, isPro]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (hasAccess || profile?.role === 'admin') {
      navigate(`/messages?user=${mechanic.user_id}`);
    } else {
      setShowConfirm(true);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasAccess && profile?.role !== 'admin') { setShowConfirm(true); return; }
    const phone = (mechanic.profile as Record<string, string>)?.contact_whatsapp
      || (mechanic.profile as Record<string, string>)?.contact_phone
      || (mechanic.profile as Record<string, string>)?.phone;
    if (!phone) { toast.error('No WhatsApp number on file'); return; }
    const cleaned = phone.replace(/\D/g, '');
    const name = mechanic.profile?.name || 'Mechanic';
    const msg = encodeURIComponent(`Hello ${name}, I found your profile on EquipLink and would like to discuss a job opportunity.`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  const confirmAndUnlock = async () => {
    if (!user || !profile) return;
    setShowConfirm(false);
    setLoading(true);

    if (isPro) {
      setHasAccess(true);
      navigate(`/messages?user=${mechanic.user_id}`);
      setLoading(false);
      return;
    }

    const result = await spendCredits(
      user.id,
      'view_mechanic_contact',
      mechanic.user_id,
      'mechanic',
      `View mechanic contact — ${mechanic.profile?.name}`,
      promoEnabled
    );

    if (result.alreadyGranted) {
      setHasAccess(true);
      navigate(`/messages?user=${mechanic.user_id}`);
    } else if (result.insufficientBalance) {
      toast.error(`You need ${creditCost} ETB. Please top up your wallet.`);
      navigate('/wallet');
    } else if (result.success) {
      setHasAccess(true);
      setWalletBalance(result.newBalance ?? 0);
      await refreshProfile();
      toast.success('Contact unlocked!');
      navigate(`/messages?user=${mechanic.user_id}`);
    }

    setLoading(false);
  };

  const whatsappPhone = (mechanic.profile as Record<string, string>)?.contact_whatsapp
    || (mechanic.profile as Record<string, string>)?.contact_phone
    || (mechanic.profile as Record<string, string>)?.phone;

  return (
    <>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
        transition={{ duration: 0.2 }}
        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer"
        onClick={() => navigate(`/mechanic/${mechanic.user_id}`)}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              {mechanic.profile?.avatar_url ? (
                <img src={mechanic.profile.avatar_url} alt={mechanic.profile.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-xl">
                  {mechanic.profile?.name?.charAt(0).toUpperCase() || 'M'}
                </div>
              )}
              {mechanic.is_available && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg truncate">{mechanic.profile?.name || 'Mechanic'}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">{mechanic.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({mechanic.total_reviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{mechanic.service_area || mechanic.profile?.location || 'Location not set'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {mechanic.specializations.slice(0, 3).map((spec) => (
              <span key={spec} className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SPECIALIZATION_COLORS[spec] || 'bg-gray-800 text-gray-300'}`}>
                {spec}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>{mechanic.years_experience} yrs exp</span>
            </div>
            {mechanic.hourly_rate && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="text-yellow-400 font-semibold">{mechanic.hourly_rate} ETB/hr</span>
              </div>
            )}
          </div>

          {mechanic.supported_brands.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {mechanic.supported_brands.slice(0, 3).map((brand) => (
                <span key={brand} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{brand}</span>
              ))}
              {mechanic.supported_brands.length > 3 && (
                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">+{mechanic.supported_brands.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleContact}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold text-sm py-2 rounded-lg transition-colors ${
                hasAccess
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                  : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : hasAccess ? (
                <><MessageSquare className="w-4 h-4" /> Message</>
              ) : (
                <><Lock className="w-4 h-4" /> {creditCost} ETB to Contact</>
              )}
            </button>
            {hasAccess && whatsappPhone && (
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                title="Chat on WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
          </div>

          {mechanic.is_available && (
            <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Available now</span>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">Unlock Mechanic Contact</h3>
                <button onClick={() => setShowConfirm(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Contact <span className="text-white font-medium">{mechanic.profile?.name}</span> for{' '}
                {isPro
                  ? <span className="text-green-400 font-semibold">free (Pro plan)</span>
                  : <span><span className="text-yellow-400 font-bold">{creditCost} ETB</span> from your wallet</span>
                }.
                {!isPro && (
                  <span className="block text-gray-500 text-xs mt-1">
                    Your balance: {walletBalance.toLocaleString()} ETB
                    {walletBalance < creditCost && <span className="text-red-400 ml-1">— insufficient</span>}
                  </span>
                )}
              </p>
              <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 mb-4">
                <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-xs">Once unlocked, you can message and contact this mechanic for free anytime.</p>
              </div>
              {!isPro && walletBalance < creditCost ? (
                <button
                  onClick={() => { setShowConfirm(false); navigate('/wallet'); }}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Wallet className="w-4 h-4" /> Top Up Wallet
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAndUnlock}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    {isPro ? 'Unlock Free' : `Pay ${creditCost} ETB`}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
