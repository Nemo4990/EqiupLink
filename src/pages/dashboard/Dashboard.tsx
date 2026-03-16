import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench, AlertTriangle, Package, Truck, MessageSquare, Bell,
  Plus, ChevronRight, Star, Clock, CheckCircle, Activity, Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BreakdownRequest, Notification } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';

const URGENCY_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  critical: 'text-red-400 bg-red-900/30',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-400 bg-blue-900/30',
  assigned: 'text-yellow-400 bg-yellow-900/30',
  in_progress: 'text-orange-400 bg-orange-900/30',
  resolved: 'text-green-400 bg-green-900/30',
  cancelled: 'text-gray-400 bg-gray-800',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [breakdowns, setBreakdowns] = useState<BreakdownRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, messages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, avatar_url), assigned_mechanic:profiles!breakdown_requests_assigned_mechanic_id_fkey(name)')
        .eq(profile.role === 'mechanic' ? 'assigned_mechanic_id' : 'owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', profile.id)
        .eq('is_read', false),
    ]).then(([br, notifs, msgs]) => {
      const bds = (br.data || []) as BreakdownRequest[];
      setBreakdowns(bds);
      setNotifications((notifs.data || []) as Notification[]);
      setStats({
        open: bds.filter(b => b.status === 'open').length,
        resolved: bds.filter(b => b.status === 'resolved').length,
        messages: msgs.count ?? 0,
      });
      setLoading(false);
    });
  }, [profile]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const isOwner = profile?.role === 'owner';
  const isMechanic = profile?.role === 'mechanic';
  const isSupplier = profile?.role === 'supplier';
  const isRental = profile?.role === 'rental_provider';

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.name?.split(' ')[0]}
              </h1>
              <p className="text-gray-400 mt-1 capitalize">{profile?.role?.replace('_', ' ')} Dashboard</p>
            </div>
            {isOwner && (
              <Link
                to="/breakdown/new"
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Post Breakdown
              </Link>
            )}
            {isMechanic && (
              <Link
                to="/profile"
                className="flex items-center gap-2 border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                Edit Profile
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: AlertTriangle, label: 'Open Requests', value: stats.open, color: 'text-orange-400', bg: 'bg-orange-400/10' },
              { icon: CheckCircle, label: 'Resolved', value: stats.resolved, color: 'text-green-400', bg: 'bg-green-400/10' },
              { icon: MessageSquare, label: 'Unread Messages', value: stats.messages, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { icon: Activity, label: 'Total Activity', value: breakdowns.length, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-sm mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">
                    {isMechanic ? 'Assigned Jobs' : 'Breakdown Requests'}
                  </h2>
                  <Link to="/breakdown" className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                {breakdowns.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No requests yet</p>
                    {isOwner && (
                      <Link to="/breakdown/new" className="mt-3 inline-block text-yellow-400 hover:text-yellow-300 text-sm">
                        Post your first breakdown request
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {breakdowns.map((bd) => (
                      <div key={bd.id} className="px-5 py-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{bd.machine_model} — {bd.machine_type}</p>
                            <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{bd.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[bd.status]}`}>{bd.status.replace('_', ' ')}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${URGENCY_COLORS[bd.urgency]}`}>{bd.urgency}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-gray-500 text-xs">{format(new Date(bd.created_at), 'MMM d')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold">Notifications</h2>
                  <Bell className="w-4 h-4 text-gray-500" />
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-yellow-400/5' : ''}`}>
                        <p className="text-white text-sm font-medium">{n.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-gray-600 text-xs mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {isOwner && (
                    <>
                      <Link to="/breakdown/new" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <AlertTriangle className="w-4 h-4" /> Post Breakdown Request
                      </Link>
                      <Link to="/marketplace/mechanics" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Wrench className="w-4 h-4" /> Find a Mechanic
                      </Link>
                      <Link to="/marketplace/parts" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Package className="w-4 h-4" /> Browse Parts
                      </Link>
                    </>
                  )}
                  {isMechanic && (
                    <>
                      <Link to="/jobs" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Briefcase className="w-4 h-4" /> Available Jobs
                      </Link>
                      <Link to="/breakdown" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <AlertTriangle className="w-4 h-4" /> My Jobs
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                        <Star className="w-4 h-4" /> Update Profile
                      </Link>
                    </>
                  )}
                  {isSupplier && (
                    <Link to="/listings/new-part" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                      <Package className="w-4 h-4" /> Add New Part
                    </Link>
                  )}
                  {isRental && (
                    <Link to="/listings/new-rental" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                      <Truck className="w-4 h-4" /> Add Rental Listing
                    </Link>
                  )}
                  <Link to="/messages" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm py-2 transition-colors">
                    <MessageSquare className="w-4 h-4" /> Messages
                    {stats.messages > 0 && <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.messages}</span>}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
