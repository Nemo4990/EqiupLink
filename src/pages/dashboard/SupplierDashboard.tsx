import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, TrendingUp, Eye, MessageSquare, Crown, ArrowRight,
  Plus, Star, Award, ChevronRight, BarChart3, Zap, Bell,
  ShoppingCart, Search, Layers, CheckCircle, Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Notification, Subscription, PartsListing } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format, formatDistanceToNow } from 'date-fns';

interface MarketStat {
  listing_id: string;
  part_name: string;
  category: string;
  price: number;
  view_count: number;
  inquiry_count: number;
  stock_quantity: number;
}

interface CategoryStat {
  category: string;
  count: number;
  total_views: number;
  total_inquiries: number;
}

type MerchantBadge = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string; next: string }> = {
  bronze: {
    label: 'Bronze Merchant',
    color: 'text-amber-600',
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/40',
    icon: '🥉',
    next: 'List 5+ parts or get 20+ inquiries to reach Silver',
  },
  silver: {
    label: 'Silver Merchant',
    color: 'text-slate-300',
    bg: 'bg-slate-800/40',
    border: 'border-slate-600/40',
    icon: '🥈',
    next: 'List 15+ parts or get 100+ inquiries to reach Gold',
  },
  gold: {
    label: 'Gold Merchant',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/40',
    icon: '🥇',
    next: 'List 30+ parts or get 300+ inquiries to reach Platinum',
  },
  platinum: {
    label: 'Platinum Merchant',
    color: 'text-cyan-300',
    bg: 'bg-cyan-900/20',
    border: 'border-cyan-700/40',
    icon: '💎',
    next: 'You have reached the highest tier!',
  },
};

const BADGE_REQUIREMENTS = [
  { badge: 'bronze', listings: 1, inquiries: 0, label: 'Bronze' },
  { badge: 'silver', listings: 5, inquiries: 20, label: 'Silver' },
  { badge: 'gold', listings: 15, inquiries: 100, label: 'Gold' },
  { badge: 'platinum', listings: 30, inquiries: 300, label: 'Platinum' },
];

const CATEGORY_ICONS: Record<string, string> = {
  hydraulics: '🔩',
  engine: '⚙️',
  electrical: '⚡',
  filters: '🔄',
  sensors: '📡',
  valves: '🔧',
  transmission: '🔁',
  undercarriage: '🛤️',
  other: '📦',
};

export default function SupplierDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<PartsListing[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [merchantBadge, setMerchantBadge] = useState<MerchantBadge>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isPro = profile?.subscription_tier === 'pro';

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);

    const [listingsRes, notifRes, subRes, msgRes, viewsRes, inquiriesRes, badgeRes] = await Promise.all([
      supabase
        .from('parts_listings')
        .select('*')
        .eq('supplier_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('role', 'supplier')
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', profile.id)
        .eq('is_read', false),
      supabase
        .from('part_views')
        .select('listing_id, viewed_at')
        .in('listing_id', []),
      supabase
        .from('part_inquiries')
        .select('listing_id, created_at')
        .in('listing_id', []),
      supabase
        .from('profiles')
        .select('merchant_badge')
        .eq('id', profile.id)
        .maybeSingle(),
    ]);

    const allListings = (listingsRes.data || []) as PartsListing[];
    setListings(allListings);
    setNotifications((notifRes.data || []) as Notification[]);
    setSubscription(subRes.data || null);
    setUnreadMessages(msgRes.count ?? 0);
    setMerchantBadge((badgeRes.data?.merchant_badge as MerchantBadge) || null);

    if (allListings.length > 0) {
      const listingIds = allListings.map(l => l.id);

      const [allViewsRes, allInquiriesRes] = await Promise.all([
        supabase.from('part_views').select('listing_id').in('listing_id', listingIds),
        supabase.from('part_inquiries').select('listing_id').in('listing_id', listingIds),
      ]);

      const viewsData = allViewsRes.data || [];
      const inquiriesData = allInquiriesRes.data || [];

      const viewsByListing: Record<string, number> = {};
      viewsData.forEach(v => { viewsByListing[v.listing_id] = (viewsByListing[v.listing_id] || 0) + 1; });

      const inquiriesByListing: Record<string, number> = {};
      inquiriesData.forEach(i => { inquiriesByListing[i.listing_id] = (inquiriesByListing[i.listing_id] || 0) + 1; });

      const stats: MarketStat[] = allListings.map(l => ({
        listing_id: l.id,
        part_name: l.part_name,
        category: l.category,
        price: l.price,
        view_count: viewsByListing[l.id] || 0,
        inquiry_count: inquiriesByListing[l.id] || 0,
        stock_quantity: l.stock_quantity,
      }));

      setMarketStats(stats);
      setTotalViews(viewsData.length);
      setTotalInquiries(inquiriesData.length);

      const catMap: Record<string, CategoryStat> = {};
      stats.forEach(s => {
        if (!catMap[s.category]) catMap[s.category] = { category: s.category, count: 0, total_views: 0, total_inquiries: 0 };
        catMap[s.category].count++;
        catMap[s.category].total_views += s.view_count;
        catMap[s.category].total_inquiries += s.inquiry_count;
      });
      setCategoryStats(Object.values(catMap).sort((a, b) => b.total_inquiries - a.total_inquiries));

      const autoComputedBadge = computeBadge(allListings.length, inquiriesData.length);
      if (autoComputedBadge !== (badgeRes.data?.merchant_badge || null)) {
        await supabase.from('profiles').update({ merchant_badge: autoComputedBadge }).eq('id', profile.id);
        setMerchantBadge(autoComputedBadge);
      }
    }

    setLoading(false);
  };

  const computeBadge = (listingCount: number, inquiryCount: number): MerchantBadge => {
    if (listingCount >= 30 || inquiryCount >= 300) return 'platinum';
    if (listingCount >= 15 || inquiryCount >= 100) return 'gold';
    if (listingCount >= 5 || inquiryCount >= 20) return 'silver';
    if (listingCount >= 1) return 'bronze';
    return null;
  };

  const topSearched = [...marketStats].sort((a, b) => b.view_count - a.view_count).slice(0, 5);
  const topSold = [...marketStats].sort((a, b) => b.inquiry_count - a.inquiry_count).slice(0, 5);
  const lowStock = listings.filter(l => l.stock_quantity <= 3 && l.is_active);

  const badgeCfg = merchantBadge ? BADGE_CONFIG[merchantBadge] : null;
  const activeListing = listings.filter(l => l.is_active).length;

  const nextBadge = BADGE_REQUIREMENTS.find(b => {
    if (!merchantBadge) return b.badge === 'bronze';
    const order = ['bronze', 'silver', 'gold', 'platinum'];
    return order.indexOf(b.badge) > order.indexOf(merchantBadge);
  });

  const progressToNextBadge = () => {
    if (!nextBadge || merchantBadge === 'platinum') return 100;
    const listingPct = Math.min((activeListing / nextBadge.listings) * 100, 100);
    const inquiryPct = nextBadge.inquiries > 0 ? Math.min((totalInquiries / nextBadge.inquiries) * 100, 100) : 100;
    return Math.max(listingPct, inquiryPct);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white">
                {profile?.name?.split(' ')[0]}'s Store
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-gray-400">Supplier Dashboard</p>
                {isPro && (
                  <span className="flex items-center gap-1 text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                )}
                {badgeCfg && (
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badgeCfg.bg} ${badgeCfg.color} ${badgeCfg.border}`}>
                    <Award className="w-3 h-3" /> {badgeCfg.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isPro && (
                <Link
                  to="/subscription"
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm"
                >
                  <Crown className="w-4 h-4" /> Go Pro
                </Link>
              )}
              <Link
                to="/listings/new-part"
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Add Part
              </Link>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Package, label: 'Active Listings', value: activeListing, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { icon: Eye, label: 'Total Views', value: totalViews.toLocaleString(), color: 'text-green-400', bg: 'bg-green-400/10' },
              { icon: ShoppingCart, label: 'Total Inquiries', value: totalInquiries.toLocaleString(), color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { icon: MessageSquare, label: 'Unread Messages', value: unreadMessages, color: 'text-orange-400', bg: 'bg-orange-400/10' },
            ].map(stat => (
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
            {/* Left column — market intelligence */}
            <div className="lg:col-span-2 space-y-6">

              {/* Merchant Badge Progress */}
              <div className={`rounded-2xl border p-5 ${badgeCfg ? `${badgeCfg.bg} ${badgeCfg.border}` : 'bg-gray-900 border-gray-800'}`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-400" />
                      Merchant Badge
                    </h2>
                    {badgeCfg ? (
                      <p className={`text-sm font-semibold mt-1 ${badgeCfg.color}`}>{badgeCfg.icon} {badgeCfg.label}</p>
                    ) : (
                      <p className="text-gray-500 text-sm mt-1">No badge yet — list your first part to earn Bronze</p>
                    )}
                  </div>
                  {merchantBadge === 'platinum' && (
                    <span className="text-2xl">💎</span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {BADGE_REQUIREMENTS.map(req => {
                    const order = ['bronze', 'silver', 'gold', 'platinum'];
                    const currentIdx = merchantBadge ? order.indexOf(merchantBadge) : -1;
                    const reqIdx = order.indexOf(req.badge);
                    const isEarned = currentIdx >= reqIdx;
                    const isCurrent = merchantBadge === req.badge;
                    return (
                      <div key={req.badge} className={`rounded-xl p-3 text-center border transition-all ${
                        isCurrent ? 'bg-yellow-400/15 border-yellow-500/50 scale-105' :
                        isEarned ? 'bg-gray-800 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-50'
                      }`}>
                        <p className="text-lg mb-1">{BADGE_CONFIG[req.badge].icon}</p>
                        <p className={`text-xs font-bold ${isEarned ? BADGE_CONFIG[req.badge].color : 'text-gray-600'}`}>{req.label}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{req.listings}+ parts</p>
                      </div>
                    );
                  })}
                </div>

                {merchantBadge !== 'platinum' && nextBadge && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress to {BADGE_CONFIG[nextBadge.badge].label}</span>
                      <span>{Math.round(progressToNextBadge())}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNextBadge()}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1.5">{badgeCfg ? badgeCfg.next : 'List 1+ part to earn Bronze'}</p>
                  </div>
                )}
              </div>

              {/* Most Searched Parts */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    Most Viewed Parts
                  </h2>
                  <span className="text-gray-500 text-xs">Last 30 days</span>
                </div>
                {topSearched.length === 0 ? (
                  <div className="py-10 text-center">
                    <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No view data yet. List parts to start tracking.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {topSearched.map((stat, i) => (
                      <div key={stat.listing_id} className="px-5 py-3.5 flex items-center gap-4">
                        <span className={`text-sm font-black w-5 text-right flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{stat.part_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-600 text-xs capitalize">
                              {CATEGORY_ICONS[stat.category] || '📦'} {stat.category}
                            </span>
                            <span className="text-gray-700 text-xs">·</span>
                            <span className="text-gray-500 text-xs">{stat.price.toLocaleString()} ETB</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-400 flex-shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold">{stat.view_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Most Inquired Parts */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Most Inquired Parts
                    <span className="text-xs text-gray-500 font-normal">(buyer interest)</span>
                  </h2>
                </div>
                {topSold.length === 0 ? (
                  <div className="py-10 text-center">
                    <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No inquiry data yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {topSold.map((stat, i) => {
                      const pct = topSold[0].inquiry_count > 0 ? (stat.inquiry_count / topSold[0].inquiry_count) * 100 : 0;
                      return (
                        <div key={stat.listing_id} className="px-5 py-3.5">
                          <div className="flex items-center gap-4 mb-1.5">
                            <span className={`text-sm font-black w-5 text-right flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                              #{i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{stat.part_name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-green-400 flex-shrink-0">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span className="text-sm font-bold">{stat.inquiry_count}</span>
                            </div>
                          </div>
                          <div className="ml-9 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category Performance */}
              {categoryStats.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-yellow-400" />
                      Category Performance
                    </h2>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categoryStats.map(cat => (
                      <div key={cat.category} className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <p className="text-lg mb-1">{CATEGORY_ICONS[cat.category] || '📦'}</p>
                        <p className="text-white text-sm font-semibold capitalize">{cat.category}</p>
                        <p className="text-gray-500 text-xs mt-1">{cat.count} listing{cat.count !== 1 ? 's' : ''}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-blue-400">
                            <Eye className="w-3 h-3" />
                            <span className="text-xs font-semibold">{cat.total_views}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-400">
                            <ShoppingCart className="w-3 h-3" />
                            <span className="text-xs font-semibold">{cat.total_inquiries}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock Alert */}
              {lowStock.length > 0 && (
                <div className="bg-red-900/10 border border-red-800/30 rounded-2xl p-5">
                  <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-red-400" />
                    Low Stock Alert
                    <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{lowStock.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {lowStock.slice(0, 5).map(l => (
                      <div key={l.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 truncate flex-1 mr-3">{l.part_name}</span>
                        <span className={`font-bold flex-shrink-0 ${l.stock_quantity === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                          {l.stock_quantity === 0 ? 'Out of stock' : `${l.stock_quantity} left`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column — sidebar */}
            <div className="space-y-4">

              {/* Subscription card */}
              <div className={`rounded-xl border p-5 ${isPro ? 'bg-amber-950/30 border-amber-800/40' : 'bg-gray-900 border-gray-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Crown className={`w-5 h-5 ${isPro ? 'text-amber-400' : 'text-gray-600'}`} />
                  {!isPro && (
                    <Link to="/subscription" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                      Upgrade <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <p className={`text-lg font-bold ${isPro ? 'text-amber-400' : 'text-gray-400'}`}>
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </p>
                <p className="text-gray-500 text-sm mt-0.5">
                  {isPro
                    ? subscription?.expires_at
                      ? `Renews ${format(new Date(subscription.expires_at), 'MMM d')}`
                      : 'Active'
                    : `${activeListing}/5 free listings used`}
                </p>
                {!isPro && (
                  <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${Math.min((activeListing / 5) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Listing summary */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold text-sm">My Listings</h2>
                  <Link to="/listings/new-part" className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Add
                  </Link>
                </div>
                {listings.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <Package className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No parts listed yet</p>
                    <Link to="/listings/new-part" className="mt-2 inline-block text-yellow-400 hover:text-yellow-300 text-xs">
                      List your first part
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {listings.slice(0, 5).map(l => (
                      <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm truncate">{l.part_name}</p>
                          <p className="text-gray-500 text-xs">{l.price.toLocaleString()} ETB · stock: {l.stock_quantity}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <Eye className="w-3 h-3" />
                            <span>{marketStats.find(s => s.listing_id === l.id)?.view_count ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {listings.length > 5 && (
                      <div className="px-4 py-3 text-center">
                        <span className="text-gray-500 text-xs">+{listings.length - 5} more listings</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-white font-semibold text-sm">Notifications</h2>
                  <Link to="/notifications">
                    <Bell className="w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors" />
                  </Link>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-yellow-400/5' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-yellow-400' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{n.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-gray-600 text-xs mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Add New Part', icon: Plus, to: '/listings/new-part', accent: true },
                    { label: 'Browse Marketplace', icon: Package, to: '/marketplace/parts' },
                    { label: 'Messages', icon: MessageSquare, to: '/messages', badge: unreadMessages },
                    { label: 'Subscription', icon: Crown, to: '/subscription' },
                    { label: 'Notifications', icon: Bell, to: '/notifications' },
                  ].map(a => (
                    <Link
                      key={a.label}
                      to={a.to}
                      className={`flex items-center gap-2 text-sm py-2 transition-colors ${a.accent ? 'text-yellow-400 font-semibold' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      <a.icon className="w-4 h-4" />
                      {a.label}
                      {a.badge && a.badge > 0 ? (
                        <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{a.badge}</span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-700" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pro upsell */}
              {!isPro && (
                <Link
                  to="/subscription"
                  className="block bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/40 rounded-xl p-4 hover:border-amber-600/60 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-semibold text-sm">Upgrade to Pro</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Unlimited listings, featured storefront, and priority search placement to boost your sales.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-amber-400 text-xs font-medium">
                    Learn more <Zap className="w-3 h-3" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
