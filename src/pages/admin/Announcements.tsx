import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const TARGET_ROLES = [
  { value: 'all', label: 'All Users' },
  { value: 'owner', label: 'Owners Only' },
  { value: 'mechanic', label: 'Mechanics Only' },
  { value: 'supplier', label: 'Suppliers Only' },
  { value: 'rental_provider', label: 'Rental Providers Only' },
];

export default function Announcements() {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRole: 'all',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile?.role !== 'admin') {
      toast.error('Unauthorized');
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-announcement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send announcement');
      }

      toast.success(`Announcement sent to ${result.notificationsSent} users!`);
      setFormData({ title: '', message: '', targetRole: 'all' });
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-gray-400">You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white">Send Announcement</h1>
          </div>
          <p className="text-gray-400 mb-8">
            Send notifications to all users or specific user groups
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">
                  Target Audience *
                </label>
                <select
                  value={formData.targetRole}
                  onChange={(e) => handleChange('targetRole', e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                >
                  {TARGET_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  placeholder="e.g. New Feature Released"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  required
                  rows={6}
                  placeholder="Write your announcement message..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-blue-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Announcement
                </>
              )}
            </button>
          </form>

          <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-2">How it works</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Select your target audience from the dropdown</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Write a clear and concise message</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Notifications will be sent immediately to all selected users</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Users will receive push notifications on their mobile devices</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
