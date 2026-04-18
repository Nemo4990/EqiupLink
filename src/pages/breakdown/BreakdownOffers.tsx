import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Wrench, MapPin, Clock, AlertTriangle, CheckCircle,
  XCircle, Briefcase, Navigation, Phone, User, FileText,
  ChevronRight, Banknote, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface BreakdownOffer {
  id: string;
  machine_type: string | null;
  machine_model: string | null;
  machine_serial: string | null;
  description: string | null;
  error_codes: string | null;
  location: string | null;
  urgency: string | null;
  status: string | null;
  dispatch_status: string | null;
  mechanic_offer_status: string | null;
  mechanic_offer_sent_at: string | null;
  dispatched_at: string | null;
  owner_location_shared: boolean | null;
  quote_amount: number | null;
  created_at: string;
  owner?: { name: string | null; phone: string | null } | null;
}

const URGENCY_COLOR: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-yellow-500 text-gray-900',
  low:      'bg-gray-600 text-white',
};

const DISPATCH_STATUS_INFO: Record<string, { label: string; color: string }> = {
  accepted:    { label: 'Accepted — Awaiting Quote', color: 'text-blue-300 bg-blue-950/60 border-blue-800/50' },
  quote_sent:  { label: 'Quote Sent — Awaiting Payment', color: 'text-blue-300 bg-blue-950/60 border-blue-800/50' },
  paid:        { label: 'Owner Paid — Stand By', color: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/50' },
  dispatched:  { label: 'Dispatched — Head to Site', color: 'text-teal-300 bg-teal-950/60 border-teal-800/50' },
  completed:   { label: 'Completed', color: 'text-gray-300 bg-gray-800 border-gray-700' },
};

const TABS = [
  { key: 'pending',   label: 'Pending Offers' },
  { key: 'accepted',  label: 'Active Jobs' },
  { key: 'completed', label: 'History' },
];

export default function BreakdownOffers() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [offers, setOffers] = useState<BreakdownOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) void loadOffers();
  }, [profile, activeTab]);

  async function loadOffers() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone)')
        .eq('assigned_mechanic_id', profile.id)
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('mechanic_offer_status', 'pending');
      } else if (activeTab === 'accepted') {
        query = query.eq('mechanic_offer_status', 'accepted').neq('dispatch_status', 'completed');
      } else {
        query = query.or('dispatch_status.eq.completed,mechanic_offer_status.eq.declined');
      }

      const { data, error } = await query;
      if (error) throw error;
      setOffers((data as BreakdownOffer[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job offers');
    } finally {
      setLoading(false);
    }
  }

  async function respond(offerId: string, accept: boolean) {
    setResponding(offerId);
    try {
      const newStatus = accept ? 'accepted' : 'declined';
      const { error } = await supabase
        .from('breakdown_requests')
        .update({ mechanic_offer_status: newStatus })
        .eq('id', offerId)
        .eq('assigned_mechanic_id', profile!.id);
      if (error) throw error;

      const offer = offers.find(o => o.id === offerId);
      const adminQuery = await supabase
        .from('breakdown_requests')
        .select('admin_id, owner_id')
        .eq('id', offerId)
        .maybeSingle();

      const notifyId = adminQuery.data?.admin_id || adminQuery.data?.owner_id;
      if (notifyId) {
        await supabase.from('notifications').insert({
          user_id: notifyId,
          type: accept ? 'mechanic_accepted_job' : 'mechanic_declined_job',
          title: accept ? 'Mechanic Accepted the Job' : 'Mechanic Declined the Job',
          message: accept
            ? `${profile!.name} accepted the job for ${offer?.machine_type} at ${offer?.location}. You can now send a quote to the owner.`
            : `${profile!.name} declined the job for ${offer?.machine_type} at ${offer?.location}. Please reassign another mechanic.`,
          data: { breakdown_id: offerId },
        });
      }

      toast.success(accept ? 'Job accepted!' : 'Job declined.');
      await loadOffers();
      if (accept) setActiveTab('accepted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to respond');
    } finally {
      setResponding(null);
    }
  }

  const isLocationVisible = (offer: BreakdownOffer) =>
    offer.dispatch_status === 'dispatched' || offer.dispatch_status === 'completed' || offer.owner_location_shared;

  const pendingCount = activeTab === 'pending' ? offers.length : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-16 pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="py-5 flex items-center gap-3">
          <Link to="/dashboard" className="p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black leading-tight">Job Offers</h1>
            <p className="text-gray-500 text-xs mt-0.5">Jobs assigned to you by the dispatch team</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1.5 mb-5">
          {TABS.map(tab => {
            const isPending = tab.key === 'pending';
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all relative ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {isPending && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-gray-900 text-xs font-black rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : offers.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">
              {activeTab === 'pending' ? 'No pending offers' :
               activeTab === 'accepted' ? 'No active jobs' : 'No history yet'}
            </p>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              {activeTab === 'pending'
                ? 'The dispatch team will notify you when a job is assigned to you.'
                : activeTab === 'accepted'
                ? 'Accepted jobs will appear here with live status updates.'
                : 'Your completed and declined jobs will show here.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {offers.map(offer => {
                const locationVisible = isLocationVisible(offer);
                const isResponding = responding === offer.id;
                const dispatchInfo = offer.dispatch_status ? DISPATCH_STATUS_INFO[offer.dispatch_status] : null;

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={`rounded-2xl overflow-hidden border ${
                      activeTab === 'pending'
                        ? 'border-amber-600/50 bg-gray-900'
                        : offer.mechanic_offer_status === 'declined'
                        ? 'border-gray-800 bg-gray-900/50'
                        : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    {/* Card banner */}
                    {activeTab === 'pending' && (
                      <div className="bg-amber-500/15 border-b border-amber-700/30 px-4 py-2.5 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-300 text-sm font-bold">Response Required</span>
                      </div>
                    )}
                    {offer.mechanic_offer_status === 'accepted' && activeTab !== 'pending' && dispatchInfo && (
                      <div className={`border-b px-4 py-2.5 flex items-center gap-2 ${dispatchInfo.color}`}>
                        {offer.dispatch_status === 'dispatched' ? (
                          <Navigation className="w-4 h-4 flex-shrink-0" />
                        ) : offer.dispatch_status === 'paid' ? (
                          <Banknote className="w-4 h-4 flex-shrink-0" />
                        ) : offer.dispatch_status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="text-sm font-bold">{dispatchInfo.label}</span>
                      </div>
                    )}
                    {offer.mechanic_offer_status === 'declined' && (
                      <div className="bg-gray-800/60 border-b border-gray-700 px-4 py-2.5 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-500 text-sm font-medium">Declined</span>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Machine info */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="font-black text-white text-base leading-tight">
                              {offer.machine_type || 'Machine'} {offer.machine_model || ''}
                            </span>
                          </div>
                          {offer.machine_serial && (
                            <p className="text-gray-500 text-xs font-mono">SN: {offer.machine_serial}</p>
                          )}
                        </div>
                        {offer.urgency && (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${URGENCY_COLOR[offer.urgency] || URGENCY_COLOR.low}`}>
                            {offer.urgency.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3">
                        {offer.description}
                      </p>

                      {/* Error codes */}
                      {offer.error_codes && (
                        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800/30 rounded-xl px-3 py-2 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Error codes: <span className="font-mono">{offer.error_codes}</span></span>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                        </span>
                        {!locationVisible ? (
                          <span className="flex items-center gap-1 italic">
                            <MapPin className="w-3.5 h-3.5" /> Location hidden until dispatch
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-teal-300">
                            <MapPin className="w-3.5 h-3.5" /> {offer.location}
                          </span>
                        )}
                      </div>

                      {/* Quote amount if available */}
                      {offer.quote_amount && (
                        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3 py-2.5 mb-4">
                          <Banknote className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-emerald-300 font-bold">{offer.quote_amount.toLocaleString()} ETB</span>
                          <span className="text-gray-500 text-xs ml-1">quoted</span>
                        </div>
                      )}

                      {/* Dispatched: reveal location + contact */}
                      {locationVisible && offer.dispatch_status === 'dispatched' && (
                        <div className="bg-teal-950/50 border border-teal-800/50 rounded-2xl p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Navigation className="w-5 h-5 text-teal-400" />
                            <p className="text-teal-300 font-black">Head to Site Now</p>
                          </div>
                          <div className="space-y-2.5">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-white font-semibold text-sm leading-snug">{offer.location || '—'}</span>
                            </div>
                            {offer.owner?.name && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-300 text-sm">{offer.owner.name}</span>
                              </div>
                            )}
                            {offer.owner?.phone && (
                              <a
                                href={`tel:${offer.owner.phone}`}
                                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-900 font-black text-sm py-3 rounded-xl transition-colors w-full mt-1"
                              >
                                <Phone className="w-4 h-4" />
                                Call Owner — {offer.owner.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Active job status message */}
                      {activeTab === 'accepted' && offer.dispatch_status !== 'dispatched' && offer.dispatch_status !== 'completed' && (
                        <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 mb-4 text-sm text-gray-300 leading-relaxed">
                          {offer.dispatch_status === 'quote_sent'
                            ? 'Quote has been sent to the owner. Waiting for owner to approve and pay.'
                            : offer.dispatch_status === 'paid'
                            ? 'Owner has paid. Admin will officially dispatch you shortly. Stand by.'
                            : 'Your acceptance is confirmed. Admin is preparing a formal quote for the owner.'}
                        </div>
                      )}

                      {/* ACCEPT / DECLINE buttons — BIG mobile-friendly */}
                      {activeTab === 'pending' && (
                        <div className="space-y-3 mt-2">
                          <button
                            onClick={() => respond(offer.id, true)}
                            disabled={isResponding}
                            className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-gray-900 font-black text-base py-4 rounded-2xl transition-all"
                          >
                            {isResponding ? (
                              <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-5 h-5" />
                            )}
                            {isResponding ? 'Accepting...' : 'Accept Job'}
                          </button>
                          <button
                            onClick={() => respond(offer.id, false)}
                            disabled={isResponding}
                            className="w-full flex items-center justify-center gap-3 border-2 border-gray-700 hover:border-red-700 hover:text-red-400 active:bg-red-950/30 disabled:opacity-50 text-gray-300 font-bold text-base py-4 rounded-2xl transition-all"
                          >
                            <XCircle className="w-5 h-5" />
                            {isResponding ? '...' : 'Decline'}
                          </button>
                        </div>
                      )}

                      {/* View detail link for active/history */}
                      {activeTab !== 'pending' && (
                        <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                          <span className="font-mono">#{offer.id.slice(0, 8).toUpperCase()}</span>
                          {offer.mechanic_offer_status === 'accepted' && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Zap className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state help for pending */}
        {!loading && activeTab === 'pending' && offers.length === 0 && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-yellow-400" />
              How it works
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Owner submits a machine breakdown request' },
                { step: '2', text: 'Admin reviews and assigns you to the job' },
                { step: '3', text: 'You accept or decline the offer here' },
                { step: '4', text: 'Admin sends quote to owner — owner pays — you get dispatched with full site details' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <p className="text-gray-400 text-sm leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
            <Link
              to="/dashboard"
              className="mt-4 flex items-center justify-center gap-2 border border-gray-700 hover:border-yellow-400/50 text-gray-300 hover:text-yellow-400 font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Back to Dashboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
