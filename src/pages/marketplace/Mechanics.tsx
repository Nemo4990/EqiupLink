import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Wrench, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MechanicProfile } from '../../types';
import MechanicCard from '../../components/cards/MechanicCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SPECIALIZATIONS = ['hydraulics', 'engine', 'electrical', 'transmission', 'undercarriage', 'pneumatics'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'JCB', 'Case', 'Doosan'];

export default function Mechanics() {
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMechanics = async () => {
    setLoading(true);
    let query = supabase
      .from('mechanic_profiles')
      .select('*, profile:profiles!mechanic_profiles_user_id_fkey(*)')
      .order('rating', { ascending: false });

    if (availableOnly) query = query.eq('is_available', true);
    if (selectedSpec) query = query.contains('specializations', [selectedSpec]);
    if (selectedBrand) query = query.contains('supported_brands', [selectedBrand]);

    const { data } = await query;
    let results = (data || []) as MechanicProfile[];

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(m =>
        m.profile?.name?.toLowerCase().includes(s) ||
        m.service_area?.toLowerCase().includes(s) ||
        m.specializations.some(sp => sp.toLowerCase().includes(s))
      );
    }

    setMechanics(results);
    setLoading(false);
  };

  useEffect(() => { fetchMechanics(); }, [selectedSpec, selectedBrand, availableOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMechanics();
  };

  const clearFilters = () => {
    setSelectedSpec('');
    setSelectedBrand('');
    setAvailableOnly(false);
    setSearch('');
  };

  const hasFilters = selectedSpec || selectedBrand || availableOnly || search;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-6 h-6 text-yellow-400" />
            <h1 className="text-3xl font-black text-white">Find Mechanics</h1>
          </div>
          <p className="text-gray-400">Certified technicians for all heavy equipment brands</p>

          <form onSubmit={handleSearch} className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, specialty, or location..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 outline-none transition-colors"
              />
            </div>
            <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors">
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 border px-4 py-3 rounded-xl transition-colors ${showFilters ? 'border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </form>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Specialization</label>
                  <select
                    value={selectedSpec}
                    onChange={(e) => setSelectedSpec(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none capitalize"
                  >
                    <option value="">All Specializations</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Machine Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none"
                  >
                    <option value="">All Brands</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="w-4 h-4 rounded accent-yellow-400"
                    />
                    <span className="text-gray-300 text-sm">Available Now Only</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {hasFilters && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-gray-400 text-sm">Active filters:</span>
              {selectedSpec && <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full capitalize">{selectedSpec}</span>}
              {selectedBrand && <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{selectedBrand}</span>}
              {availableOnly && <span className="bg-green-400/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Available</span>}
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-300 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Finding mechanics..." /></div>
        ) : mechanics.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No mechanics found</h3>
            <p className="text-gray-400">Try adjusting your search filters</p>
            {hasFilters && <button onClick={clearFilters} className="mt-4 text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 mx-auto"><X className="w-3.5 h-3.5" /> Clear filters</button>}
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-5">{mechanics.length} mechanic{mechanics.length !== 1 ? 's' : ''} found</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {mechanics.map((m) => <MechanicCard key={m.id} mechanic={m} />)}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
