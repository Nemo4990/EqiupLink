import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Wrench, MapPin, Clock, AlertTriangle, CheckCircle,
  XCircle, Briefcase, Navigation, Phone, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  owner?: { name: string | null; phone: string | null };
}

const URGENCY_COLOR: Record<string, string> = {
  critical: 'bg-red-900/60 text-red-300',
  high: 'bg-orange-900/60 text-orange-300',
  medium: 'bg-yellow-900/60 text-yellow-300',
  low: 'bg-gray-800 text-gray-300',
};

const TABS = [
  { key: 'pending', label: 'Pending Offers' },
  { key: 'accepted', label: 'Active Jobs' },
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
        query = query.in('mechanic_offer_status', ['accepted', 'declined'])
          .or('dispatch_status.eq.completed,mechanic_offer_status.eq.declined');
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
      if (offer) {
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
              ? `${profile!.name} accepted the job for ${offer.machine_type} at ${offer.location}. You can now proceed to send a quote to the owner.`
              : `${profile!.name} declined the job for ${offer.machine_type} at ${offer.location}. Please reassign another mechanic.`,
            data: { breakdown_id: offerId },
          });
        }
      }

      toast.success(accept ? 'Job accepted! Admin will prepare and send a quote to the owner.' : 'Job declined.');
      await loadOffers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to respond');
    } finally {
      setResponding(null);
    }
  }

  const isLocationVisible = (offer: BreakdownOffer) =>
    offer.dispatch_status === 'dispatched' || offer.dispatch_status === 'completed' || offer.owner_location_shared;

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black">Breakdown Job Offers</h1>
          <p className="text-gray-400 text-sm mt-1">Accept or decline jobs assigned to you by the dispatch team.</p>
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : offers.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">
              {activeTab === 'pending' ? 'No pending job offers right now.' :
               activeTab === 'accepted' ? 'No active jobs.' : 'No job history yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {offers.map(offer => (
                <motion.div key={offer.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className={`bg-gray-900 border rounded-2xl overflow-hidden ${
                    activeTab === 'pending' ? 'border-amber-700/40' : 'border-gray-800'
                  }`}>
                  {activeTab === 'pending' && (
                    <div className="bg-amber-500/10 border-b border-amber-700/30 px-5 py-2.5 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300 text-sm font-semibold">New Job Offer -- Response Required</span>
                    </div>
                  )}
                  {offer.mechanic_offer_status === 'accepted' && activeTab !== 'pending' && (
                    <div className="bg-emerald-500/10 border-b border-emerald-700/30 px-5 py-2.5 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm font-semibold">Active Job</span>
                      {offer.dispatch_status === 'dispatched' && (
                        <span className="ml-auto text-xs text-teal-300 bg-teal-900/40 px-2 py-0.5 rounded-full">Dispatched -- Head to Site</span>
                      )}
                      {offer.dispatch_status === 'paid' && (
                        <span className="ml-auto text-xs text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full">Payment Confirmed</span>
                      )}
                      {offer.dispatch_status === 'quote_sent' && (
                        <span className="ml-auto text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full">Awaiting Owner Payment</span>
                      )}
                    </div>
                  )}
                  {offer.mechanic_offer_status === 'declined' && (
                    <div className="bg-gray-800/50 border-b border-gray-700 px-5 py-2.5 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm font-semibold">Declined</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-amber-400" />
                          <span className="font-bold">{offer.machine_type || 'Machine'} {offer.machine_model || ''}</span>
                        </div>
                        {offer.machine_serial && (
                          <div className="text-xs text-gray-500 font-mono mt-0.5">SN: {offer.machine_serial}</div>
                        )}
                      </div>
                      {offer.urgency && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${URGENCY_COLOR[offer.urgency] || URGENCY_COLOR.low}`}>
                          {offer.urgency.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-300 mb-4 line-clamp-3">{offer.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
                      {isLocationVisible(offer) ? (
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Navigation className="w-3.5 h-3.5 flex-shrink-0" /> {offer.location || '—'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="italic">Location revealed after dispatch</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {offer.mechanic_offer_sent_at
                          ? new Date(offer.mechanic_offer_sent_at).toLocaleDateString()
                          : new Date(offer.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {offer.error_codes && (
                      <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2 mb-4">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Error codes: <span className="font-mono">{offer.error_codes}</span>
                      </div>
                    )}

                    {isLocationVisible(offer) && offer.dispatch_status === 'dispatched' && (
                      <div className="bg-teal-950/40 border border-teal-800/40 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Navigation className="w-4 h-4 text-teal-400" />
                          <p className="text-teal-300 font-semibold text-sm">Site Location & Contact</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-white font-medium">{offer.location || '—'}</span>
                          </div>
                          {offer.owner && (
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-300">{offer.owner.name}</span>
                            </div>
                          )}
                          {offer.owner?.phone && (
                            <a href={`tel:${offer.owner.phone}`}
                              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors mt-1">
                              <Phone className="w-3.5 h-3.5" />
                              Call Owner: {offer.owner.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => respond(offer.id, false)}
                          disabled={responding === offer.id}
                          className="flex-1 border border-gray-700 hover:border-red-700 hover:text-red-400 text-gray-300 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                          <XCircle className="w-4 h-4" />
                          {responding === offer.id ? '...' : 'Decline'}
                        </button>
                        <button
                          onClick={() => respond(offer.id, true)}
                          disabled={responding === offer.id}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {responding === offer.id ? 'Accepting...' : 'Accept Job'}
                        </button>
                      </div>
                    )}

                    {activeTab === 'accepted' && offer.dispatch_status !== 'dispatched' && (
                      <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 text-sm text-blue-300">
                        {offer.dispatch_status === 'quote_sent'
                          ? 'Quote sent to owner. Waiting for owner to approve and pay.'
                          : offer.dispatch_status === 'paid'
                          ? 'Owner has paid. Admin will dispatch you shortly. Stand by.'
                          : 'Your acceptance has been received. Admin is preparing a quote for the owner.'}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
