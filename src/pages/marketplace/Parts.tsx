import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PartsListing } from '../../types';
import PartCard from '../../components/cards/PartCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CATEGORIES = ['hydraulics', 'engine', 'electrical', 'filters', 'sensors', 'valves', 'transmission', 'undercarriage', 'other'];
const MACHINES = ['Caterpillar D8R', 'Caterpillar M320D2', 'Komatsu PC360', 'John Deere 850K', 'Volvo EC380', 'Hitachi ZX350'];

export default function Parts() {
  const [parts, setParts] = useState<PartsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [machine, setMachine] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchParts = async () => {
    setLoading(true);
    let query = supabase
      .from('parts_listings')
      .select('*, supplier:profiles!parts_listings_supplier_id_fkey(name, phone, location, merchant_badge)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (machine) query = query.contains('machine_compatibility', [machine]);
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

    const { data } = await query;
    let results = (data || []) as PartsListing[];

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(p =>
        p.part_name.toLowerCase().includes(s) ||
        p.part_number?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s)
      );
    }

    setParts(results);
    setLoading(false);
  };

  useEffect(() => { fetchParts(); }, [category, machine, maxPrice]);

  const clearFilters = () => {
    setCategory('');
    setMachine('');
    setMaxPrice('');
    setSearch('');
  };

  const hasFilters = category || machine || maxPrice || search;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-orange-400" />
            <h1 className="text-3xl font-black text-white">Spare Parts</h1>
          </div>
          <p className="text-gray-400">Source OEM and aftermarket parts from verified suppliers</p>

          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchParts()}
                placeholder="Search by part name, number, or description..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 outline-none transition-colors"
              />
            </div>
            <button onClick={fetchParts} className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors">
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 border px-4 py-3 rounded-xl transition-colors ${showFilters ? 'border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none capitalize"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Machine Compatibility</label>
                  <select
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none"
                  >
                    <option value="">All Machines</option>
                    {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Max Price ($)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g. 500"
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg py-2 px-3 outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm">Active filters:</span>
              {category && <span className="bg-orange-400/20 text-orange-400 text-xs px-2 py-0.5 rounded-full capitalize">{category}</span>}
              {machine && <span className="bg-orange-400/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">{machine}</span>}
              {maxPrice && <span className="bg-orange-400/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">Max ${maxPrice}</span>}
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-300 ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading parts..." /></div>
        ) : parts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No parts found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-5">{parts.length} part{parts.length !== 1 ? 's' : ''} available</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {parts.map((p) => <PartCard key={p.id} part={p} />)}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
