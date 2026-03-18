import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, Clock, Calendar, CheckCircle, Lock, PhoneCall, X, Wallet, Zap } from 'lucide-react';
import { EquipmentRental } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { spendCredits } from '../../lib/credits';
import ContactCard from '../ui/ContactCard';
import toast from 'react-hot-toast';

interface Props {
  rental: EquipmentRental;
}

export default function RentalCard({ rental }: Props) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [creditCost, setCreditCost] = useState(1);

  const isPro = profile?.subscription_tier === 'pro';

  useEffect(() => {
    if (user) {
      Promise.all([
        supabase
          .from('access_grants')
          .select('id')
          .eq('user_id', user.id)
          .eq('resource_id', rental.provider_id)
          .eq('resource_type', 'rental')
          .maybeSingle(),
        supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('credit_rules')
          .select('credits_cost')
          .eq('action_key', 'view_rental_contact')
          .eq('is_active', true)
          .maybeSingle(),
      ]).then(([grantRes, walletRes, ruleRes]) => {
        setHasAccess(!!grantRes.data || isPro);
        setWalletBalance(walletRes.data?.balance ?? 0);
        setCreditCost(ruleRes.data?.credits_cost ?? 1);
      });
    }
  }, [user, rental.provider_id, isPro]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (hasAccess || profile?.role === 'admin') {
      setShowContact(true);
    } else {
      setShowConfirm(true);
    }
  };

  const confirmAndUnlock = async () => {
    if (!user || !profile) return;
    setShowConfirm(false);
    setLoading(true);

    if (isPro) {
      setHasAccess(true);
      setShowContact(true);
      setLoading(false);
      return;
    }

    const result = await spendCredits(
      user.id,
      'view_rental_contact',
      rental.provider_id,
      'rental',
      `View rental provider contact — ${rental.machine_model}`
    );

    if (result.alreadyGranted || result.success) {
      setHasAccess(true);
      if (result.newBalance !== undefined) setWalletBalance(result.newBalance);
      await refreshProfile();
      if (!result.alreadyGranted) toast.success('Contact unlocked!');
      setShowContact(true);
    } else if (result.insufficientBalance) {
      toast.error(`You need ${creditCost} ETB. Please top up your wallet.`);
      navigate('/wallet');
    }

    setLoading(false);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
        transition={{ duration: 0.2 }}
        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
      >
        <div className="relative aspect-video bg-gray-800 overflow-hidden">
          {rental.image_url ? (
            <img src={rental.image_url} alt={rental.machine_model} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <Truck className="w-16 h-16 text-gray-600" />
            </div>
          )}
          {rental.is_available && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-900/80 text-green-400 text-xs px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> Available
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent h-16 pointer-events-none"></div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-white font-semibold text-base">{rental.machine_model}</h3>
              <p className="text-gray-400 text-sm capitalize">{rental.machine_type}{rental.brand ? ` · ${rental.brand}` : ''}{rental.year ? ` · ${rental.year}` : ''}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-gray-400 text-sm">
            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
            <span>{rental.location}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {rental.hourly_rate && (
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-0.5">
                  <Clock className="w-3 h-3" /> Per Hour
                </div>
                <p className="text-yellow-400 font-bold">{rental.hourly_rate} ETB</p>
              </div>
            )}
            {rental.daily_rate && (
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-0.5">
                  <Calendar className="w-3 h-3" /> Per Day
                </div>
                <p className="text-yellow-400 font-bold">{rental.daily_rate} ETB</p>
              </div>
            )}
          </div>

          <div className="mt-3 text-sm text-gray-500">
            <span>Provider: </span>
            <span className="text-gray-300">{rental.provider?.name || 'Unknown'}</span>
          </div>

          <button
            onClick={handleContact}
            disabled={loading}
            className={`mt-3 w-full flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-lg transition-colors ${
              hasAccess
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : hasAccess ? (
              <><PhoneCall className="w-4 h-4" /> View Contact Details</>
            ) : (
              <><Lock className="w-4 h-4" /> {creditCost} ETB to Unlock</>
            )}
          </button>
        </div>
      </motion.div>

      <ContactCard
        isOpen={showContact}
        onClose={() => setShowContact(false)}
        providerId={rental.provider_id}
        providerName={rental.provider?.name}
      />

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
                <h3 className="text-white font-bold">Unlock Rental Contact</h3>
                <button onClick={() => setShowConfirm(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                View contact for <span className="text-white font-medium">{rental.machine_model}</span> rental for{' '}
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
                <p className="text-blue-300 text-xs">Once unlocked, this provider's contact details are free to view anytime.</p>
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
