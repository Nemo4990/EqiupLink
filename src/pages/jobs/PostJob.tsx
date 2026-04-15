import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, DollarSign, Clock, AlertCircle, Send, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PostJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    estimated_duration: '',
    budget_min: '',
    budget_max: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const jobCategories = [
    'Engine Repair',
    'Transmission',
    'Electrical',
    'Suspension',
    'Braking System',
    'Air Conditioning',
    'General Maintenance',
    'Diagnostic',
    'Body Work',
    'Painting',
    'Welding',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.location.trim() ||
      !formData.category ||
      !formData.estimated_duration ||
      !formData.budget_min ||
      !formData.budget_max
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const budgetMin = parseInt(formData.budget_min);
    const budgetMax = parseInt(formData.budget_max);

    if (budgetMin >= budgetMax) {
      toast.error('Maximum budget must be greater than minimum budget');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('job_postings').insert({
        owner_id: user?.id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        category: formData.category,
        estimated_duration: formData.estimated_duration,
        budget_min: budgetMin,
        budget_max: budgetMax,
        urgency: formData.urgency,
        status: 'posted',
      });

      if (error) throw error;

      toast.success('Job posted successfully! Admins will review and match you with mechanics.');
      navigate('/jobs', { replace: true });
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Post a Job</h1>
          <p className="text-gray-400">
            Describe your job and our verified mechanics will be matched to help you
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Engine Transmission Repair"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {jobCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the job in detail. Include what needs to be done, any specific issues, and what outcome you expect..."
                rows={6}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Location <span className="text-red-400">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Addis Ababa, Bole"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Estimated Duration <span className="text-red-400">*</span>
                  </div>
                </label>
                <select
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData((prev) => ({ ...prev, estimated_duration: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select duration</option>
                  <option value="less_than_1_hour">Less than 1 hour</option>
                  <option value="1_to_3_hours">1 to 3 hours</option>
                  <option value="half_day">Half day</option>
                  <option value="full_day">Full day</option>
                  <option value="multiple_days">Multiple days</option>
                  <option value="1_week">1 week</option>
                  <option value="more_than_1_week">More than 1 week</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Min Budget (ETB) <span className="text-red-400">*</span>
                  </div>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_min}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget_min: e.target.value }))}
                  placeholder="e.g., 5000"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Max Budget (ETB) <span className="text-red-400">*</span>
                  </div>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_max}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget_max: e.target.value }))}
                  placeholder="e.g., 10000"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Urgency Level
                </div>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: 'low', label: 'Low', color: 'blue' },
                  { value: 'medium', label: 'Medium', color: 'yellow' },
                  { value: 'high', label: 'High', color: 'orange' },
                  { value: 'urgent', label: 'Urgent', color: 'red' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, urgency: opt.value as any }))}
                    className={`py-3 rounded-lg font-medium transition-all border-2 ${
                      formData.urgency === opt.value
                        ? `border-${opt.color}-500 bg-${opt.color}-500/10 text-${opt.color}-300`
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">How it works</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Post your job with details about what you need</li>
                    <li>Our admins will match you with suitable verified mechanics</li>
                    <li>You'll be notified when a mechanic is assigned</li>
                    <li>Rate the mechanic after the job is completed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 rounded-lg transition"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Job
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
