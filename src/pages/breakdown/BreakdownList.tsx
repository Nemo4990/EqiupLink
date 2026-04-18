import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, MapPin, Clock, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BreakdownRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PaymentModal from '../../components/ui/PaymentModal';
import { format } from 'date-fns';

const URGENCY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
  high: { color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800' },
  critical: { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800' },
};

const STATUS_STYLES: Record<string, string> = {
  open: 'text-blue-400 bg-blue-900/30',
  assigned: 'text-yellow-400 bg-yellow-900/30',
  in_progress: 'text-orange-400 bg-orange-900/30',
  resolved: 'text-green-400 bg-green-900/30',
  cancelled: 'text-gray-400 bg-gray-800',
};

export default function BreakdownList() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BreakdownRequest[]>([]);

  useEffect(() => {
    if (profile?.role === 'mechanic' || profile?.role === 'technician') {
      navigate('/breakdown/offers', { replace: true });
    }
  }, [profile, navigate]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'my'>('all');
  const [mechHasPaid, setMechHasPaid] = useState(false);
  const [mechPending, setMechPending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingRespondJob, setPendingRespondJob] = useState<BreakdownRequest | null>(null);

  const isMechanic = profile?.role === 'mechanic';

  useEffect(() => {
    if (user && isMechanic && profile?.role !== 'admin') {
      Promise.all([
        supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('fee_type', 'mechanic_contact')
          .eq('status', 'approved')
          .maybeSingle(),
        supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('fee_type', 'mechanic_contact')
          .eq('status', 'pending')
          .maybeSingle(),
      ]).then(([approved, pending]) => {
        setMechHasPaid(!!approved.data);
        setMechPending(!!pending.data);
      });
    }
  }, [user, isMechanic, profile]);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      let query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, avatar_url, location)')
        .order('created_at', { ascending: false });

      if (filter === 'open') query = query.eq('status', 'open');
      else if (filter === 'my' && profile) {
        query = isMechanic
          ? query.eq('assigned_mechanic_id', profile.id)
          : query.eq('owner_id', profile.id);
      }

      const { data } = await query.limit(50);
      setRequests((data || []) as BreakdownRequest[]);
      setLoading(false);
    };
    fetchRequests();
  }, [filter, profile]);

  const handleRespond = (req: BreakdownRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (mechHasPaid || profile?.role === 'admin') {
      navigate(`/messages?user=${req.owner_id}&request=${req.id}`);
    } else {
      setPendingRespondJob(req);
      setShowPayment(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <h1 className="text-3xl font-black text-white">Breakdown Requests</h1>
              </div>
              <p className="text-gray-400">Emergency machine breakdowns needing immediate service</p>
            </div>
            {profile?.role === 'owner' && (
              <Link
                to="/breakdown/new"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Post Breakdown
              </Link>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            {(['all', 'open', 'my'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'my' ? (isMechanic ? 'My Jobs' : 'My Requests') : f === 'all' ? 'All Requests' : 'Open'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isMechanic && !mechHasPaid && profile?.role !== 'admin' && (
          <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between gap-4 ${
            mechPending ? 'bg-yellow-900/20 border-yellow-800' : 'bg-gray-900 border-orange-800'
          }`}>
            <div className="flex items-center gap-3">
              {mechPending
                ? <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                : <Lock className="w-5 h-5 text-orange-400 flex-shrink-0" />
              }
              <div>
                {mechPending ? (
                  <>
                    <p className="text-yellow-400 font-semibold text-sm">Payment Under Review</p>
                    <p className="text-gray-400 text-xs">You'll be able to respond to jobs once your payment is approved.</p>
                  </>
                ) : (
                  <>
                    <p className="text-orange-400 font-semibold text-sm">Commission Fee Required to Respond</p>
                    <p className="text-gray-400 text-xs">Pay a one-time commission fee to contact equipment owners and accept jobs.</p>
                  </>
                )}
              </div>
            </div>
            {!mechPending && (
              <button
                onClick={() => { setPendingRespondJob(null); setShowPayment(true); }}
                className="flex-shrink-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Lock className="w-4 h-4" /> Pay Fee
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading requests..." /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No breakdown requests</h3>
            <p className="text-gray-400 mb-4">
              {filter === 'open' ? 'No open requests at the moment.' : 'No requests found.'}
            </p>
            {profile?.role === 'owner' && (
              <Link to="/breakdown/new" className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Post First Request
              </Link>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {requests.map((req) => {
              const urgStyle = URGENCY_STYLES[req.urgency] || URGENCY_STYLES.medium;
              return (
                <motion.div
                  key={req.id}
                  whileHover={{ x: 4 }}
                  className={`bg-gray-900 border ${urgStyle.border} rounded-xl p-5 cursor-pointer hover:border-opacity-100 transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold text-lg">{req.machine_model}</h3>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${urgStyle.color} ${urgStyle.bg}`}>
                          {req.urgency} urgency
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1 capitalize">{req.machine_type}</p>
                      <p className="text-gray-300 mt-2 line-clamp-2">{req.description}</p>

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {req.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {format(new Date(req.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {req.image_url && (
                        <img src={req.image_url} alt="breakdown" className="w-20 h-16 object-cover rounded-lg mb-2" />
                      )}
                      {isMechanic && req.status === 'open' && (
                        <button
                          onClick={(e) => handleRespond(req, e)}
                          disabled={mechPending}
                          className={`inline-flex items-center gap-1.5 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors ${
                            mechHasPaid || profile?.role === 'admin'
                              ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                              : mechPending
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-orange-600/20 text-orange-400 border border-orange-700 hover:bg-orange-600/40'
                          }`}
                        >
                          {mechHasPaid || profile?.role === 'admin'
                            ? 'Respond'
                            : mechPending
                            ? <><Clock className="w-3.5 h-3.5" /> Pending</>
                            : <><Lock className="w-3.5 h-3.5" /> Pay to Respond</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => { setShowPayment(false); setPendingRespondJob(null); }}
        feeType="mechanic_contact"
        onSuccess={(method) => {
          setShowPayment(false);
          if (method === 'wallet') {
            setMechHasPaid(true);
            if (pendingRespondJob) {
              navigate(`/messages?user=${pendingRespondJob.owner_id}&request=${pendingRespondJob.id}`);
            }
          } else {
            setMechHasPaid(false);
            setMechPending(true);
          }
          setPendingRespondJob(null);
        }}
      />
    </div>
  );
}
