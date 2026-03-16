import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function WriteReview() {
  const { mechanicId, requestId } = useParams<{ mechanicId: string; requestId?: string }>();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  const [mechanic, setMechanic] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!mechanicId) return;
    supabase.from('profiles').select('*').eq('id', mechanicId).maybeSingle()
      .then(({ data }) => {
        setMechanic(data as Profile | null);
        setLoading(false);
      });
  }, [mechanicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !mechanicId || rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      mechanic_id: mechanicId,
      reviewer_id: currentUser.id,
      breakdown_request_id: requestId || null,
      rating,
      comment: comment.trim() || null,
    });

    if (!error) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('mechanic_id', mechanicId);

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await supabase.from('mechanic_profiles')
          .update({ rating: avgRating, total_reviews: reviews.length })
          .eq('user_id', mechanicId);
      }

      await supabase.from('notifications').insert({
        user_id: mechanicId,
        title: 'New Review Received',
        message: `${currentUser.name} left you a ${rating}-star review`,
        type: 'review',
      });

      toast.success('Review submitted! Thank you.');
      navigate('/dashboard');
    } else {
      toast.error('Failed to submit review.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-xl mx-auto mb-3">
                {mechanic?.name?.charAt(0) || 'M'}
              </div>
              <h2 className="text-white font-bold text-lg">Review {mechanic?.name}</h2>
              <p className="text-gray-400 text-sm mt-1">Share your experience with this technician</p>
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
                <p className="text-gray-500 text-sm mt-2">
                  {rating === 0 && 'Select a rating'}
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
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
                <Link to="/dashboard" className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={rating === 0 || submitting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
