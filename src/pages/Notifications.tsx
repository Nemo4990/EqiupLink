import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, MessageSquare, Star, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  job_request: AlertTriangle,
  message: MessageSquare,
  review: Star,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-400 bg-blue-900/20',
  success: 'text-green-400 bg-green-900/20',
  warning: 'text-yellow-400 bg-yellow-900/20',
  error: 'text-red-400 bg-red-900/20',
  job_request: 'text-orange-400 bg-orange-900/20',
  message: 'text-blue-400 bg-blue-900/20',
  review: 'text-yellow-400 bg-yellow-900/20',
};

export default function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications((data || []) as Notification[]);
        setLoading(false);
      });
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Notifications</h1>
            {unreadCount > 0 && <p className="text-gray-400 text-sm mt-0.5">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
            <p className="text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
              return (
                <motion.div
                  key={n.id}
                  whileHover={{ x: 2 }}
                  onClick={async () => {
                    if (!n.is_read) await markRead(n.id);
                    if (n.type === 'message' && n.related_id) {
                      navigate(`/messages?user=${n.related_id}`);
                    } else if (n.related_id && n.type === 'success' && n.title.includes('Unlocked')) {
                      navigate(`/messages?user=${n.related_id}`);
                    }
                  }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    n.type === 'message' || (n.related_id && n.type === 'success')
                      ? 'hover:border-yellow-400/40'
                      : 'hover:border-gray-700'
                  } ${n.is_read ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-900 border-gray-700'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(' ')[1]}`}>
                    <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${n.is_read ? 'text-gray-300' : 'text-white'}`}>{n.title}</p>
                    <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                    {(n.type === 'message' && n.related_id) || (n.related_id && n.type === 'success' && n.title.includes('Unlocked')) ? (
                      <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium mt-1.5">
                        <MessageSquare className="w-3 h-3" /> Open Chat <ArrowRight className="w-3 h-3" />
                      </div>
                    ) : null}
                    <p className="text-gray-600 text-xs mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0 mt-1.5"></div>}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
