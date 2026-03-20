import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Wrench, Package, Truck, X, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MechanicProfile, PartsListing, EquipmentRental } from '../types';
import MechanicCard from '../components/cards/MechanicCard';
import PartCard from '../components/cards/PartCard';
import RentalCard from '../components/cards/RentalCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

type ResultType = 'all' | 'mechanics' | 'parts' | 'rentals';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [search, setSearch] = useState(query);
  const [filter, setFilter] = useState<ResultType>('all');
  const [loading, setLoading] = useState(false);

  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [parts, setParts] = useState<PartsListing[]>([]);
  const [rentals, setRentals] = useState<EquipmentRental[]>([]);

  const doSearch = async (q: string) => {
    setLoading(true);

    const [mechRes, partsRes, rentalsRes] = await Promise.all([
      supabase.from('mechanic_profiles').select('*, profile:profiles!mechanic_profiles_user_id_fkey(*)'),
      supabase.from('parts_listings').select('*, supplier:profiles!parts_listings_supplier_id_fkey(name)').eq('is_active', true),
      supabase.from('equipment_rentals').select('*, provider:profiles!equipment_rentals_provider_id_fkey(name)').eq('is_available', true),
    ]);

    if (!q.trim()) {
      setMechanics((mechRes.data || []) as MechanicProfile[]);
      setParts((partsRes.data || []) as PartsListing[]);
      setRentals((rentalsRes.data || []) as EquipmentRental[]);
      setLoading(false);
      return;
    }

    const term = q.toLowerCase();

    const mechs = ((mechRes.data || []) as MechanicProfile[]).filter(m =>
      m.profile?.name?.toLowerCase().includes(term) ||
      m.specializations.some(s => s.toLowerCase().includes(term)) ||
      m.supported_brands.some(b => b.toLowerCase().includes(term)) ||
      m.service_area?.toLowerCase().includes(term)
    );

    const prts = ((partsRes.data || []) as PartsListing[]).filter(p =>
      p.part_name.toLowerCase().includes(term) ||
      p.part_number?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.machine_compatibility.some(m => m.toLowerCase().includes(term))
    );

    const rnts = ((rentalsRes.data || []) as EquipmentRental[]).filter(r =>
      r.machine_model.toLowerCase().includes(term) ||
      r.machine_type.toLowerCase().includes(term) ||
      r.brand?.toLowerCase().includes(term) ||
      r.location.toLowerCase().includes(term)
    );

    setMechanics(mechs);
    setParts(prts);
    setRentals(rnts);
    setLoading(false);
  };

  useEffect(() => { doSearch(query); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: search });
    doSearch(search);
  };

  const totalResults = mechanics.length + parts.length + rentals.length;
  const showMechanics = filter === 'all' || filter === 'mechanics';
  const showParts = filter === 'all' || filter === 'parts';
  const showRentals = filter === 'all' || filter === 'rentals';

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black text-white mb-4">{query ? 'Search Results' : 'Browse Marketplace'}</h1>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mechanics, parts, equipment..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-colors"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-3.5 rounded-xl transition-colors">
              Search
            </button>
          </form>

          {query && (
            <div className="mt-4 flex gap-2">
              {[
                { id: 'all', label: 'All', count: totalResults },
                { id: 'mechanics', label: 'Mechanics', count: mechanics.length, icon: Wrench },
                { id: 'parts', label: 'Parts', count: parts.length, icon: Package },
                { id: 'rentals', label: 'Rentals', count: rentals.length, icon: Truck },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id as ResultType)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === t.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {t.icon && <t.icon className="w-3.5 h-3.5" />}
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Searching..." /></div>
        ) : totalResults === 0 && query ? (
          <div className="text-center py-20">
            <SearchIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No results for "{query}"</h3>
            <p className="text-gray-400">Try different keywords or browse categories</p>
            <div className="flex justify-center gap-3 mt-6">
              <Link to="/marketplace/mechanics" className="text-yellow-400 hover:text-yellow-300">Browse Mechanics</Link>
              <Link to="/marketplace/parts" className="text-yellow-400 hover:text-yellow-300">Browse Parts</Link>
              <Link to="/marketplace/rentals" className="text-yellow-400 hover:text-yellow-300">Browse Rentals</Link>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {showMechanics && mechanics.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-yellow-400" /> Mechanics ({mechanics.length})
                  </h2>
                  <Link to="/marketplace/mechanics" className="text-yellow-400 hover:text-yellow-300 text-sm">View all</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mechanics.slice(0, filter === 'all' ? 3 : undefined).map(m => <MechanicCard key={m.id} mechanic={m} />)}
                </div>
              </div>
            )}

            {showParts && parts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" /> Parts ({parts.length})
                  </h2>
                  <Link to="/marketplace/parts" className="text-yellow-400 hover:text-yellow-300 text-sm">View all</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parts.slice(0, filter === 'all' ? 3 : undefined).map(p => <PartCard key={p.id} part={p} />)}
                </div>
              </div>
            )}

            {showRentals && rentals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-400" /> Rentals ({rentals.length})
                  </h2>
                  <Link to="/marketplace/rentals" className="text-yellow-400 hover:text-yellow-300 text-sm">View all</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentals.slice(0, filter === 'all' ? 3 : undefined).map(r => <RentalCard key={r.id} rental={r} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
