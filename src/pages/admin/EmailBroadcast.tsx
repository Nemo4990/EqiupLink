import { useEffect, useState } from 'react';
import { Mail, Send, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Broadcast {
  id: string;
  subject: string;
  html_content: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  created_at: string;
}

export default function EmailBroadcast() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!htmlContent.trim()) {
      toast.error('Email content is required');
      return;
    }

    setFormLoading(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email: contact_email', { count: 'exact' });

      if (usersError) throw usersError;

      const recipientCount = users?.length || 0;

      const { data: broadcast, error: broadcastError } = await supabase
        .from('email_broadcasts')
        .insert({
          admin_id: user?.id,
          subject,
          html_content: htmlContent,
          recipient_count: recipientCount,
          status: 'pending',
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      const emailLogs = (users || []).map((u) => ({
        broadcast_id: broadcast.id,
        user_id: u.id,
        email: u.email || u.id,
        status: 'pending',
      }));

      if (emailLogs.length > 0) {
        const { error: logsError } = await supabase
          .from('email_logs')
          .insert(emailLogs);

        if (logsError) throw logsError;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast-email`;

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ broadcastId: broadcast.id }),
      }).catch((error) => {
        console.error('Error triggering broadcast:', error);
      });

      toast.success(`Broadcast created and sending to ${recipientCount} users`);
      setSubject('');
      setHtmlContent('');
      setPreviewMode(false);
      await fetchBroadcasts();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast.error('Failed to create broadcast');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Email Broadcast</h1>
        <p className="text-gray-400">Send professional emails to all users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Compose Email</h2>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Content (HTML)
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Paste your HTML email content here..."
                  rows={12}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use a professional HTML email template. Include your logo, branding, and clear call-to-action buttons.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition"
                >
                  <Eye className="w-4 h-4" />
                  {previewMode ? 'Edit' : 'Preview'}
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !subject.trim() || !htmlContent.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition"
                >
                  {formLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {previewMode && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-96 border-0"
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Email Template Tips</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Use professional HTML structure
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Include brand logo and colors
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Make text mobile-responsive
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Add clear call-to-action buttons
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Keep subject line clear and concise
              </li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Important</h4>
                <p className="text-sm text-blue-200">
                  Email broadcasts are sent to all registered users. Use this feature responsibly and ensure your content is relevant and valuable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Broadcasts</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : broadcasts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No broadcasts sent yet</p>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                onClick={() => setSelectedBroadcast(selectedBroadcast?.id === broadcast.id ? null : broadcast)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">{broadcast.subject}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          broadcast.status === 'completed'
                            ? 'bg-green-900/30 text-green-400'
                            : broadcast.status === 'sending'
                              ? 'bg-blue-900/30 text-blue-400'
                              : broadcast.status === 'pending'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {broadcast.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {new Date(broadcast.created_at).toLocaleDateString()} at{' '}
                      {new Date(broadcast.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {broadcast.sent_count}/{broadcast.recipient_count}
                    </p>
                    <p className="text-xs text-gray-400">Sent</p>
                  </div>
                </div>

                {selectedBroadcast?.id === broadcast.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Recipients</p>
                        <p className="text-lg font-semibold text-white">{broadcast.recipient_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Sent</p>
                        <p className="text-lg font-semibold text-green-400">{broadcast.sent_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Failed</p>
                        <p className="text-lg font-semibold text-red-400">{broadcast.failed_count}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
