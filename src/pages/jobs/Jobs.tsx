import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, CheckCircle, MessageSquare, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BreakdownRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PaymentModal from '../../components/ui/PaymentModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  open: { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  assigned: { color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  in_progress: { color: 'text-orange-400', bg: 'bg-orange-900/30' },
  resolved: { color: 'text-green-400', bg: 'bg-green-900/30' },
  cancelled: { color: 'text-gray-400', bg: 'bg-gray-800' },
};

const URGENCY_STYLES: Record<string, string> = {
  low: 'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
};

type TabType = 'available' | 'my_jobs';

export default function Jobs() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<BreakdownRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('available');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    if (user && profile?.role !== 'admin') {
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
        setHasPaid(!!approved.data);
        setPendingPayment(!!pending.data);
        setCheckingPayment(false);
      });
    } else {
      setHasPaid(true);
      setCheckingPayment(false);
    }
  }, [user, profile]);

  const fetchJobs = async () => {
    if (!profile) return;
    setLoading(true);
    let query;
    if (tab === 'available') {
      query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone, location)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
    } else {
      query = supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone, location)')
        .eq('assigned_mechanic_id', profile.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
    }
    const { data } = await query;
    setJobs((data || []) as BreakdownRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [profile, tab]);

  const handleAcceptJob = (jobId: string, ownerId: string) => {
    if (!hasPaid && profile?.role !== 'admin') {
      setShowPayment(true);
      return;
    }
    acceptJob(jobId, ownerId);
  };

  const handleMessageOwner = (ownerId: string) => {
    if (!hasPaid && profile?.role !== 'admin') {
      setShowPayment(true);
      return;
    }
    navigate(`/messages?user=${ownerId}`);
  };

  const acceptJob = async (jobId: string, ownerId: string) => {
    if (!profile) return;
    setAccepting(jobId);
    const { error } = await supabase
      .from('breakdown_requests')
      .update({ assigned_mechanic_id: profile.id, status: 'assigned' })
      .eq('id', jobId)
      .eq('status', 'open');

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        title: 'Mechanic Accepted Your Request',
        message: `${profile.name} has accepted your breakdown request and will contact you shortly.`,
        type: 'job_request',
        related_id: jobId,
      });
      toast.success('Job accepted! Contact the owner to discuss details.');
      fetchJobs();
    } else {
      toast.error('Failed to accept job. It may have been taken.');
    }
    setAccepting(null);
  };

  const updateStatus = async (jobId: string, status: string, ownerId: string) => {
    const { error } = await supabase
      .from('breakdown_requests')
      .update({ status })
      .eq('id', jobId);

    if (!error) {
      if (status === 'in_progress') {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Repair Work Started',
          message: 'The mechanic has started working on your machine.',
          type: 'info',
        });
      } else if (status === 'resolved') {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Repair Completed!',
          message: 'Your breakdown request has been marked as resolved. Please leave a review.',
          type: 'success',
        });
      }
      toast.success('Status updated!');
      fetchJobs();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-black text-white">Jobs</h1>
        </div>

        {!checkingPayment && !hasPaid && profile?.role !== 'admin' && (
          <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between gap-4 ${
            pendingPayment ? 'bg-yellow-900/20 border-yellow-800' : 'bg-gray-900 border-orange-800'
          }`}>
            <div className="flex items-center gap-3">
              {pendingPayment
                ? <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                : <Lock className="w-5 h-5 text-orange-400 flex-shrink-0" />
              }
              <div>
                {pendingPayment ? (
                  <>
                    <p className="text-yellow-400 font-semibold text-sm">Payment Under Review</p>
                    <p className="text-gray-400 text-xs">Once approved, you can accept jobs and contact equipment owners.</p>
                  </>
                ) : (
                  <>
                    <p className="text-orange-400 font-semibold text-sm">Commission Fee Required</p>
                    <p className="text-gray-400 text-xs">Pay a one-time commission fee to accept jobs and contact equipment owners.</p>
                  </>
                )}
              </div>
            </div>
            {!pendingPayment && (
              <button
                onClick={() => setShowPayment(true)}
                className="flex-shrink-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Lock className="w-4 h-4" /> Pay Fee
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(['available', 'my_jobs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'available' ? 'Available Jobs' : 'My Jobs'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {tab === 'available' ? 'No available jobs' : 'No jobs yet'}
            </h3>
            <p className="text-gray-400">
              {tab === 'available'
                ? 'Check back soon for new breakdown requests in your area.'
                : 'Accept jobs from the Available Jobs tab to see them here.'}
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {jobs.map((job) => {
              const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.open;
              const canInteract = hasPaid || profile?.role === 'admin';
              return (
                <motion.div
                  key={job.id}
                  whileHover={{ x: 2 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{job.machine_model}</h3>
                      <p className="text-gray-400 text-sm capitalize">{job.machine_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${URGENCY_STYLES[job.urgency]}`}>
                        {job.urgency}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusStyle.color} ${statusStyle.bg}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-3">{job.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(job.created_at), 'MMM d, h:mm a')}</span>
                  </div>

                  {(job as any).owner && canInteract && (
                    <div className="flex items-center gap-2 mb-4 text-sm">
                      <span className="text-gray-500">Posted by:</span>
                      <span className="text-gray-300 font-medium">{(job as any).owner.name}</span>
                      {(job as any).owner.phone && (
                        <span className="text-gray-500">· {(job as any).owner.phone}</span>
                      )}
                    </div>
                  )}

                  {!canInteract && (
                    <div className="flex items-center gap-2 mb-4 text-sm bg-gray-800/50 rounded-lg px-3 py-2">
                      <Lock className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-500">Owner details visible after payment approval</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {tab === 'available' && job.status === 'open' && (
                      <>
                        <button
                          onClick={() => handleAcceptJob(job.id, job.owner_id)}
                          disabled={accepting === job.id || pendingPayment}
                          className={`flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg transition-colors ${
                            canInteract
                              ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                              : pendingPayment
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 hover:bg-yellow-400/30'
                          }`}
                        >
                          {canInteract ? (
                            <><CheckCircle className="w-4 h-4" />{accepting === job.id ? 'Accepting...' : 'Accept Job'}</>
                          ) : pendingPayment ? (
                            <><Clock className="w-4 h-4" /> Pending</>
                          ) : (
                            <><Lock className="w-4 h-4" /> Pay to Accept</>
                          )}
                        </button>
                        <button
                          onClick={() => handleMessageOwner(job.owner_id)}
                          disabled={pendingPayment}
                          className={`flex items-center gap-2 border text-sm px-4 py-2 rounded-lg transition-colors ${
                            canInteract
                              ? 'border-gray-700 text-gray-300 hover:border-yellow-400 hover:text-yellow-400'
                              : pendingPayment
                              ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                              : 'border-orange-700 text-orange-400 hover:bg-orange-600/10'
                          }`}
                        >
                          {canInteract ? (
                            <><MessageSquare className="w-4 h-4" /> Message</>
                          ) : (
                            <><Lock className="w-4 h-4" /> Pay to Message</>
                          )}
                        </button>
                      </>
                    )}

                    {tab === 'my_jobs' && (
                      <>
                        {job.status === 'assigned' && (
                          <button
                            onClick={() => updateStatus(job.id, 'in_progress', job.owner_id)}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" /> Start Work
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => updateStatus(job.id, 'resolved', job.owner_id)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" /> Mark Resolved
                          </button>
                        )}
                        {job.status === 'resolved' && (
                          <span className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" /> Completed
                          </span>
                        )}
                        <button
                          onClick={() => handleMessageOwner(job.owner_id)}
                          className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" /> Message Owner
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        feeType="mechanic_contact"
        onSuccess={() => {
          setHasPaid(false);
          setPendingPayment(true);
        }}
      />
    </div>
  );
}
