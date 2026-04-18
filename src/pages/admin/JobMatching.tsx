import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, User, Star, MapPin, Clock, DollarSign, Send, CheckCircle,
  Loader, AlertCircle, Wrench, ShieldCheck, Truck, Zap, ArrowLeft,
  Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
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

interface BreakdownItem {
  id: string;
  machine_type: string;
  machine_model: string;
  description: string;
  location: string;
  urgency: string;
  dispatch_status: string;
  mechanic_offer_status: string | null;
  created_at: string;
  owner: { name: string } | null;
}

interface MechanicProfile {
  id: string;
  user_id: string;
  experience_level: string;
  years_experience: number;
  verified_by_admin: boolean;
  professionalism_score: number;
  specializations: string[];
  brand_experience: string[];
  field_service_years: number;
  owns_service_truck: boolean;
  current_location: string;
  expertise_areas: string[];
  user: { name: string; email: string; location: string };
  matchScore?: number;
  matchReasons?: string[];
}

type Mode = 'jobs' | 'breakdowns';

function scoreJobMechanic(mechanic: MechanicProfile, job: JobPosting): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (mechanic.specializations?.includes(job.category)) {
    score += 40; reasons.push(`Specializes in ${job.category}`);
  }
  if (mechanic.expertise_areas?.some(e => e.toLowerCase().includes(job.category.toLowerCase()))) {
    score += 15; reasons.push('Matching expertise area');
  }
  if (job.location && mechanic.current_location?.toLowerCase().includes(job.location.split(',')[0].toLowerCase())) {
    score += 25; reasons.push('Same location');
  } else if (job.location && mechanic.user?.location?.toLowerCase().includes(job.location.split(',')[0].toLowerCase())) {
    score += 15; reasons.push('Nearby location');
  }
  if (mechanic.experience_level === 'expert') { score += 30; reasons.push('Expert level'); }
  else if (mechanic.experience_level === 'advanced') { score += 20; reasons.push('Advanced level'); }
  else if (mechanic.experience_level === 'intermediate') { score += 10; reasons.push('Intermediate level'); }

  score += Math.min(mechanic.professionalism_score, 30);
  if (mechanic.professionalism_score >= 80) reasons.push(`${mechanic.professionalism_score}% professionalism`);

  return { score, reasons };
}

function scoreBreakdownMechanic(mechanic: MechanicProfile, bd: BreakdownItem): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const machineKeyword = bd.machine_type?.toLowerCase() || '';
  const brandMatch = mechanic.brand_experience?.some(b => b.toLowerCase().includes(machineKeyword) || machineKeyword.includes(b.toLowerCase()));
  if (brandMatch) { score += 40; reasons.push(`Brand experience with ${bd.machine_type}`); }

  const specMatch = mechanic.specializations?.some(s =>
    s.toLowerCase().includes('electrician') || s.toLowerCase().includes(machineKeyword) || machineKeyword.includes(s.toLowerCase())
  );
  if (specMatch) { score += 30; reasons.push('Matching specialization'); }

  const expertiseMatch = mechanic.expertise_areas?.some(e =>
    e.toLowerCase().includes(machineKeyword) || machineKeyword.includes(e.toLowerCase())
  );
  if (expertiseMatch) { score += 20; reasons.push('Matching expertise'); }

  const bdCity = bd.location?.split(',')[0].toLowerCase() || '';
  if (bdCity && mechanic.current_location?.toLowerCase().includes(bdCity)) {
    score += 30; reasons.push('Same city');
  } else if (bdCity && mechanic.user?.location?.toLowerCase().includes(bdCity)) {
    score += 15; reasons.push('Nearby area');
  }

  if (mechanic.field_service_years >= 5) { score += 20; reasons.push(`${mechanic.field_service_years}y field service`); }
  else if (mechanic.field_service_years >= 2) { score += 10; reasons.push(`${mechanic.field_service_years}y field service`); }

  if (mechanic.owns_service_truck) { score += 15; reasons.push('Has service truck'); }

  if (mechanic.verified_by_admin) { score += 10; reasons.push('Admin verified'); }

  return { score, reasons };
}

export default function JobMatching() {
  const [mode, setMode] = useState<Mode>('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownItem[]>([]);
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [selectedBd, setSelectedBd] = useState<BreakdownItem | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [expandedMech, setExpandedMech] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, bdsRes, mechanicsRes] = await Promise.all([
        supabase
          .from('job_postings')
          .select('*, owner:profiles!job_postings_owner_id_fkey(name, email)')
          .eq('status', 'posted')
          .order('created_at', { ascending: false }),
        supabase
          .from('breakdown_requests')
          .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name)')
          .eq('dispatch_status', 'pending_admin_review')
          .order('created_at', { ascending: false }),
        supabase
          .from('mechanic_verification_profiles')
          .select('*, user:profiles!mechanic_verification_profiles_user_id_fkey(name, email, location)')
          .eq('verified_by_admin', true),
      ]);

      if (jobsRes.error) throw jobsRes.error;
      if (mechanicsRes.error) throw mechanicsRes.error;

      setJobs(jobsRes.data || []);
      setBreakdowns((bdsRes.data || []) as BreakdownItem[]);
      setMechanics((mechanicsRes.data || []) as MechanicProfile[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const matchedMechanicsForJob = useMemo(() => {
    if (!selectedJob) return [];
    return mechanics
      .map(m => { const { score, reasons } = scoreJobMechanic(m, selectedJob); return { ...m, matchScore: score, matchReasons: reasons }; })
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedJob, mechanics]);

  const matchedMechanicsForBd = useMemo(() => {
    if (!selectedBd) return [];
    return mechanics
      .map(m => { const { score, reasons } = scoreBreakdownMechanic(m, selectedBd); return { ...m, matchScore: score, matchReasons: reasons }; })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedBd, mechanics]);

  const displayedMechanics = mode === 'jobs' ? matchedMechanicsForJob : matchedMechanicsForBd;

  const handleContactMechanic = async (mechanic: MechanicProfile) => {
    if (!selectedJob) return;
    setContactingId(mechanic.user_id);
    try {
      const { data: adminData } = await supabase.auth.getUser();
      if (!adminData.user) throw new Error('Not authenticated');

      await supabase.from('job_matches').insert({
        job_id: selectedJob.id,
        mechanic_id: mechanic.user_id,
        admin_id: adminData.user.id,
        match_score: mechanic.matchScore || 0,
        match_reason: mechanic.matchReasons?.join(', ') || '',
        contacted_at: new Date().toISOString(),
        status: 'suggested',
      });

      await supabase.from('job_postings').update({ status: 'matched' }).eq('id', selectedJob.id);
      await supabase.from('notifications').insert({
        user_id: mechanic.user_id,
        type: 'job_offer',
        title: 'New Job Opportunity',
        message: `You have been matched for: ${selectedJob.title} at ${selectedJob.location}`,
        data: { job_id: selectedJob.id },
      });

      toast.success(`${mechanic.user.name} has been contacted`);
      await loadData();
      setSelectedJob(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to contact mechanic');
    } finally {
      setContactingId(null);
    }
  };

  const handleDispatchToBreakdown = async (mechanic: MechanicProfile) => {
    if (!selectedBd) return;
    setContactingId(mechanic.user_id);
    try {
      const { data: adminData } = await supabase.auth.getUser();
      if (!adminData.user) throw new Error('Not authenticated');

      await supabase.from('breakdown_requests').update({
        assigned_mechanic_id: mechanic.user_id,
        admin_id: adminData.user.id,
        mechanic_offer_status: 'pending',
        mechanic_offer_sent_at: new Date().toISOString(),
      }).eq('id', selectedBd.id);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/send-mechanic-job-offer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId: selectedBd.id }),
      });

      toast.success(`Job offer sent to ${mechanic.user.name}`);
      await loadData();
      setSelectedBd(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch');
    } finally {
      setContactingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Job Matching</h1>
            <p className="text-gray-400 mt-1">Smart mechanic matching based on skills, location, and experience.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setMode('jobs'); setSelectedBd(null); setSelectedJob(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                mode === 'jobs' ? 'bg-white text-gray-900 border-white' : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}>
              <Briefcase className="w-4 h-4 inline mr-1.5" />Job Postings
            </button>
            <button onClick={() => { setMode('breakdowns'); setSelectedJob(null); setSelectedBd(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                mode === 'breakdowns' ? 'bg-white text-gray-900 border-white' : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}>
              <Wrench className="w-4 h-4 inline mr-1.5" />Breakdown Dispatch
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-amber-400" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {mode === 'jobs' ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-400" /> Available Job Postings
                    <span className="ml-auto text-sm text-gray-500">{jobs.length} jobs</span>
                  </h2>
                  {jobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No jobs awaiting assignment</p>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map(job => (
                        <button key={job.id} onClick={() => { setSelectedJob(job); setSelectedBd(null); }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedJob?.id === job.id ? 'border-amber-500 bg-amber-500/5' : 'border-gray-800 bg-gray-950 hover:border-gray-700'
                          }`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="font-semibold text-white">{job.title}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">{job.category}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                              job.urgency === 'urgent' ? 'bg-red-900/40 text-red-300' :
                              job.urgency === 'high' ? 'bg-orange-900/40 text-orange-300' : 'bg-yellow-900/40 text-yellow-300'
                            }`}>{job.urgency}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{job.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</div>
                            <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.budget_min}–{job.budget_max} ETB</div>
                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.estimated_duration}</div>
                            <div className="flex items-center gap-1"><User className="w-3 h-3" /> {job.owner.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-400" /> Breakdown Requests
                    <span className="ml-auto text-sm text-gray-500">{breakdowns.length} requests</span>
                  </h2>
                  {breakdowns.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No breakdown requests pending assignment</p>
                  ) : (
                    <div className="space-y-3">
                      {breakdowns.map(bd => (
                        <button key={bd.id} onClick={() => { setSelectedBd(bd); setSelectedJob(null); }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedBd?.id === bd.id ? 'border-amber-500 bg-amber-500/5' : 'border-gray-800 bg-gray-950 hover:border-gray-700'
                          }`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-semibold">{bd.machine_type} {bd.machine_model}</span>
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">#{bd.id.slice(0, 8)}</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              bd.urgency === 'critical' ? 'bg-red-900/40 text-red-300' :
                              bd.urgency === 'high' ? 'bg-orange-900/40 text-orange-300' : 'bg-yellow-900/40 text-yellow-300'
                            }`}>{(bd.urgency || 'medium').toUpperCase()}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{bd.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {bd.location}</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {bd.owner?.name || '—'}</span>
                          </div>
                          {bd.mechanic_offer_status === 'pending' && (
                            <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 px-2 py-1 rounded-lg">
                              Offer pending mechanic response
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {(selectedJob || selectedBd) ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sticky top-24">
                  <h2 className="text-base font-bold mb-1">
                    {mode === 'jobs' ? 'Matched Mechanics' : 'Best Technicians for this Job'}
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">Ranked by relevance score</p>

                  {displayedMechanics.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No verified mechanics found</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                      {displayedMechanics.slice(0, 8).map((mechanic, idx) => (
                        <div key={mechanic.user_id} className={`p-4 rounded-xl border transition-colors ${
                          idx === 0 ? 'border-amber-600/50 bg-amber-500/5' : 'border-gray-800 bg-gray-950'
                        }`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate">{mechanic.user.name}</span>
                                {mechanic.verified_by_admin && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                                {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold">Best Match</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {mechanic.current_location || mechanic.user.location || '—'}
                                {mechanic.field_service_years > 0 ? ` • ${mechanic.field_service_years}y field` : ''}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-black text-amber-400">{mechanic.matchScore}</div>
                              <div className="text-[10px] text-gray-500">score</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {mechanic.brand_experience?.slice(0, 3).map(b => (
                              <span key={b} className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded">{b}</span>
                            ))}
                            {mechanic.specializations?.slice(0, 2).map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded">{s}</span>
                            ))}
                            {mechanic.owns_service_truck && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-teal-900/40 text-teal-300 rounded flex items-center gap-0.5">
                                <Truck className="w-2.5 h-2.5" />Truck
                              </span>
                            )}
                          </div>

                          <button onClick={() => setExpandedMech(expandedMech === mechanic.user_id ? null : mechanic.user_id)}
                            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-3 transition-colors">
                            {expandedMech === mechanic.user_id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Why this match?
                          </button>

                          {expandedMech === mechanic.user_id && mechanic.matchReasons && mechanic.matchReasons.length > 0 && (
                            <div className="mb-3 space-y-1">
                              {mechanic.matchReasons.map((r, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
                                  <CheckCircle className="w-3 h-3 flex-shrink-0" />{r}
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => mode === 'jobs' ? handleContactMechanic(mechanic) : handleDispatchToBreakdown(mechanic)}
                            disabled={contactingId === mechanic.user_id}
                            className="w-full flex items-center justify-center gap-2 text-sm bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-900 font-bold py-2.5 rounded-xl transition-colors">
                            {contactingId === mechanic.user_id ? (
                              <><Loader className="w-4 h-4 animate-spin" />Working...</>
                            ) : mode === 'jobs' ? (
                              <><Send className="w-4 h-4" />Contact for Job</>
                            ) : (
                              <><Zap className="w-4 h-4" />Send Job Offer</>
                            )}
                          </button>
                        </div>
                      ))}
                      {displayedMechanics.length > 8 && (
                        <p className="text-xs text-gray-500 text-center">+{displayedMechanics.length - 8} more technicians available</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 sticky top-24 text-center">
                  <Filter className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {mode === 'jobs' ? 'Select a job to see matched mechanics' : 'Select a breakdown request to find the best technician'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
