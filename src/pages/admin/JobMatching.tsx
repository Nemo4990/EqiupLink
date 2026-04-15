import { useEffect, useState } from 'react';
import { Briefcase, User, Star, MapPin, Clock, DollarSign, Send, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  estimated_duration: string;
  budget_min: number;
  budget_max: number;
  urgency: string;
  status: string;
  owner_id: string;
  owner: { name: string; email: string };
  created_at: string;
}

interface MechanicProfile {
  id: string;
  user_id: string;
  experience_level: string;
  years_experience: number;
  verified_by_admin: boolean;
  professionalism_score: number;
  specializations: string[];
  user: { name: string; email: string };
}

export default function JobMatching() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [matchingMechanics, setMatchingMechanics] = useState<any[]>([]);
  const [contactingId, setContactingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, mechanicsRes] = await Promise.all([
        supabase
          .from('job_postings')
          .select('*, owner:profiles!job_postings_owner_id_fkey(name, email)')
          .eq('status', 'posted')
          .order('created_at', { ascending: false }),
        supabase
          .from('mechanic_verification_profiles')
          .select('*, user:profiles!mechanic_verification_profiles_user_id_fkey(name, email)')
          .eq('verified_by_admin', true),
      ]);

      if (jobsRes.error) throw jobsRes.error;
      if (mechanicsRes.error) throw mechanicsRes.error;

      setJobs(jobsRes.data || []);
      setMechanics(mechanicsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load jobs and mechanics');
    } finally {
      setLoading(false);
    }
  };

  const findMatchingMechanics = (job: JobPosting) => {
    const matches = mechanics
      .map((mechanic) => {
        let score = 0;

        if (mechanic.specializations?.includes(job.category)) {
          score += 40;
        }

        if (mechanic.experience_level === 'expert') score += 30;
        else if (mechanic.experience_level === 'advanced') score += 20;
        else if (mechanic.experience_level === 'intermediate') score += 10;

        score += Math.min(mechanic.professionalism_score, 30);

        return { ...mechanic, matchScore: score };
      })
      .filter((m) => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  };

  const handleSelectJob = (job: JobPosting) => {
    setSelectedJob(job);
    const matched = findMatchingMechanics(job);
    setMatchingMechanics(matched);
  };

  const handleContactMechanic = async (mechanic: MechanicProfile, job: JobPosting) => {
    setContactingId(mechanic.user_id);
    try {
      const { data: adminData } = await supabase.auth.getUser();
      if (!adminData.user) throw new Error('Admin not authenticated');

      const { error: matchError } = await supabase.from('job_matches').insert({
        job_id: job.id,
        mechanic_id: mechanic.user_id,
        admin_id: adminData.user.id,
        match_score: matchingMechanics.find((m) => m.user_id === mechanic.user_id)?.matchScore || 0,
        match_reason: `Matched based on ${job.category} expertise and ${mechanic.years_experience}+ years experience`,
        contacted_at: new Date().toISOString(),
        status: 'suggested',
      });

      if (matchError) throw matchError;

      await supabase.from('job_postings').update({ status: 'matched' }).eq('id', job.id);

      toast.success(`${mechanic.user.name} has been contacted about this job`);
      await loadData();
      setSelectedJob(null);
      setMatchingMechanics([]);
    } catch (error) {
      console.error('Error contacting mechanic:', error);
      toast.error('Failed to contact mechanic');
    } finally {
      setContactingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Job Matching</h1>
        <p className="text-gray-400">Match posted jobs with verified mechanics</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Available Jobs
              </h2>

              {jobs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No jobs awaiting mechanic assignment</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedJob?.id === job.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{job.title}</h3>
                          <p className="text-sm text-gray-400 mt-1">{job.description.substring(0, 100)}...</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            job.urgency === 'urgent'
                              ? 'bg-red-900/30 text-red-400'
                              : job.urgency === 'high'
                                ? 'bg-orange-900/30 text-orange-400'
                                : 'bg-yellow-900/30 text-yellow-400'
                          }`}
                        >
                          {job.urgency}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {job.budget_min} - {job.budget_max} ETB
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {job.category}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {job.estimated_duration}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        {job.owner.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            {selectedJob ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-white mb-4">Matching Mechanics</h2>

                {matchingMechanics.length === 0 ? (
                  <p className="text-gray-500 text-sm">No verified mechanics found for this job</p>
                ) : (
                  <div className="space-y-3">
                    {matchingMechanics.slice(0, 5).map((mechanic) => (
                      <div key={mechanic.user_id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">
                              {mechanic.user.name}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < Math.round(mechanic.professionalism_score / 20)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">
                                {mechanic.professionalism_score}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-400">{mechanic.matchScore}</div>
                            <div className="text-xs text-gray-500">match</div>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-gray-400 mb-3">
                          <p>{mechanic.years_experience}+ years experience</p>
                          <p className="capitalize">{mechanic.experience_level} level</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {mechanic.specializations?.slice(0, 2).map((spec: string) => (
                              <span key={spec} className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs">
                                {spec}
                              </span>
                            ))}
                            {mechanic.specializations?.length > 2 && (
                              <span className="text-gray-500">+{mechanic.specializations.length - 2}</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleContactMechanic(mechanic, selectedJob)}
                          disabled={contactingId === mechanic.user_id}
                          className="w-full flex items-center justify-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2 rounded transition"
                        >
                          {contactingId === mechanic.user_id ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              Contacting...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Contact
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {matchingMechanics.length > 5 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    +{matchingMechanics.length - 5} more mechanics available
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">
                <div className="flex flex-col items-center text-center">
                  <AlertCircle className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">Select a job to see matching mechanics</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
