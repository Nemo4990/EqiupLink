import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Truck, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EquipmentRental } from '../../types';
import RentalCard from '../../components/cards/RentalCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MACHINE_TYPES = ['excavator', 'bulldozer', 'wheel loader', 'motor grader', 'crane', 'dump truck', 'forklift', 'compactor'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'Doosan'];

export default function Rentals() {
  const [rentals, setRentals] = useState<EquipmentRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [maxDaily, setMaxDaily] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    let query = supabase
      .from('equipment_rentals')
      .select('*, provider:profiles!equipment_rentals_provider_id_fkey(name, phone, location)')
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (machineType) query = query.ilike('machine_type', `%${machineType}%`);
    if (brand) query = query.ilike('brand', `%${brand}%`);
    if (maxDaily) query = query.lte('daily_rate', parseFloat(maxDaily));

    const { data } = await query;
    let results = (data || []) as EquipmentRental[];

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(r =>
        r.machine_model.toLowerCase().includes(s) ||
        r.machine_type.toLowerCase().includes(s) ||
        r.location.toLowerCase().includes(s) ||
        r.brand?.toLowerCase().includes(s)
      );
    }

    setRentals(results);
    setLoading(false);
  };

  useEffect(() => { fetchRentals(); }, [machineType, brand, maxDaily]);

  const clearFilters = () => {
    setMachineType('');
    setBrand('');
    setMaxDaily('');
    setSearch('');
  };

  const hasFilters = machineType || brand || maxDaily || search;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-6 h-6 text-blue-400" />
            <h1 className="text-3xl font-black text-white">Equipment Rentals</h1>
          </div>
          <p className="text-gray-400">Rent excavators, bulldozers, loaders and more from trusted providers</p>

          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRentals()}
                placeholder="Search by model, type, or location..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 outline-none transition-colors"
              />
            </div>
            <button onClick={fetchRentals} className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors">
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
                  <label className="text-gray-300 text-sm font-medium block mb-2">Machine Type</label>
                  <select
                    value={machineType}
                    onChange={(e) => setMachineType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none capitalize"
                  >
                    <option value="">All Types</option>
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Brand</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 outline-none"
                  >
                    <option value="">All Brands</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">Max Daily Rate ($)</label>
                  <input
                    type="number"
                    value={maxDaily}
                    onChange={(e) => setMaxDaily(e.target.value)}
                    placeholder="e.g. 1000"
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
              {machineType && <span className="bg-blue-400/20 text-blue-400 text-xs px-2 py-0.5 rounded-full capitalize">{machineType}</span>}
              {brand && <span className="bg-blue-400/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{brand}</span>}
              {maxDaily && <span className="bg-blue-400/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">Max ${maxDaily}/day</span>}
              <button onClick={clearFilters} className="text-gray-500 hover:text-gray-300 ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading rentals..." /></div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No equipment available</h3>
            <p className="text-gray-400">Check back soon or adjust your filters</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-5">{rentals.length} machine{rentals.length !== 1 ? 's' : ''} available</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {rentals.map((r) => <RentalCard key={r.id} rental={r} />)}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
