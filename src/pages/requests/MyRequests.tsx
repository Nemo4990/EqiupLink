import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MapPin, Clock, ChevronDown, ChevronUp, Star,
  CheckCircle, Phone, MessageSquare, Lock, Wrench, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ServiceRequest, Offer, PlatformSetting } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  open: 'text-blue-400 bg-blue-900/30',
  in_progress: 'text-orange-400 bg-orange-900/30',
  completed: 'text-green-400 bg-green-900/30',
  cancelled: 'text-gray-400 bg-gray-800',
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanic: 'Mechanic',
  electrician: 'Electrician',
  hydraulics: 'Hydraulics',
  transmission: 'Transmission',
  engine: 'Engine',
  other: 'Other',
};

export default function MyRequests() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [offersMap, setOffersMap] = useState<Record<string, Offer[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [connectionFee, setConnectionFee] = useState(20);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{ offerId: string; techName: string; price: number } | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (profile) {
      loadSettings();
      fetchRequests();
      fetchWalletBalance();
    }
  }, [profile]);

  const fetchWalletBalance = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', profile.id)
      .maybeSingle();
    setWalletBalance(data?.balance ?? 0);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'connection_fee')
      .maybeSingle();
    if (data) setConnectionFee(data.setting_value);
  };

  const fetchRequests = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('service_requests')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false });

    const reqs = (data || []) as ServiceRequest[];
    setRequests(reqs);

    if (reqs.length > 0) {
      const { data: offersData } = await supabase
        .from('offers')
        .select('*, technician:profiles!offers_technician_id_fkey(id, name, avatar_url, phone)')
        .in('service_request_id', reqs.map(r => r.id))
        .order('created_at', { ascending: false });

      const grouped: Record<string, Offer[]> = {};
      (offersData || []).forEach((o: Offer) => {
        if (!grouped[o.service_request_id]) grouped[o.service_request_id] = [];
        grouped[o.service_request_id].push(o);
      });
      setOffersMap(grouped);
    }

    setLoading(false);
  };

  const handleAcceptOffer = (offerId: string, techName: string, price: number) => {
    setShowConfirmModal({ offerId, techName, price });
  };

  const confirmAccept = async () => {
    if (!showConfirmModal || !profile) return;
    const { offerId } = showConfirmModal;
    setAccepting(offerId);
    setShowConfirmModal(null);

    const offer = Object.values(offersMap).flat().find(o => o.id === offerId);
    if (!offer) { setAccepting(null); return; }

    if (walletBalance < connectionFee) {
      toast.error(`You need ${connectionFee} ETB to unlock this contact. Please top up your wallet.`);
      setAccepting(null);
      navigate('/wallet');
      return;
    }

    setUnlocking(offerId);
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!walletData || walletData.balance < connectionFee) {
        toast.error(`Insufficient balance. You need ${connectionFee} ETB.`);
        setUnlocking(null);
        setAccepting(null);
        return;
      }

      const newBalance = walletData.balance - connectionFee;

      await supabase.from('wallet_transactions').insert({
        wallet_id: walletData.id,
        user_id: profile.id,
        type: 'deduction',
        amount: connectionFee,
        balance_after: newBalance,
        description: `Connection fee — Accept offer from technician`,
        reference_id: offerId,
        reference_type: 'offer',
        status: 'completed',
      });

      await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletData.id);
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);
      setWalletBalance(newBalance);

      await supabase.from('offers').update({ status: 'accepted', is_contact_unlocked: true }).eq('id', offerId);
      await supabase.from('service_requests').update({ status: 'in_progress', accepted_offer_id: offerId }).eq('id', offer.service_request_id);

      const { data: settingData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'commission_rate')
        .maybeSingle();
      const commissionRate = settingData?.setting_value ?? 7.5;

      await supabase.from('active_jobs').insert({
        service_request_id: offer.service_request_id,
        offer_id: offerId,
        customer_id: profile.id,
        technician_id: offer.technician_id,
        agreed_price: offer.price,
        commission_rate: commissionRate,
        status: 'accepted',
      });

      await supabase.from('contact_unlocks').insert({
        unlock_type: 'customer_to_technician',
        unlocker_id: profile.id,
        target_id: offer.technician_id,
        reference_id: offerId,
        amount_paid: connectionFee,
        method: 'wallet',
      });

      await supabase.from('notifications').insert([
        {
          user_id: offer.technician_id,
          title: 'Offer Accepted!',
          message: `${profile.name} accepted your offer. You can now contact them to start the job.`,
          type: 'success',
          related_id: offerId,
        },
        {
          user_id: profile.id,
          title: 'Contact Unlocked',
          message: `You unlocked the technician's contact. A connection fee of ${connectionFee} ETB was charged.`,
          type: 'payment',
          related_id: offerId,
        },
      ]);

      await refreshProfile();
      await fetchRequests();
      toast.success('Offer accepted! Technician contact revealed.');
    } catch {
      toast.error('Failed to accept offer. Please try again.');
    }
    setUnlocking(null);
    setAccepting(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">My Service Requests</h1>
            <p className="text-gray-400 text-sm mt-1">View offers from technicians and accept the best one</p>
          </div>
          <Link
            to="/requests/new"
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New Request
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests yet</h3>
            <p className="text-gray-400 mb-6">Post your first service request — it's free!</p>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Post a Request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const offers = offersMap[req.id] || [];
              const isExpanded = expandedId === req.id;
              const acceptedOffer = offers.find(o => o.status === 'accepted');

              return (
                <motion.div
                  key={req.id}
                  layout
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-800/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold">{req.title}</h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-800 text-gray-400">
                            {CATEGORY_LABELS[req.category] || req.category}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">{req.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {req.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                          </span>
                          {req.budget && (
                            <span className="text-yellow-400">Budget: {req.budget.toLocaleString()} ETB</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-xl font-black text-yellow-400">{offers.length}</p>
                          <p className="text-gray-500 text-xs">offer{offers.length !== 1 ? 's' : ''}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-800 overflow-hidden"
                      >
                        <div className="p-5">
                          {offers.length === 0 ? (
                            <div className="text-center py-8">
                              <Clock className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                              <p className="text-gray-400 text-sm">Waiting for technician offers...</p>
                              <p className="text-gray-600 text-xs mt-1">You'll be notified when offers arrive</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <h4 className="text-white font-semibold text-sm mb-3">
                                Offers ({offers.length})
                              </h4>
                              {offers.map(offer => {
                                const tech = offer.technician as Record<string, string> | undefined;
                                const isAccepted = offer.status === 'accepted';
                                const isContactRevealed = offer.is_contact_unlocked;

                                return (
                                  <div
                                    key={offer.id}
                                    className={`rounded-xl border p-4 transition-colors ${
                                      isAccepted
                                        ? 'border-green-700/50 bg-green-900/10'
                                        : 'border-gray-700 bg-gray-800/40'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                          {tech?.avatar_url ? (
                                            <img src={tech.avatar_url} alt={tech.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="text-gray-900 font-bold text-sm">{(tech?.name || '?')[0]}</span>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-white font-semibold text-sm">{tech?.name || 'Technician'}</p>
                                          {isContactRevealed && tech?.phone ? (
                                            <p className="text-green-400 text-xs flex items-center gap-1">
                                              <Phone className="w-3 h-3" /> {tech.phone}
                                            </p>
                                          ) : (
                                            <p className="text-gray-500 text-xs flex items-center gap-1">
                                              <Lock className="w-3 h-3" /> Contact hidden
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-white font-black text-lg">
                                          {offer.price.toLocaleString()} <span className="text-sm font-medium text-gray-400">ETB</span>
                                        </p>
                                        {isAccepted && (
                                          <span className="flex items-center gap-1 text-xs text-green-400">
                                            <CheckCircle className="w-3 h-3" /> Accepted
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {offer.message && (
                                      <p className="text-gray-400 text-sm mt-3 leading-relaxed">{offer.message}</p>
                                    )}

                                    {!isAccepted && req.status === 'open' && (
                                      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                                        <p className="text-gray-500 text-xs">
                                          Accept to unlock contact · {connectionFee} ETB connection fee
                                        </p>
                                        <button
                                          onClick={() => handleAcceptOffer(offer.id, tech?.name || 'Technician', offer.price)}
                                          disabled={accepting === offer.id || unlocking === offer.id}
                                          className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                                        >
                                          {accepting === offer.id ? (
                                            <div className="w-3 h-3 border border-gray-900 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <CheckCircle className="w-3.5 h-3.5" />
                                          )}
                                          Accept Offer
                                        </button>
                                      </div>
                                    )}

                                    {isAccepted && isContactRevealed && (
                                      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2 flex-wrap">
                                        <button
                                          onClick={() => navigate(`/messages?user=${offer.technician_id}`)}
                                          className="flex items-center gap-1.5 border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" /> Message
                                        </button>
                                        {req.status === 'completed' && (
                                          <Link
                                            to={`/review/${offer.technician_id}/${req.id}`}
                                            className="flex items-center gap-1.5 bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 hover:bg-yellow-400/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            <Star className="w-3.5 h-3.5" /> Rate Technician
                                          </Link>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Accept Offer</h3>
                <button onClick={() => setShowConfirmModal(null)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-5">
                <p className="text-yellow-400 font-semibold text-sm mb-1">Connection Fee Required</p>
                <p className="text-gray-300 text-sm">
                  To access <span className="text-white font-medium">{showConfirmModal.techName}'s</span> contact details,
                  a connection fee of <span className="text-yellow-400 font-bold">{connectionFee} ETB</span> will be
                  deducted from your wallet.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAccept}
                  disabled={!!accepting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {accepting ? 'Processing...' : `Pay ${connectionFee} ETB`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
