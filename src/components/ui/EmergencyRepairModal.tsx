import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertTriangle, Wrench, MapPin, Star, Phone, MessageSquare,
  Loader2, Lock, Wallet, Crown, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MechanicProfile } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyRepairModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionFee, setConnectionFee] = useState(20);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState<{ mechanic: MechanicProfile; phone: string } | null>(null);

  const isPro = profile?.subscription_tier === 'pro';

  useEffect(() => {
    if (!isOpen || !profile) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('mechanic_profiles')
        .select('*, profile:profiles!mechanic_profiles_user_id_fkey(name, avatar_url, location, contact_whatsapp, contact_phone, phone)')
        .eq('is_available', true)
        .order('rating', { ascending: false })
        .limit(6),
      supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'connection_fee')
        .maybeSingle(),
      supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('contact_unlocks')
        .select('target_id')
        .eq('unlocker_id', profile.id)
        .eq('unlock_type', 'customer_to_technician'),
    ]).then(([mechRes, feeRes, walletRes, unlocksRes]) => {
      setMechanics((mechRes.data || []) as MechanicProfile[]);
      if (feeRes.data) setConnectionFee(feeRes.data.setting_value);
      setWalletBalance(walletRes.data?.balance ?? 0);
      setUnlockedIds(new Set((unlocksRes.data || []).map((u: { target_id: string }) => u.target_id)));
      setLoading(false);
    });
  }, [isOpen, profile]);

  const getPhone = (mechanic: MechanicProfile) => {
    const p = mechanic.profile as Record<string, string> | undefined;
    return p?.contact_whatsapp || p?.contact_phone || p?.phone || null;
  };

  const handleContactClick = (mechanic: MechanicProfile) => {
    const phone = getPhone(mechanic);
    if (!phone) return;
    const isUnlocked = unlockedIds.has(mechanic.user_id);

    if (isUnlocked || isPro) {
      openWhatsApp(phone, (mechanic.profile as Record<string, string>)?.name || 'Mechanic');
    } else {
      setShowPayConfirm({ mechanic, phone });
    }
  };

  const handleMessageClick = (mechanic: MechanicProfile) => {
    const isUnlocked = unlockedIds.has(mechanic.user_id);
    if (isUnlocked || isPro) {
      onClose();
      navigate(`/messages?user=${mechanic.user_id}`);
    } else {
      setShowPayConfirm({ mechanic, phone: '' });
    }
  };

  const confirmUnlock = async () => {
    if (!showPayConfirm || !profile) return;
    const { mechanic, phone } = showPayConfirm;
    setShowPayConfirm(null);
    setUnlocking(mechanic.user_id);

    if (isPro) {
      await recordUnlock(mechanic.user_id, 'subscription', 0);
      if (phone) openWhatsApp(phone, (mechanic.profile as Record<string, string>)?.name || 'Mechanic');
      else { onClose(); navigate(`/messages?user=${mechanic.user_id}`); }
      setUnlocking(null);
      return;
    }

    const { data: walletData } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!walletData || walletData.balance < connectionFee) {
      toast.error(`You need ${connectionFee} ETB to unlock this contact. Top up your wallet.`);
      setUnlocking(null);
      onClose();
      navigate('/wallet');
      return;
    }

    const newBalance = walletData.balance - connectionFee;
    await supabase.from('wallet_transactions').insert({
      wallet_id: walletData.id,
      user_id: profile.id,
      type: 'deduction',
      amount: connectionFee,
      balance_after: newBalance,
      description: `Emergency contact unlock — ${(mechanic.profile as Record<string, string>)?.name}`,
      reference_id: mechanic.user_id,
      reference_type: 'mechanic_emergency',
      status: 'completed',
    });
    await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletData.id);
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);
    setWalletBalance(newBalance);

    await recordUnlock(mechanic.user_id, 'wallet', connectionFee);
    await refreshProfile();

    if (phone) openWhatsApp(phone, (mechanic.profile as Record<string, string>)?.name || 'Mechanic');
    else { onClose(); navigate(`/messages?user=${mechanic.user_id}`); }
    setUnlocking(null);
  };

  const recordUnlock = async (targetId: string, method: 'wallet' | 'subscription', amount: number) => {
    if (!profile) return;
    const { error } = await supabase.from('contact_unlocks').insert({
      unlock_type: 'customer_to_technician',
      unlocker_id: profile.id,
      target_id: targetId,
      amount_paid: amount,
      method,
    });
    if (!error) {
      setUnlockedIds(prev => new Set([...prev, targetId]));
      toast.success(method === 'subscription' ? 'Contact unlocked (Pro plan)' : `Unlocked! ${amount} ETB deducted`);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${name}, I found your profile on EquipLink. My machine is down and I need emergency repair assistance. Are you available?`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full max-w-lg bg-gray-900 border border-red-800/60 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-red-950/80 to-red-900/40 px-5 py-4 flex items-center justify-between border-b border-red-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Emergency Repair Mode</h2>
                  <p className="text-red-400/80 text-xs">Available mechanics near you</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">Machine down? Contact an available technician or post a formal breakdown request.</p>
              </div>

              {!isPro && (
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-3 py-2 mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-yellow-400/80 text-xs">
                      Contact fee: <span className="font-bold text-yellow-400">{connectionFee} ETB</span> per mechanic · Balance: {walletBalance.toLocaleString()} ETB
                    </p>
                  </div>
                  {walletBalance < connectionFee && (
                    <button
                      onClick={() => { onClose(); navigate('/wallet'); }}
                      className="text-xs border border-yellow-400/30 text-yellow-400 px-2.5 py-1 rounded-lg hover:bg-yellow-400/10 whitespace-nowrap transition-colors flex-shrink-0"
                    >
                      Top Up
                    </button>
                  )}
                </div>
              )}

              {isPro && (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-400 text-xs font-medium">Pro Plan — Unlock any mechanic contact for free</p>
                </div>
              )}

              {loading ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                  <p className="text-gray-400 text-sm">Finding available mechanics...</p>
                </div>
              ) : mechanics.length === 0 ? (
                <div className="py-10 text-center">
                  <Wrench className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No mechanics available right now</p>
                  <button
                    onClick={() => { onClose(); navigate('/breakdown/new'); }}
                    className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
                  >
                    Post a breakdown request instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {mechanics.map((m) => {
                    const phone = getPhone(m);
                    const isUnlocked = unlockedIds.has(m.user_id) || isPro;
                    const isProcessing = unlocking === m.user_id;

                    return (
                      <div key={m.id} className={`border rounded-xl p-3 flex items-center gap-3 transition-colors ${
                        isUnlocked ? 'bg-green-900/10 border-green-800/30' : 'bg-gray-800/60 border-gray-700/50'
                      }`}>
                        <div className="relative flex-shrink-0">
                          {(m.profile as Record<string, string>)?.avatar_url ? (
                            <img src={(m.profile as Record<string, string>).avatar_url} alt={(m.profile as Record<string, string>).name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold">
                              {((m.profile as Record<string, string>)?.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{(m.profile as Record<string, string>)?.name || 'Mechanic'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-yellow-400 text-xs font-medium">{m.rating.toFixed(1)}</span>
                            <span className="text-gray-500 text-xs">· {m.years_experience}yrs</span>
                          </div>
                          {(m.profile as Record<string, string>)?.location && (
                            <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-xs">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{(m.profile as Record<string, string>).location}</span>
                            </div>
                          )}
                          {isUnlocked && phone && (
                            <p className="text-green-400 text-xs mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {phone}
                            </p>
                          )}
                          {!isUnlocked && (
                            <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Contact locked
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {phone && (
                            <button
                              onClick={() => handleContactClick(m)}
                              disabled={isProcessing}
                              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                                isUnlocked
                                  ? 'bg-green-600 hover:bg-green-500 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                              }`}
                            >
                              {isProcessing ? (
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : isUnlocked ? (
                                <Phone className="w-3 h-3" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                              {isUnlocked ? 'WhatsApp' : `${connectionFee} ETB`}
                            </button>
                          )}
                          <button
                            onClick={() => handleMessageClick(m)}
                            disabled={isProcessing}
                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                              isUnlocked
                                ? 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/30'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-400 border border-gray-600'
                            }`}
                          >
                            {isUnlocked ? <MessageSquare className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            Message
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/breakdown/new'); }}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> Post Breakdown Request
                </button>
                <button
                  onClick={() => { onClose(); navigate('/marketplace/mechanics'); }}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" /> All Mechanics
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {showPayConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-gray-900 border border-gray-700 rounded-2xl p-5 max-w-xs w-full shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Unlock Contact</h3>
                    <button onClick={() => setShowPayConfirm(null)} className="text-gray-500 hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 mb-4">
                    {isPro ? (
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-amber-400 text-sm font-medium">Pro plan — free unlock</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-yellow-400 font-semibold text-sm mb-1 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" /> Connection Fee
                        </p>
                        <p className="text-gray-300 text-sm">
                          Access <span className="text-white font-medium">{(showPayConfirm.mechanic.profile as Record<string, string>)?.name}'s</span> contact for{' '}
                          <span className="text-yellow-400 font-bold">{connectionFee} ETB</span> from your wallet.
                        </p>
                        <p className="text-gray-500 text-xs mt-1.5">Balance after: {(walletBalance - connectionFee).toLocaleString()} ETB</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPayConfirm(null)}
                      className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmUnlock}
                      disabled={!isPro && walletBalance < connectionFee}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold py-2 rounded-xl transition-colors text-sm"
                    >
                      {isPro ? 'Unlock Free' : `Pay ${connectionFee} ETB`}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
