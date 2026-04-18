import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Send,
  BadgeCheck,
  Wrench,
  Mail,
  Megaphone,
  Package,
  Database,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  ArrowRight,
  FileText,
  Settings,
  CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface AdminStats {
  pendingDispatch: number;
  quotesSent: number;
  dispatched: number;
  pendingVerifications: number;
  verifiedMechanics: number;
  totalUsers: number;
  openJobPostings: number;
  activeMechanics: number;
}

interface ToolCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: typeof Shield;
  badge?: number;
  accent: string;
  ring: string;
}

export default function Admin() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    pendingDispatch: 0,
    quotesSent: 0,
    dispatched: 0,
    pendingVerifications: 0,
    verifiedMechanics: 0,
    totalUsers: 0,
    openJobPostings: 0,
    activeMechanics: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [
        pendingDispatch,
        quotesSent,
        dispatched,
        pendingVerifications,
        verifiedMechanics,
        totalUsers,
        openJobPostings,
        activeMechanics,
      ] = await Promise.all([
        supabase.from('breakdown_requests').select('id', { count: 'exact', head: true }).eq('dispatch_status', 'pending_admin_review'),
        supabase.from('breakdown_requests').select('id', { count: 'exact', head: true }).eq('dispatch_status', 'quote_sent'),
        supabase.from('breakdown_requests').select('id', { count: 'exact', head: true }).eq('dispatch_status', 'dispatched'),
        supabase.from('mechanic_verification_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending_verification'),
        supabase.from('mechanic_verification_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mechanic'),
      ]);
      setStats({
        pendingDispatch: pendingDispatch.count ?? 0,
        quotesSent: quotesSent.count ?? 0,
        dispatched: dispatched.count ?? 0,
        pendingVerifications: pendingVerifications.count ?? 0,
        verifiedMechanics: verifiedMechanics.count ?? 0,
        totalUsers: totalUsers.count ?? 0,
        openJobPostings: openJobPostings.count ?? 0,
        activeMechanics: activeMechanics.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const tools: ToolCard[] = [
    {
      key: 'dispatch',
      title: 'Job Dispatch Center',
      description: 'Review breakdown tickets, assign verified technicians, and issue price quotes to owners.',
      to: '/admin/dispatch',
      icon: Send,
      badge: stats.pendingDispatch,
      accent: 'from-amber-500/20 to-amber-600/5',
      ring: 'border-amber-700/40 hover:border-amber-500',
    },
    {
      key: 'verification',
      title: 'Mechanic Verification',
      description: 'Review uploaded CVs, certificates, brand experience, and approve new technicians.',
      to: '/admin/mechanic-verification',
      icon: BadgeCheck,
      badge: stats.pendingVerifications,
      accent: 'from-emerald-500/20 to-emerald-600/5',
      ring: 'border-emerald-700/40 hover:border-emerald-500',
    },
    {
      key: 'job-matching',
      title: 'Job Matching',
      description: 'Review open job postings and match available mechanics from the verified pool.',
      to: '/admin/job-matching',
      icon: Wrench,
      badge: stats.openJobPostings,
      accent: 'from-blue-500/20 to-blue-600/5',
      ring: 'border-blue-700/40 hover:border-blue-500',
    },
    {
      key: 'announcements',
      title: 'Announcements',
      description: 'Broadcast system-wide alerts and promotions to users in-app.',
      to: '/admin/announcements',
      icon: Megaphone,
      accent: 'from-rose-500/20 to-rose-600/5',
      ring: 'border-rose-700/40 hover:border-rose-500',
    },
    {
      key: 'email',
      title: 'Email Broadcast',
      description: 'Send targeted emails to mechanics, suppliers, or owners.',
      to: '/admin/email-broadcast',
      icon: Mail,
      accent: 'from-cyan-500/20 to-cyan-600/5',
      ring: 'border-cyan-700/40 hover:border-cyan-500',
    },
    {
      key: 'listings',
      title: 'Listings Management',
      description: 'Moderate parts and rental listings across the marketplace.',
      to: '/admin/listings',
      icon: Package,
      accent: 'from-orange-500/20 to-orange-600/5',
      ring: 'border-orange-700/40 hover:border-orange-500',
    },
    {
      key: 'pm-kits',
      title: 'PM Kits Manager',
      description: 'Add and manage preventive maintenance kits shown on the owner dashboard.',
      to: '/admin/pm-kits',
      icon: Settings,
      accent: 'from-cyan-500/20 to-cyan-600/5',
      ring: 'border-cyan-700/40 hover:border-cyan-500',
    },
    {
      key: 'demo',
      title: 'Demo Data',
      description: 'Seed or refresh sample data for demos and staging environments.',
      to: '/admin/demo-data',
      icon: Database,
      accent: 'from-slate-500/20 to-slate-600/5',
      ring: 'border-slate-700/40 hover:border-slate-500',
    },
    {
      key: 'payments',
      title: 'Payment Approvals',
      description: 'Review and approve user wallet top-up payments and manual bank transfers.',
      to: '/admin/payments',
      icon: CreditCard,
      accent: 'from-yellow-500/20 to-yellow-600/5',
      ring: 'border-yellow-700/40 hover:border-yellow-500',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Admin Control Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">
            Welcome, {profile?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-gray-400 mt-1">
            Operations, verification, and dispatch tools for the EquipLink platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <StatCard
            icon={AlertTriangle}
            label="Pending Dispatch"
            value={stats.pendingDispatch}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <StatCard
            icon={Clock}
            label="Quotes Sent"
            value={stats.quotesSent}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={Activity}
            label="Dispatched"
            value={stats.dispatched}
            color="text-teal-400"
            bg="bg-teal-500/10"
          />
          <StatCard
            icon={BadgeCheck}
            label="Pending Verifications"
            value={stats.pendingVerifications}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <StatCard
            icon={CheckCircle2}
            label="Verified Mechanics"
            value={stats.verifiedMechanics}
            color="text-emerald-300"
            bg="bg-emerald-500/5"
          />
          <StatCard
            icon={Wrench}
            label="Active Mechanics"
            value={stats.activeMechanics}
            color="text-blue-300"
            bg="bg-blue-500/5"
          />
          <StatCard
            icon={FileText}
            label="Open Job Posts"
            value={stats.openJobPostings}
            color="text-orange-300"
            bg="bg-orange-500/5"
          />
          <StatCard
            icon={Shield}
            label="Total Users"
            value={stats.totalUsers}
            color="text-white"
            bg="bg-gray-800"
          />
        </div>

        <div className="mt-10 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Management Tools</h2>
          <span className="text-xs text-gray-500">{tools.length} modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, idx) => (
            <motion.div
              key={tool.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Link
                to={tool.to}
                className={`relative block bg-gradient-to-br ${tool.accent} bg-gray-900 border ${tool.ring} rounded-2xl p-5 transition-all hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center">
                    <tool.icon className="w-5 h-5 text-white" />
                  </div>
                  {typeof tool.badge === 'number' && tool.badge > 0 && (
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-gray-900">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1.5">{tool.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{tool.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-white">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" /> Privacy & Governance
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            All mechanic contact details, owner payment records, and dispatch data stay within this console.
            Owners never see technician contact info. Every quote, assignment, and payout is audit-logged.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Shield;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
