import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

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
            .eq('mechanic_id', mechanicId)
            .eq('reviewer_id', user.id)
            .eq('breakdown_request_id', requestId)
            .maybeSingle()
        : supabase
            .from('reviews')
            .select('id')
            .eq('mechanic_id', mechanicId)
            .eq('reviewer_id', user.id)
            .is('breakdown_request_id', null)
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
      reviewer_id: user.id,
      breakdown_request_id: requestId ?? null,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      console.error('Review insert error:', error);
    }

    if (!error) {
      supabase.from('notifications').insert({
        user_id: mechanicId,
        title: 'New Review Received',
        message: `${currentUser?.name || 'A customer'} left you a ${rating}-star rating.`,
        type: 'review',
      });

      toast.success('Rating submitted! Thank you.');
      navigate('/requests');
    } else {
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
          <Link to="/requests" className="text-yellow-400 hover:text-yellow-300 text-sm">Back to My Requests</Link>
        </div>
      </div>
    );
  }

  const ratingLabels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/requests" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Requests
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-xl mx-auto mb-3">
                {mechanic?.name?.charAt(0) || 'M'}
              </div>
              <h2 className="text-white font-bold text-lg">Rate {mechanic?.name}</h2>
              <p className="text-gray-400 text-sm mt-1">Your rating helps others find the best technicians</p>
              <p className="text-gray-600 text-xs mt-1">Score is calculated from the last 10 completed jobs</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center">
                <label className="block text-gray-300 text-sm font-medium mb-3">Rating *</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-sm mt-2 h-5">
                  {rating === 0 ? 'Select a rating' : ratingLabels[rating]}
                </p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Your Review (Optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Describe your experience working with this technician..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <Link
                  to="/requests"
                  className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={rating === 0 || submitting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
