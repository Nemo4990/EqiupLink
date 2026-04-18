import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Siren, Package, Wrench, Star, Activity, ShieldCheck, Award,
  Clock, CheckCircle, AlertTriangle, ChevronRight, Settings,
  Truck, ArrowRight, Sparkles
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

interface TopPro {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  rating: number;
  total_reviews: number;
  pro_badge: boolean;
  merchant_badge: string | null;
  is_verified: boolean;
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
}

interface ActiveBreakdown {
  id: string;
  machine_model: string;
  machine_type: string;
  dispatch_status: string;
  status: string;
  urgency: string;
  quote_amount: number;
  created_at: string;
}

const DISPATCH_STEPS = [
  { key: 'pending_admin_review', label: 'Admin Reviewing' },
  { key: 'quote_sent', label: 'Quote Ready' },
  { key: 'quote_accepted', label: 'Awaiting Payment' },
  { key: 'paid', label: 'Payment Secured' },
  { key: 'dispatched', label: 'Mechanic Deployed' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<string, string> = {
  pending_admin_review: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  quote_sent: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  quote_accepted: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  dispatched: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  completed: 'bg-green-500/15 text-green-300 border-green-500/30',
};

export default function OwnerDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<PartSnapshot[]>([]);
  const [topPros, setTopPros] = useState<TopPro[]>([]);
  const [pmKits, setPmKits] = useState<PMKit[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveBreakdown[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [partsRes, prosRes, kitsRes, jobsRes] = await Promise.all([
        supabase
          .from('parts_listings')
          .select('id, part_name, price, image_urls, image_url, category')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('profiles')
          .select('id, name, role, avatar_url, rating, total_reviews, pro_badge, merchant_badge, is_verified')
          .in('role', ['mechanic', 'supplier'])
          .eq('is_verified', true)
          .order('rating', { ascending: false })
          .limit(6),
        supabase
          .from('pm_kits')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(8),
        supabase
          .from('breakdown_requests')
          .select('id, machine_model, machine_type, dispatch_status, status, urgency, quote_amount, created_at')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setParts((partsRes.data || []) as PartSnapshot[]);
      setTopPros((prosRes.data || []) as TopPro[]);
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
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.name?.split(' ')[0] || 'Owner'}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Machine Owner Dashboard</p>
            </div>
            <Link
              to="/breakdown/new"
              className="group flex items-center gap-3 bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-red-900/40 transition-all"
            >
              <div className="relative">
                <Siren className="w-5 h-5 animate-pulse" />
                <div className="absolute inset-0 bg-white/30 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              Report Machine Breakdown
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold">Active Jobs Status</h2>
              </div>
              <Link to="/breakdown" className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-10 text-center">
                <AlertTriangle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No active jobs yet</p>
                <Link to="/breakdown/new" className="mt-3 inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium">
                  Report your first breakdown <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => {
                  const stepIndex = DISPATCH_STEPS.findIndex(s => s.key === (job.dispatch_status || 'pending_admin_review'));
                  const progress = Math.max(10, ((stepIndex + 1) / DISPATCH_STEPS.length) * 100);
                  const statusClass = STATUS_COLORS[job.dispatch_status] || 'bg-gray-800 text-gray-300 border-gray-700';
                  return (
                    <Link
                      key={job.id}
                      to={`/owner/quote/${job.id}`}
                      className="block bg-gray-950/60 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">
                            {job.machine_model} — {job.machine_type}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {format(new Date(job.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold capitalize ${statusClass}`}>
                          {(job.dispatch_status || 'pending_admin_review').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs">
                        <span className="text-gray-400">
                          {DISPATCH_STEPS[Math.max(0, stepIndex)]?.label || 'Pending'}
                        </span>
                        {job.quote_amount > 0 && (
                          <span className="text-emerald-300 font-semibold">
                            Quote: {job.quote_amount.toLocaleString()} ETB
                          </span>
                        )}
                      </div>
                    </Link>
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
              <h2 className="text-white font-bold">Need Urgent Help?</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Report your machine breakdown. Our team reviews it, assigns the right mechanic, and sends you a price quote.
            </p>
            <ol className="space-y-2 mb-5">
              {['Describe your machine & issue', 'Admin reviews & assigns a pro', 'Review quote & pay securely', 'Mechanic dispatched to site'].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Link
              to="/breakdown/new"
              className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold py-2.5 rounded-xl transition-colors"
            >
              <Siren className="w-4 h-4" /> Start New Request
            </Link>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold">Marketplace Snapshot</h2>
            </div>
            <Link to="/marketplace/parts" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
              Browse all parts <ChevronRight className="w-4 h-4" />
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
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white font-bold">Top Rated Professionals</h2>
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Verified Only
              </span>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Contact via platform
            </span>
          </div>
          {topPros.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No verified professionals yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topPros.map((pro) => (
                <div
                  key={pro.id}
                  className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex-shrink-0">
                      {pro.avatar_url ? (
                        <img src={pro.avatar_url} alt={pro.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                          {pro.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm truncate">{pro.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{pro.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold">{(pro.rating || 0).toFixed(1)}</span>
                      <span className="text-gray-500">({pro.total_reviews || 0})</span>
                    </span>
                    {pro.pro_badge && (
                      <span className="bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                        PRO
                      </span>
                    )}
                    {pro.merchant_badge && (
                      <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded-full font-semibold capitalize">
                        {pro.merchant_badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Contact hidden — reach out via EquipLink platform only
                    </p>
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
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="text-white font-bold">Preventive Maintenance Kits</h2>
            </div>
            <Link to="/marketplace/parts" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
              Shop PM parts <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {pmKits.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">PM kits coming soon</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(kitsByBrand).map(([brand, kits]) => (
                <div key={brand}>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide">{brand}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kits.map((k) => (
                      <div
                        key={k.id}
                        className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 hover:border-cyan-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-white font-semibold text-sm">{k.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {k.model} · {k.category.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <span className="text-cyan-400 font-bold text-sm whitespace-nowrap">
                            {Number(k.price).toLocaleString()} ETB
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">{k.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {k.parts_list.slice(0, 4).map((p, i) => (
                            <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                              {p}
                            </span>
                          ))}
                          {k.parts_list.length > 4 && (
                            <span className="text-[10px] text-gray-500 px-2 py-0.5">
                              +{k.parts_list.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/marketplace/mechanics', icon: Wrench, label: 'Find Mechanics' },
            { to: '/marketplace/parts', icon: Package, label: 'Browse Parts' },
            { to: '/marketplace/rentals', icon: Truck, label: 'Rentals' },
            { to: '/my-requests', icon: Clock, label: 'My Requests' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition-colors"
            >
              <item.icon className="w-5 h-5 text-amber-400" />
              <span className="text-gray-300 text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
