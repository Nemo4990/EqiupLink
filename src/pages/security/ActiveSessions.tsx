import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Monitor, Smartphone, Tablet, Globe, LogOut, Clock,
  AlertTriangle, CheckCircle, ArrowLeft, RefreshCw, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { revokeSession, parseDeviceInfo } from '../../lib/security';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  is_current: boolean;
  last_active: string;
  revoked_at: string | null;
  created_at: string;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  device_name: string;
  ip_address: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function DeviceIcon({ os }: { os: string }) {
  const lower = os.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (lower.includes('ipad')) {
    return <Tablet className="w-5 h-5" />;
  }
  return <Monitor className="w-5 h-5" />;
}

const EVENT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  new_device_login: { color: 'text-orange-400', bg: 'bg-orange-900/30', label: 'New Device Login' },
  login_success: { color: 'text-green-400', bg: 'bg-green-900/30', label: 'Login' },
  login_failed: { color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed Login' },
  logout: { color: 'text-gray-400', bg: 'bg-gray-800', label: 'Logout' },
  session_revoked: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Session Revoked' },
  password_reset: { color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Password Reset' },
};

export default function ActiveSessions() {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [tab, setTab] = useState<'sessions' | 'activity'>('sessions');
  const currentToken = sessionStorage.getItem('eq_session_token');
  const { deviceName: currentDevice } = parseDeviceInfo();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [sessionsRes, eventsRes] = await Promise.all([
      supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_active', { ascending: false }),
      supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    setSessions((sessionsRes.data || []) as UserSession[]);
    setEvents((eventsRes.data || []) as SecurityEvent[]);
    setLoading(false);
  };

  const handleRevoke = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      await signOut();
      return;
    }
    setRevoking(sessionId);
    await revokeSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Session revoked successfully.');
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    if (!user) return;
    const others = sessions.filter(s => s.session_token !== currentToken);
    for (const s of others) {
      await revokeSession(s.id);
    }
    toast.success('All other sessions revoked.');
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Security & Sessions</h1>
              <p className="text-gray-400 text-sm mt-0.5">Manage your active sessions and review security activity</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="text-gray-500 hover:text-gray-300 p-2 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['sessions', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'sessions' ? 'Active Sessions' : 'Security Activity'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : tab === 'sessions' ? (
          <>
            {sessions.filter(s => s.session_token !== currentToken).length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-medium text-sm">Other active sessions</p>
                  <p className="text-gray-400 text-xs">{sessions.filter(s => s.session_token !== currentToken).length} other devices are signed in</p>
                </div>
                <button
                  onClick={handleRevokeAll}
                  className="flex items-center gap-1.5 text-red-400 border border-red-800 hover:bg-red-900/20 text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out all others
                </button>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-20">
                <Lock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-white font-medium">No active sessions found</p>
                <p className="text-gray-500 text-sm mt-1">Sessions appear after logging in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => {
                  const isCurrent = session.session_token === currentToken;

                  return (
                    <motion.div
                      key={session.id}
                      layout
                      className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${
                        isCurrent ? 'border-yellow-800/50' : 'border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isCurrent ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-800 text-gray-400'
                          }`}>
                            <DeviceIcon os={session.os} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-semibold text-sm">{session.device_name}</p>
                              {isCurrent && (
                                <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle className="w-3 h-3" /> This device
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">{session.browser} · {session.os}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {session.ip_address}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Last active {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-gray-700 text-xs mt-0.5">
                              Signed in {format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevoke(session.id, isCurrent)}
                          disabled={revoking === session.id}
                          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors whitespace-nowrap flex-shrink-0 ${
                            isCurrent
                              ? 'border-red-800 text-red-400 hover:bg-red-900/20'
                              : 'border-gray-700 text-gray-400 hover:border-red-700 hover:text-red-400'
                          }`}
                        >
                          {revoking === session.id ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <LogOut className="w-3 h-3" />
                          )}
                          {isCurrent ? 'Sign Out' : 'Revoke'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {events.length === 0 ? (
              <div className="text-center py-20">
                <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-white font-medium">No security events recorded</p>
                <p className="text-gray-500 text-sm mt-1">Activity will appear here after login events</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-800">
                  {events.map(event => {
                    const style = EVENT_STYLES[event.event_type] || {
                      color: 'text-gray-400', bg: 'bg-gray-800', label: event.event_type.replace(/_/g, ' ')
                    };
                    const isWarning = event.event_type === 'new_device_login' || event.event_type === 'login_failed';

                    return (
                      <AnimatePresence key={event.id}>
                        <div className="px-5 py-4 flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                            {isWarning
                              ? <AlertTriangle className={`w-4 h-4 ${style.color}`} />
                              : event.event_type === 'logout' || event.event_type === 'session_revoked'
                              ? <LogOut className={`w-4 h-4 ${style.color}`} />
                              : <CheckCircle className={`w-4 h-4 ${style.color}`} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.color} ${style.bg}`}>
                                {style.label}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">{event.device_name}</p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')} · {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </AnimatePresence>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
