import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Siren, Package, Activity, Clock, AlertTriangle, ChevronRight,
  Settings, Truck, ArrowRight, Sparkles, ChevronDown, ChevronUp,
  MessageSquare, FileText, Bot, CheckCircle, MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface PartSnapshot {
  id: string;
  part_name: string;
  price: number;
  image_urls: string[] | null;
  image_url: string | null;
  category: string;
}

interface PMKit {
  id: string;
  brand: string;
  model: string;
  category: string;
  name: string;
  description: string;
  price: number;
  parts_list: string[];
  image_url: string | null;
}

interface ActiveBreakdown {
  id: string;
  machine_model: string;
  machine_type: string;
  dispatch_status: string;
  status: string;
  urgency: string;
  quote_amount: number;
  location: string;
  created_at: string;
  mechanic_offer_status: string | null;
}

const DISPATCH_STEPS = [
  { key: 'pending_admin_review', label: 'Reviewing Request', icon: Clock },
  { key: 'quote_sent', label: 'Quote Ready', icon: FileText },
  { key: 'paid', label: 'Payment Secured', icon: CheckCircle },
  { key: 'dispatched', label: 'Mechanic Deployed', icon: MapPin },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const STATUS_COLORS: Record<string, string> = {
  pending_admin_review: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  quote_sent: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  dispatched: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  completed: 'bg-green-500/15 text-green-300 border-green-500/30',
};

const QUICK_ACTIONS = [
  { to: '/marketplace/parts', icon: Package, label: 'Browse Parts', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/40' },
  { to: '/marketplace/rentals', icon: Truck, label: 'Rent Equipment', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/40' },
  { to: '/my-requests', icon: FileText, label: 'My Requests', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/40' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/40' },
  { to: '/ai-diagnose', icon: Bot, label: 'AI Diagnosis', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'hover:border-teal-500/40' },
  { to: '/breakdown/new', icon: Siren, label: 'Report Breakdown', color: 'text-red-400', bg: 'bg-red-500/10', border: 'hover:border-red-500/40' },
];

export default function OwnerDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<PartSnapshot[]>([]);
  const [pmKits, setPmKits] = useState<PMKit[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveBreakdown[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [partsRes, kitsRes, jobsRes] = await Promise.all([
        supabase
          .from('parts_listings')
          .select('id, part_name, price, image_urls, image_url, category')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('pm_kits')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(8),
        supabase
          .from('breakdown_requests')
          .select('id, machine_model, machine_type, dispatch_status, status, urgency, quote_amount, location, created_at, mechanic_offer_status')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      setParts((partsRes.data || []) as PartSnapshot[]);
      setPmKits(((kitsRes.data || []) as any[]).map(k => ({
        ...k,
        parts_list: Array.isArray(k.parts_list) ? k.parts_list : [],
      })));
      setActiveJobs((jobsRes.data || []) as ActiveBreakdown[]);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const kitsByBrand = pmKits.reduce<Record<string, PMKit[]>>((acc, k) => {
    const brand = k.brand || 'General';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(k);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome, {profile?.name?.split(' ')[0] || 'Owner'}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Machine Owner Dashboard</p>
            </div>
            <Link
              to="/breakdown/new"
              className="group flex items-center gap-2.5 bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-red-900/40 transition-all"
            >
              <Siren className="w-4 h-4 animate-pulse" />
              Report Breakdown
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold">Active Job Status</h2>
                {activeJobs.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-gray-950 text-xs font-black flex items-center justify-center">
                    {activeJobs.length}
                  </span>
                )}
              </div>
              <Link to="/breakdown" className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm mb-1">No active jobs yet</p>
                <p className="text-gray-600 text-xs mb-4">Report a breakdown to get started</p>
                <Link to="/breakdown/new" className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-sm font-medium">
                  Report a breakdown <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeJobs.map((job) => {
                  const stepIndex = DISPATCH_STEPS.findIndex(s => s.key === (job.dispatch_status || 'pending_admin_review'));
                  const progress = Math.max(8, ((stepIndex + 1) / DISPATCH_STEPS.length) * 100);
                  const statusClass = STATUS_COLORS[job.dispatch_status] || 'bg-gray-800 text-gray-300 border-gray-700';
                  const isExpanded = expandedJob === job.id;

                  return (
                    <div key={job.id} className="border border-gray-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="w-full bg-gray-950/60 hover:bg-gray-900/80 p-4 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate text-sm">
                              {job.machine_type}{job.machine_model ? ` — ${job.machine_model}` : ''}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {format(new Date(job.created_at), 'MMM d, h:mm a')}
                              {job.location ? ` · ${job.location}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold capitalize ${statusClass}`}>
                              {(job.dispatch_status || 'pending_admin_review').replace(/_/g, ' ')}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                          />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2 bg-gray-900/60 border-t border-gray-800">
                              <div className="space-y-1.5 mb-4">
                                {DISPATCH_STEPS.map((step, i) => {
                                  const done = i <= stepIndex;
                                  const current = i === stepIndex;
                                  const StepIcon = step.icon;
                                  return (
                                    <div key={step.key} className={`flex items-center gap-2.5 text-xs ${done ? 'text-gray-200' : 'text-gray-600'}`}>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        current ? 'bg-amber-500 text-gray-950' : done ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-800 text-gray-600'
                                      }`}>
                                        <StepIcon className="w-3 h-3" />
                                      </div>
                                      <span className={current ? 'font-semibold text-amber-300' : ''}>{step.label}</span>
                                      {current && <span className="text-amber-400/60 text-[10px]">← Current</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              {job.quote_amount > 0 && (
                                <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2 mb-3">
                                  <span className="text-gray-400 text-xs">Quote Amount</span>
                                  <span className="text-emerald-300 font-bold text-sm">{job.quote_amount.toLocaleString()} ETB</span>
                                </div>
                              )}
                              <Link
                                to={`/owner/quote/${job.id}`}
                                className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm py-2 rounded-lg transition-colors"
                              >
                                View Full Details <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 border border-amber-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-white font-bold">How It Works</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              EquipLink connects you to verified technicians through our managed dispatch system.
            </p>
            <ol className="space-y-3 mb-6">
              {[
                { step: 'Report your machine breakdown', desc: 'Describe the issue and location' },
                { step: 'Admin reviews & assigns a pro', desc: 'We match the right verified technician' },
                { step: 'Review quote & pay securely', desc: 'Transparent pricing before work begins' },
                { step: 'Mechanic dispatched to site', desc: 'Track progress in real-time' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-gray-200 text-sm font-medium">{item.step}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/breakdown/new"
              className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Siren className="w-4 h-4" /> Start New Request
            </Link>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <h2 className="text-white font-bold mb-3 text-sm uppercase tracking-wider text-gray-400">Quick Actions</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-2.5 bg-gray-900 border border-gray-800 ${item.border} rounded-xl p-4 transition-colors group`}
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="text-gray-300 text-xs font-medium text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="text-white font-bold">Preventive Maintenance Kits</h2>
            </div>
            <Link to="/marketplace/parts" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
              Shop parts <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {pmKits.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">PM kits coming soon</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(kitsByBrand).map(([brand, kits]) => (
                <div key={brand}>
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-300 font-semibold text-xs uppercase tracking-widest">{brand}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kits.map((k) => (
                      <div
                        key={k.id}
                        className="bg-gray-950/60 border border-gray-800 hover:border-cyan-500/30 rounded-xl overflow-hidden transition-colors flex gap-0"
                      >
                        {k.image_url && (
                          <div className="w-24 flex-shrink-0 bg-gray-900">
                            <img src={k.image_url} alt={k.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-white font-semibold text-sm leading-tight">{k.name}</p>
                            <span className="text-cyan-400 font-bold text-sm whitespace-nowrap flex-shrink-0">
                              {Number(k.price).toLocaleString()} ETB
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mb-2">{k.model} · {k.category.replace(/_/g, ' ')}</p>
                          <p className="text-gray-400 text-xs leading-relaxed mb-2 line-clamp-2">{k.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {k.parts_list.slice(0, 3).map((p, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded-full">
                                {p}
                              </span>
                            ))}
                            {k.parts_list.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{k.parts_list.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold">Parts Marketplace</h2>
            </div>
            <Link to="/marketplace/parts" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
              Browse all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {parts.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No parts listed yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {parts.map((p) => {
                const img = p.image_urls?.[0] || p.image_url;
                return (
                  <Link
                    key={p.id}
                    to="/marketplace/parts"
                    className="group bg-gray-950/60 border border-gray-800 hover:border-blue-500/40 rounded-xl overflow-hidden transition-colors"
                  >
                    <div className="aspect-square bg-gray-900 overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={p.part_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-700" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-white text-sm font-medium truncate">{p.part_name}</p>
                      <p className="text-blue-400 text-sm font-bold mt-0.5">
                        {Number(p.price).toLocaleString()} ETB
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.section>

      </div>
    </div>
  );
}
