import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, AlertCircle, CheckCircle, Award, ThumbsUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Poor', color: 'text-red-400' },
  2: { label: 'Fair', color: 'text-orange-400' },
  3: { label: 'Good', color: 'text-yellow-400' },
  4: { label: 'Very Good', color: 'text-lime-400' },
  5: { label: 'Excellent', color: 'text-green-400' },
};

export default function WriteReview() {
  const { mechanicId, requestId } = useParams<{ mechanicId: string; requestId?: string }>();
  const { user, profile: currentUser } = useAuth();
  const navigate = useNavigate();
  const [mechanic, setMechanic] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const isCustomer = currentUser?.role === 'customer' || currentUser?.role === 'owner';

  useEffect(() => {
    if (!mechanicId || !user) return;

    Promise.all([
      supabase.from('profiles').select('*').eq('id', mechanicId).maybeSingle(),
      requestId
        ? supabase
            .from('reviews')
            .select('id')
            .eq('reviewed_id', mechanicId)
            .eq('reviewer_id', user.id)
            .eq('related_id', requestId)
            .maybeSingle()
        : supabase
            .from('reviews')
            .select('id')
            .eq('reviewed_id', mechanicId)
            .eq('reviewer_id', user.id)
            .is('related_id', null)
            .maybeSingle(),
    ]).then(([{ data: mechanicData }, { data: existingReview }]) => {
      setMechanic(mechanicData as Profile | null);
      setAlreadyReviewed(!!existingReview);
      setLoading(false);
    });
  }, [mechanicId, user, requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mechanicId || rating === 0) return;
    if (!isCustomer) {
      toast.error('Only equipment owners can rate technicians.');
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      mechanic_id: mechanicId,
      reviewed_id: mechanicId,
      reviewer_id: user.id,
      breakdown_request_id: requestId ?? null,
      related_id: requestId ?? null,
      rating,
      comment: comment.trim() || null,
    });

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: mechanicId,
        title: 'New Review Received',
        message: `${currentUser?.name || 'A customer'} gave you a ${rating}-star rating.`,
        type: 'review',
      });
      toast.success('Rating submitted! Thank you.');
      navigate('/my-requests');
    } else {
      console.error('Review insert error:', error);
      toast.error('Failed to submit rating.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 pb-12 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Not Authorized</h2>
          <p className="text-gray-400 mb-6">Only equipment owners can rate technicians.</p>
          <Link to="/dashboard" className="text-yellow-400 hover:text-yellow-300 text-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 pb-12 flex items-center justify-center">
        <div className="text-center px-4">
          <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4 fill-yellow-400" />
          <h2 className="text-white font-bold text-xl mb-2">Already Rated</h2>
          <p className="text-gray-400 mb-6">You have already submitted a rating for this job.</p>
          <Link to="/my-requests" className="text-yellow-400 hover:text-yellow-300 text-sm">Back to My Requests</Link>
        </div>
      </div>
    );
  }

  const activeRating = hoverRating || rating;
  const ratingInfo = activeRating > 0 ? RATING_LABELS[activeRating] : null;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/my-requests" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Requests
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-yellow-400 to-orange-500" />
            <div className="p-6">
              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-2xl mx-auto">
                    {mechanic?.name?.charAt(0) || 'M'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-gray-900" />
                  </div>
                </div>
                <h2 className="text-white font-bold text-xl">Rate {mechanic?.name}</h2>
                <p className="text-gray-400 text-sm mt-1">Your feedback helps build a trusted community</p>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-600">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Rating is based on last 10 completed jobs</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center">
                  <label className="block text-gray-300 text-sm font-medium mb-4">Select your rating</label>
                  <div className="flex justify-center gap-3 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-all duration-150 hover:scale-125 active:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 transition-all duration-150 ${
                            star <= activeRating
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                              : 'text-gray-700 hover:text-gray-500'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="h-6 flex items-center justify-center">
                    {ratingInfo ? (
                      <motion.span
                        key={activeRating}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`font-semibold text-sm ${ratingInfo.color}`}
                      >
                        {ratingInfo.label}
                      </motion.span>
                    ) : (
                      <span className="text-gray-600 text-sm">Tap a star to rate</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Write a review <span className="text-gray-600 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your experience — quality of work, professionalism, timeliness..."
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 outline-none resize-none transition-colors text-sm leading-relaxed"
                  />
                  <p className="text-gray-600 text-xs mt-1.5">{comment.length}/500 characters</p>
                </div>

                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-3"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-gray-400 text-xs">
                      You're giving <span className="text-yellow-400 font-semibold">{mechanic?.name}</span> a{' '}
                      <span className={`font-semibold ${RATING_LABELS[rating]?.color}`}>{RATING_LABELS[rating]?.label}</span> ({rating}/5) rating.
                      This will update their profile score.
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-1">
                  <Link
                    to="/my-requests"
                    className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={rating === 0 || submitting}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><Star className="w-4 h-4" /> Submit Rating</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
