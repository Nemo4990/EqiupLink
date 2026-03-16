import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Lock, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PaymentModal from '../../components/ui/PaymentModal';
import PhotoUpload from '../../components/ui/PhotoUpload';
import toast from 'react-hot-toast';

const MACHINE_TYPES = ['excavator', 'bulldozer', 'wheel loader', 'motor grader', 'crane', 'dump truck', 'compactor', 'skid steer', 'backhoe', 'other'];
const URGENCY_OPTIONS = [
  { id: 'low', label: 'Low', desc: 'Non-urgent, can wait a few days', color: 'border-green-700 text-green-400' },
  { id: 'medium', label: 'Medium', desc: 'Needs attention within 24 hours', color: 'border-yellow-700 text-yellow-400' },
  { id: 'high', label: 'High', desc: 'Urgent, machine down on site', color: 'border-orange-700 text-orange-400' },
  { id: 'critical', label: 'Critical', desc: 'Emergency, major production halt', color: 'border-red-700 text-red-400' },
];

export default function PostBreakdown() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [hasPaid, setHasPaid] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    machine_type: '',
    machine_model: '',
    description: '',
    location: '',
    urgency: 'medium',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile?.role !== 'admin') {
      Promise.all([
        supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('fee_type', 'breakdown_post')
          .eq('status', 'approved')
          .maybeSingle(),
        supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('fee_type', 'breakdown_post')
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

  const handleChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!hasPaid && profile.role !== 'admin') {
      setShowPayment(true);
      return;
    }

    if (!photoUrl) {
      toast.error('Please upload a photo of the breakdown.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('breakdown_requests').insert({
      owner_id: profile.id,
      ...formData,
      image_url: photoUrl,
      status: 'open',
    }).select().single();

    if (error) {
      toast.error('Failed to post request. Please try again.');
    } else {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Breakdown Request Posted',
        message: `Your breakdown request for ${formData.machine_model} has been posted and mechanics in your area have been notified.`,
        type: 'success',
      });
      toast.success('Breakdown request posted! Nearby mechanics will be notified.');
      navigate('/breakdown');
    }
    setLoading(false);
  };

  if (checkingPayment) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/breakdown" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-3xl font-black text-white">Post Breakdown Request</h1>
          </div>
          <p className="text-gray-400 mb-8">Describe your machine problem and nearby mechanics will respond</p>

          {!hasPaid && profile?.role !== 'admin' && (
            <div className={`rounded-2xl border p-5 mb-6 ${
              pendingPayment
                ? 'bg-yellow-900/20 border-yellow-800'
                : 'bg-gray-900 border-orange-800'
            }`}>
              <div className="flex items-start gap-3">
                {pendingPayment
                  ? <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  : <Lock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  {pendingPayment ? (
                    <>
                      <p className="text-yellow-400 font-semibold">Payment Pending Approval</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Your payment is being reviewed. You'll be able to post breakdown requests once approved.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-orange-400 font-semibold">Commission Fee Required</p>
                      <p className="text-gray-400 text-sm mt-1">
                        A one-time commission fee is required to post breakdown requests. This fee covers platform costs and ensures quality service.
                      </p>
                      <button
                        onClick={() => setShowPayment(true)}
                        className="mt-3 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        <Lock className="w-4 h-4" /> Pay Commission Fee
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 ${!hasPaid && profile?.role !== 'admin' ? 'opacity-50 pointer-events-none select-none' : ''}`}>
              <PhotoUpload
                photoUrl={photoUrl}
                onUpload={setPhotoUrl}
                onRemove={() => setPhotoUrl(null)}
                label="Breakdown Photo"
                required
                folder="breakdowns"
              />
            </div>

            <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 ${!hasPaid && profile?.role !== 'admin' ? 'opacity-50 pointer-events-none select-none' : ''}`}>
              <h3 className="text-white font-semibold">Machine Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Machine Type *</label>
                  <select
                    value={formData.machine_type}
                    onChange={(e) => handleChange('machine_type', e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2.5 px-3 outline-none capitalize transition-colors"
                  >
                    <option value="">Select type...</option>
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Machine Model *</label>
                  <input
                    type="text"
                    value={formData.machine_model}
                    onChange={(e) => handleChange('machine_model', e.target.value)}
                    required
                    placeholder="e.g. Caterpillar D8R"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Problem Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe the problem in detail. Include any warning lights, sounds, or symptoms..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  required
                  placeholder="e.g. Highway 90, Mile Marker 45, Houston TX"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors"
                />
              </div>
            </div>

            <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 ${!hasPaid && profile?.role !== 'admin' ? 'opacity-50 pointer-events-none select-none' : ''}`}>
              <h3 className="text-white font-semibold mb-4">Urgency Level</h3>
              <div className="grid grid-cols-2 gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChange('urgency', opt.id)}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      formData.urgency === opt.id
                        ? `${opt.color} bg-gray-800`
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span className={`font-semibold text-sm ${formData.urgency === opt.id ? '' : 'text-gray-300'}`}>{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to="/breakdown"
                className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || pendingPayment || (!photoUrl && hasPaid)}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {!hasPaid && profile?.role !== 'admin' ? (
                  <><Lock className="w-4 h-4" /> Pay to Post</>
                ) : loading ? (
                  'Posting...'
                ) : (
                  <><AlertTriangle className="w-4 h-4" /> Post Breakdown Request</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        feeType="breakdown_post"
        onSuccess={() => {
          setHasPaid(false);
          setPendingPayment(true);
        }}
      />
    </div>
  );
}
