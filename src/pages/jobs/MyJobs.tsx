import { useEffect, useState } from 'react';
import { Briefcase, MapPin, DollarSign, User, Clock, AlertCircle, CheckCircle, Loader, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface JobMatch {
  id: string;
  job_id: string;
  status: string;
  match_reason: string;
  job: {
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    estimated_duration: string;
    budget_min: number;
    budget_max: number;
    urgency: string;
    owner: { name: string; email: string };
    created_at: string;
  };
}

interface JobAcceptance {
  id: string;
  job_id: string;
  status: string;
  accepted_at: string;
  started_at: string | null;
  completed_at: string | null;
  job: {
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    estimated_duration: string;
    budget_min: number;
    budget_max: number;
    owner: { name: string; email: string };
  };
}

export default function MyJobs() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [acceptances, setAcceptances] = useState<JobAcceptance[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [matchesRes, acceptancesRes] = await Promise.all([
        supabase
          .from('job_matches')
          .select(
            `
            id,
            job_id,
            status,
            match_reason,
            job:job_postings(id, title, description, location, category, estimated_duration, budget_min, budget_max, urgency, owner:profiles!job_postings_owner_id_fkey(name, email), created_at)
          `
          )
          .eq('mechanic_id', user?.id)
          .eq('status', 'suggested')
          .order('created_at', { ascending: false }),
        supabase
          .from('job_acceptances')
          .select(
            `
            id,
            job_id,
            status,
            accepted_at,
            started_at,
            completed_at,
            job:job_postings(id, title, description, location, category, estimated_duration, budget_min, budget_max, owner:profiles!job_postings_owner_id_fkey(name, email))
          `
          )
          .eq('mechanic_id', user?.id)
          .order('accepted_at', { ascending: false }),
      ]);

      if (matchesRes.error) throw matchesRes.error;
      if (acceptancesRes.error) throw acceptancesRes.error;

      setMatches(matchesRes.data || []);
      setAcceptances(acceptancesRes.data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (match: JobMatch) => {
    setAcceptingId(match.id);
    try {
      const { error: acceptError } = await supabase.from('job_acceptances').insert({
        job_id: match.job_id,
        mechanic_id: user?.id,
        accepted_at: new Date().toISOString(),
        status: 'accepted',
      });

      if (acceptError) throw acceptError;

      const { error: matchError } = await supabase
        .from('job_matches')
        .update({ status: 'accepted' })
        .eq('id', match.id);

      if (matchError) throw matchError;

      const { error: jobError } = await supabase
        .from('job_postings')
        .update({ status: 'in_progress', assigned_mechanic_id: user?.id })
        .eq('id', match.job_id);

      if (jobError) throw jobError;

      toast.success('Job accepted! You can now start working on it.');
      await loadJobs();
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error('Failed to accept job');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineJob = async (match: JobMatch) => {
    setDeclineId(match.id);
    try {
      const { error } = await supabase
        .from('job_matches')
        .update({ status: 'declined' })
        .eq('id', match.id);

      if (error) throw error;

      toast.success('Job declined');
      await loadJobs();
    } catch (error) {
      console.error('Error declining job:', error);
      toast.error('Failed to decline job');
    } finally {
      setDeclineId(null);
    }
  };

  const handleCompleteJob = async (acceptance: JobAcceptance) => {
    try {
      const { error: acceptError } = await supabase
        .from('job_acceptances')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', acceptance.id);

      if (acceptError) throw acceptError;

      const { error: jobError } = await supabase
        .from('job_postings')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', acceptance.job_id);

      if (jobError) throw jobError;

      toast.success('Job marked as complete. Owner will now rate you.');
      await loadJobs();
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('Failed to complete job');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">My Jobs</h1>
          <p className="text-gray-400">Manage job offers and track your work</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {matches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Pending Offers ({matches.length})
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">{match.job.title}</h3>
                          <p className="text-sm text-gray-400">{match.job.description.substring(0, 80)}...</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            match.job.urgency === 'urgent'
                              ? 'bg-red-900/30 text-red-400'
                              : match.job.urgency === 'high'
                                ? 'bg-orange-900/30 text-orange-400'
                                : 'bg-yellow-900/30 text-yellow-400'
                          }`}
                        >
                          {match.job.urgency}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {match.job.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {match.job.budget_min} - {match.job.budget_max} ETB
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {match.job.category}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {match.job.estimated_duration}
                        </div>
                      </div>

                      <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-4">
                        <p className="text-sm text-blue-300">{match.match_reason}</p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-800">
                        <User className="w-4 h-4" />
                        <span>{match.job.owner.name}</span>
                        <span className="text-gray-600">•</span>
                        <span>{match.job.owner.email}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptJob(match)}
                          disabled={acceptingId === match.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium py-2 rounded-lg transition"
                        >
                          {acceptingId === match.id ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Accept Job
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineJob(match)}
                          disabled={declineId === match.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium py-2 rounded-lg transition"
                        >
                          {declineId === match.id ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Declining...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Decline
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {acceptances.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Accepted Jobs ({acceptances.length})
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {acceptances.map((acceptance) => (
                    <div
                      key={acceptance.id}
                      className="bg-gray-900 border border-green-800/50 rounded-2xl p-6 hover:border-green-700 transition"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">{acceptance.job.title}</h3>
                          <p className="text-sm text-gray-400">{acceptance.job.description.substring(0, 80)}...</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            acceptance.status === 'completed'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-blue-900/30 text-blue-400'
                          }`}
                        >
                          {acceptance.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {acceptance.job.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {acceptance.job.budget_min} - {acceptance.job.budget_max} ETB
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-800">
                        <User className="w-4 h-4" />
                        <span>{acceptance.job.owner.name}</span>
                      </div>

                      {acceptance.status === 'accepted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleCompleteJob({
                                ...acceptance,
                                job: { ...acceptance.job, id: acceptance.job_id } as any,
                              })
                            }
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Done
                          </button>
                        </div>
                      )}

                      {acceptance.status === 'completed' && (
                        <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg text-center">
                          <p className="text-sm text-green-300 font-medium">Job completed! Waiting for owner to rate you</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matches.length === 0 && acceptances.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No jobs assigned yet</p>
                <p className="text-gray-500">
                  Complete your verification profile to receive job offers from customers
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
