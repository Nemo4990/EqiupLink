import { useEffect, useState } from 'react';
import { Briefcase, MapPin, DollarSign, User, Star, AlertCircle, CheckCircle, Loader, MessageSquare, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface OwnerJob {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  estimated_duration: string;
  budget_min: number;
  budget_max: number;
  status: string;
  assigned_mechanic_id: string | null;
  created_at: string;
  mechanic?: { name: string; email: string };
  acceptance?: { status: string; accepted_at: string };
  rating?: { rating: number; review_text: string };
}

export default function OwnerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<OwnerJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingJob, setRatingJob] = useState<OwnerJob | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    review_title: '',
    review_text: '',
    professionalism: 5,
    quality_of_work: 5,
    punctuality: 5,
    communication: 5,
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select(
          `
          id,
          title,
          description,
          location,
          category,
          estimated_duration,
          budget_min,
          budget_max,
          status,
          assigned_mechanic_id,
          created_at,
          mechanic:profiles!job_postings_assigned_mechanic_id_fkey(name, email),
          acceptance:job_acceptances(status, accepted_at),
          rating:job_ratings(rating, review_text)
        `
        )
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRateJob = async () => {
    if (!ratingJob || !ratingForm.review_title.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmittingRating(true);
    try {
      const { error } = await supabase.from('job_ratings').insert({
        job_id: ratingJob.id,
        mechanic_id: ratingJob.assigned_mechanic_id,
        owner_id: user?.id,
        rating: ratingForm.rating,
        review_title: ratingForm.review_title,
        review_text: ratingForm.review_text,
        professionalism: ratingForm.professionalism,
        quality_of_work: ratingForm.quality_of_work,
        punctuality: ratingForm.punctuality,
        communication: ratingForm.communication,
      });

      if (error) throw error;

      toast.success('Rating submitted! Thank you for your feedback.');
      setShowRatingModal(false);
      setRatingJob(null);
      setRatingForm({
        rating: 5,
        review_title: '',
        review_text: '',
        professionalism: 5,
        quality_of_work: 5,
        punctuality: 5,
        communication: 5,
      });
      await loadJobs();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const openRatingModal = (job: OwnerJob) => {
    setRatingJob(job);
    setShowRatingModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-blue-900/30 text-blue-400';
      case 'matched':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'in_progress':
        return 'bg-purple-900/30 text-purple-400';
      case 'completed':
        return 'bg-green-900/30 text-green-400';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">My Posted Jobs</h1>
          <p className="text-gray-400">Track and manage your jobs</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No jobs posted yet</p>
            <p className="text-gray-500">Post a job to get matched with verified mechanics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{job.title}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-400">{job.description.substring(0, 120)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {job.budget_min} - {job.budget_max} ETB
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {job.category}
                  </div>
                  <div className="text-gray-500 text-xs">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>

                {job.status !== 'posted' && job.mechanic && (
                  <div className="p-4 bg-gray-800 rounded-lg mb-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Assigned Mechanic</p>
                        <p className="font-medium text-white">{job.mechanic.name}</p>
                        <p className="text-xs text-gray-500">{job.mechanic.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <p className="capitalize text-white font-medium">
                          {job.acceptance?.[0]?.status || job.status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {job.status === 'completed' && !job.rating && (
                  <button
                    onClick={() => openRatingModal(job)}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2.5 rounded-lg transition"
                  >
                    <Star className="w-4 h-4" />
                    Rate This Mechanic
                  </button>
                )}

                {job.rating && (
                  <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(job.rating.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-green-300">{job.rating.rating} / 5</span>
                    </div>
                    <p className="text-sm text-green-200">{job.rating.review_text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRatingModal && ratingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Rate {ratingJob.mechanic?.name || 'Mechanic'}</h2>
              <button
                onClick={() => setShowRatingModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Overall Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingForm((prev) => ({ ...prev, rating: star }))}
                      className="focus:outline-none transition"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= ratingForm.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={ratingForm.review_title}
                  onChange={(e) =>
                    setRatingForm((prev) => ({ ...prev, review_title: e.target.value }))
                  }
                  placeholder="e.g., Excellent work!"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review Details
                </label>
                <textarea
                  value={ratingForm.review_text}
                  onChange={(e) =>
                    setRatingForm((prev) => ({ ...prev, review_text: e.target.value }))
                  }
                  placeholder="Tell others about your experience..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Professionalism', key: 'professionalism' },
                  { label: 'Quality of Work', key: 'quality_of_work' },
                  { label: 'Punctuality', key: 'punctuality' },
                  { label: 'Communication', key: 'communication' },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      {item.label}
                    </label>
                    <select
                      value={ratingForm[item.key as keyof typeof ratingForm]}
                      onChange={(e) =>
                        setRatingForm((prev) => ({
                          ...prev,
                          [item.key]: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} Star{n !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRateJob}
                  disabled={submittingRating}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {submittingRating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      Submit Rating
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
