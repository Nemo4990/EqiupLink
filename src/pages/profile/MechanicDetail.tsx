import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Wrench, CheckCircle, ArrowLeft, Award, Lock, PhoneCall } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MechanicProfile, Review } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PaymentModal from '../../components/ui/PaymentModal';
import ContactCard from '../../components/ui/ContactCard';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const SPECIALIZATION_COLORS: Record<string, string> = {
  hydraulics: 'bg-blue-900/50 text-blue-300',
  engine: 'bg-red-900/50 text-red-300',
  electrical: 'bg-yellow-900/50 text-yellow-300',
  transmission: 'bg-green-900/50 text-green-300',
};

export default function MechanicDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase
        .from('mechanic_profiles')
        .select('*, profile:profiles!mechanic_profiles_user_id_fkey(*)')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)')
        .eq('mechanic_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([{ data: m }, { data: r }]) => {
      setMechanic(m as MechanicProfile | null);
      setReviews((r || []) as Review[]);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    if (user && userId && profile?.role !== 'admin') {
      Promise.all([
        supabase
          .from('contact_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider_id', userId)
          .eq('contact_type', 'mechanic')
          .maybeSingle(),
        supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('fee_type', 'mechanic_contact')
          .eq('status', 'pending')
          .maybeSingle(),
      ]).then(([access, pending]) => {
        setHasAccess(!!access.data);
        setPendingPayment(!!pending.data);
      });
    } else if (profile?.role === 'admin') {
      setHasAccess(true);
    }
  }, [user, userId, profile]);

  const handleContact = () => {
    if (!user) { navigate('/login'); return; }
    if (hasAccess || profile?.role === 'admin') {
      setShowContact(true);
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async (method?: 'wallet' | 'manual') => {
    if (method === 'wallet') {
      await supabase.from('contact_history').insert({
        user_id: user!.id,
        provider_id: userId,
        contact_type: 'mechanic',
      });
      setHasAccess(true);
      setShowPayment(false);
      setShowContact(true);
    } else {
      setPendingPayment(true);
      setShowPayment(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!mechanic) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Wrench className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Mechanic not found</h3>
        <Link to="/marketplace/mechanics" className="text-yellow-400 hover:text-yellow-300">Browse all mechanics</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/marketplace/mechanics" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Mechanics
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-5">
            <div className="h-24 bg-gradient-to-r from-yellow-400/20 to-orange-400/10"></div>
            <div className="px-6 pb-6">
              <div className="-mt-12 flex items-end justify-between gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-2xl border-4 border-gray-900">
                  {mechanic.profile?.name?.charAt(0)}
                </div>
                <div className="flex gap-2 pb-1">
                  {mechanic.is_available && (
                    <span className="flex items-center gap-1 text-green-400 text-sm bg-green-900/30 border border-green-800 px-3 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Available
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-black text-white mt-4">{mechanic.profile?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-semibold">{mechanic.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({mechanic.total_reviews} {mechanic.total_reviews === 1 ? 'rating' : 'ratings'})</span>
              </div>
              <p className="text-gray-600 text-xs mt-0.5">Avg. score from last 10 completed jobs</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                <div className="text-center bg-gray-800 rounded-xl p-3">
                  <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{mechanic.years_experience} yrs</p>
                  <p className="text-gray-500 text-xs">Experience</p>
                </div>
                <div className="text-center bg-gray-800 rounded-xl p-3">
                  <Award className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{mechanic.total_reviews}</p>
                  <p className="text-gray-500 text-xs">Reviews</p>
                </div>
                {mechanic.hourly_rate && (
                  <div className="text-center bg-gray-800 rounded-xl p-3">
                    <p className="text-yellow-400 font-bold text-lg">${mechanic.hourly_rate}</p>
                    <p className="text-gray-500 text-xs">Per Hour</p>
                  </div>
                )}
              </div>

              {mechanic.profile?.bio && (
                <p className="text-gray-300 mt-5 leading-relaxed">{mechanic.profile.bio}</p>
              )}

              {mechanic.service_area && (
                <div className="flex items-center gap-2 mt-4 text-gray-400">
                  <MapPin className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">{mechanic.service_area}</span>
                </div>
              )}

              {mechanic.specializations.length > 0 && (
                <div className="mt-5">
                  <p className="text-gray-400 text-sm mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {mechanic.specializations.map(s => (
                      <span key={s} className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${SPECIALIZATION_COLORS[s] || 'bg-gray-800 text-gray-300'}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {mechanic.supported_brands.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Supported Brands</p>
                  <div className="flex flex-wrap gap-2">
                    {mechanic.supported_brands.map(b => (
                      <span key={b} className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-lg">{b}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleContact}
                disabled={pendingPayment}
                className={`mt-6 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-colors ${
                  hasAccess
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : pendingPayment
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
                }`}
              >
                {hasAccess ? (
                  <><PhoneCall className="w-5 h-5" /> View Contact Details</>
                ) : pendingPayment ? (
                  <><Clock className="w-5 h-5" /> Payment Pending Approval</>
                ) : (
                  <><Lock className="w-5 h-5" /> Unlock Contact</>
                )}
              </button>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Owner Ratings ({reviews.length})</h2>
                <span className="text-gray-600 text-xs">Last 10 jobs weighted</span>
              </div>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="border-b border-gray-800 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-white font-medium text-sm">{r.reviewer?.name}</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">{r.comment}</p>}
                    <p className="text-gray-600 text-xs mt-1">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        feeType="mechanic_contact"
        providerId={userId}
        providerName={mechanic.profile?.name}
        onSuccess={handlePaymentSuccess}
      />
      <ContactCard
        isOpen={showContact}
        onClose={() => setShowContact(false)}
        providerId={userId!}
        providerName={mechanic.profile?.name}
      />
    </div>
  );
}
