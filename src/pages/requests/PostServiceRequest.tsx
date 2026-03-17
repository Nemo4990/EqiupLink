import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, ArrowLeft, MapPin, DollarSign, Tag, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PhotoUpload from '../../components/ui/PhotoUpload';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'mechanic', label: 'Mechanic', desc: 'General mechanical repairs' },
  { id: 'electrician', label: 'Electrician', desc: 'Electrical system issues' },
  { id: 'hydraulics', label: 'Hydraulics', desc: 'Hydraulic system repairs' },
  { id: 'transmission', label: 'Transmission', desc: 'Gearbox & transmission' },
  { id: 'engine', label: 'Engine', desc: 'Engine overhaul & repair' },
  { id: 'other', label: 'Other', desc: 'Other technical services' },
];

export default function PostServiceRequest() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'mechanic',
    location: '',
    budget: '',
  });

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        customer_id: profile.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: formData.location.trim(),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        image_url: photoUrl,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to post request. Please try again.');
    } else {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Service Request Posted',
        message: `Your request "${formData.title}" has been posted. Technicians will send you offers shortly.`,
        type: 'success',
        related_id: data.id,
      });
      toast.success('Request posted! Technicians will reach out with offers.');
      navigate('/my-requests');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/my-requests"
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Requests
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Post Service Request</h1>
              <p className="text-green-400 text-sm font-medium">Free to post — no charges</p>
            </div>
          </div>
          <p className="text-gray-400 mb-8 mt-2">
            Describe your problem and receive competitive offers from qualified technicians.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-white font-semibold">Request Details</h3>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">
                  Request Title <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                    required
                    placeholder="e.g. Excavator hydraulic pump failure"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Service Category <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleChange('category', cat.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        formData.category === cat.id
                          ? 'border-yellow-400 bg-yellow-400/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${formData.category === cat.id ? 'text-yellow-400' : 'text-white'}`}>
                        {cat.label}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">
                  Problem Description <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <textarea
                    value={formData.description}
                    onChange={e => handleChange('description', e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe the issue in detail. Include symptoms, sounds, warning signs..."
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">
                    Location <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => handleChange('location', e.target.value)}
                      required
                      placeholder="City or area"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Budget (ETB, optional)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={e => handleChange('budget', e.target.value)}
                      min={0}
                      placeholder="e.g. 2000"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-gray-400" />
                <h3 className="text-white font-semibold">Photo (optional)</h3>
              </div>
              <PhotoUpload
                photoUrl={photoUrl}
                onUpload={setPhotoUrl}
                onRemove={() => setPhotoUrl(null)}
                label=""
                folder="service-requests"
              />
            </div>

            <div className="flex gap-3">
              <Link
                to="/my-requests"
                className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <><Wrench className="w-4 h-4" /> Post Request for Free</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
