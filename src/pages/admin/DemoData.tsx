import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, Wrench, Package, Truck, ToggleLeft, ToggleRight, RefreshCw, Eye, EyeOff, Users, CheckCircle, XCircle, AlertCircle, Trash2, Upload, Image as ImageIcon, Link as LinkIcon, X, CreditCard as Edit2, Save, XCircle as CancelIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DemoStats {
  mechanics: number;
  suppliers: number;
  parts: number;
  rentals: number;
  rentalProviders: number;
}

interface DemoMechanic {
  id: string;
  name: string;
  location: string;
  contact_address: string;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  specializations: string[];
}

interface DemoPart {
  id: string;
  part_name: string;
  part_number: string;
  category: string;
  price: number;
  stock_quantity: number;
  supplier_name: string;
  supplier_contact_address: string;
}

interface DemoRental {
  id: string;
  machine_model: string;
  machine_type: string;
  brand: string;
  daily_rate: number;
  location: string;
  is_available: boolean;
  provider_name: string;
}

interface DemoPartListing {
  id: string;
  part_name: string;
  part_number: string;
  supplier_name: string;
  supplier_id: string;
  supplier_contact_address: string;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  is_active: boolean;
}

type DemoView = 'overview' | 'mechanics' | 'parts' | 'rentals' | 'photos';

export default function DemoData() {
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [stats, setStats] = useState<DemoStats>({ mechanics: 0, suppliers: 0, parts: 0, rentals: 0, rentalProviders: 0 });
  const [mechanics, setMechanics] = useState<DemoMechanic[]>([]);
  const [parts, setParts] = useState<DemoPart[]>([]);
  const [rentals, setRentals] = useState<DemoRental[]>([]);
  const [partListings, setPartListings] = useState<DemoPartListing[]>([]);
  const [view, setView] = useState<DemoView>('overview');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string>('');
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [editingMechanicId, setEditingMechanicId] = useState<string>('');
  const [editingAddress, setEditingAddress] = useState<string>('');

  const fetchDemoConfig = useCallback(async () => {
    const { data } = await supabase
      .from('platform_config')
      .select('config_value')
      .eq('config_key', 'demo_mode_enabled')
      .maybeSingle();
    if (data) setDemoEnabled(data.config_value === 'true');
  }, []);

  const fetchStats = useCallback(async () => {
    const [mechRes, supplierRes, partsRes, rentalsRes, rentalProvRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_demo', true).eq('role', 'mechanic'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_demo', true).eq('role', 'supplier'),
      supabase.from('parts_listings').select('id', { count: 'exact', head: true }).eq('is_demo', true),
      supabase.from('equipment_rentals').select('id', { count: 'exact', head: true }).eq('is_demo', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_demo', true).eq('role', 'rental_provider'),
    ]);
    setStats({
      mechanics: mechRes.count ?? 0,
      suppliers: supplierRes.count ?? 0,
      parts: partsRes.count ?? 0,
      rentals: rentalsRes.count ?? 0,
      rentalProviders: rentalProvRes.count ?? 0,
    });
  }, []);

  const fetchMechanics = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, location, contact_address, is_verified, mechanic_profiles(is_available, rating, specializations)')
      .eq('is_demo', true)
      .eq('role', 'mechanic')
      .order('name');
    if (data) {
      setMechanics(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        contact_address: p.contact_address || '',
        is_verified: p.is_verified,
        is_available: p.mechanic_profiles?.[0]?.is_available ?? false,
        rating: p.mechanic_profiles?.[0]?.rating ?? 0,
        specializations: p.mechanic_profiles?.[0]?.specializations ?? [],
      })));
    }
  }, []);

  const fetchParts = useCallback(async () => {
    const { data } = await supabase
      .from('parts_listings')
      .select('id, part_name, part_number, category, price, stock_quantity, profiles(name, contact_address)')
      .eq('is_demo', true)
      .order('part_name');
    if (data) {
      setParts(data.map((p: any) => ({
        id: p.id,
        part_name: p.part_name,
        part_number: p.part_number || '—',
        category: p.category,
        price: p.price,
        stock_quantity: p.stock_quantity,
        supplier_name: p.profiles?.name ?? '—',
        supplier_contact_address: p.profiles?.contact_address || '—',
      })));
    }
  }, []);

  const fetchPartListings = useCallback(async () => {
    const { data } = await supabase
      .from('parts_listings')
      .select('id, supplier_id, part_name, part_number, price, stock_quantity, is_active, image_urls, profiles(name, contact_address)')
      .eq('is_demo', true)
      .order('part_name')
      .limit(100);
    if (data) {
      setPartListings(data.map((p: any) => ({
        id: p.id,
        supplier_id: p.supplier_id,
        part_name: p.part_name,
        part_number: p.part_number || '—',
        supplier_name: p.profiles?.name ?? '—',
        supplier_contact_address: p.profiles?.contact_address || '—',
        price: p.price,
        stock_quantity: p.stock_quantity,
        image_urls: p.image_urls || [],
        is_active: p.is_active,
      })));
    }
  }, []);

  const fetchRentals = useCallback(async () => {
    const { data } = await supabase
      .from('equipment_rentals')
      .select('id, machine_model, machine_type, brand, daily_rate, location, is_available, profiles(name)')
      .eq('is_demo', true)
      .order('machine_model');
    if (data) {
      setRentals(data.map((r: any) => ({
        id: r.id,
        machine_model: r.machine_model,
        machine_type: r.machine_type,
        brand: r.brand,
        daily_rate: r.daily_rate,
        location: r.location,
        is_available: r.is_available,
        provider_name: r.profiles?.name ?? '—',
      })));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDemoConfig(), fetchStats(), fetchMechanics(), fetchParts(), fetchRentals(), fetchPartListings()]);
      setLoading(false);
    })();
  }, [fetchDemoConfig, fetchStats, fetchMechanics, fetchParts, fetchRentals, fetchPartListings]);

  const toggleDemoMode = async () => {
    setToggling(true);
    const newVal = !demoEnabled;
    const { error } = await supabase
      .from('platform_config')
      .update({ config_value: newVal ? 'true' : 'false' })
      .eq('config_key', 'demo_mode_enabled');
    if (error) {
      toast.error('Failed to update demo mode');
    } else {
      setDemoEnabled(newVal);
      toast.success(`Demo mode ${newVal ? 'enabled' : 'disabled'}`);
    }
    setToggling(false);
  };

  const toggleMechanicAvailability = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('mechanic_profiles')
      .update({ is_available: !current })
      .eq('user_id', id);
    if (error) {
      toast.error('Failed to update');
    } else {
      setMechanics(prev => prev.map(m => m.id === id ? { ...m, is_available: !current } : m));
    }
  };

  const togglePartActive = async (id: string, currentStock: number) => {
    const newStock = currentStock > 0 ? 0 : 1;
    const { error } = await supabase
      .from('parts_listings')
      .update({ stock_quantity: newStock, is_active: newStock > 0 })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update');
    } else {
      setParts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: newStock } : p));
    }
  };

  const toggleRentalAvailability = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('equipment_rentals')
      .update({ is_available: !current })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update');
    } else {
      setRentals(prev => prev.map(r => r.id === id ? { ...r, is_available: !current } : r));
    }
  };

  const addPhotoUrl = async () => {
    if (!selectedListingId || !photoUrls.trim()) {
      toast.error('Please select a listing and enter a photo URL');
      return;
    }

    const urlsToAdd = photoUrls
      .split('\n')
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0);

    const listing = partListings.find(p => p.id === selectedListingId);
    if (!listing) return;

    const updatedUrls = [...(listing.image_urls || []), ...urlsToAdd];

    const { error } = await supabase
      .from('parts_listings')
      .update({ image_urls: updatedUrls })
      .eq('id', selectedListingId);

    if (error) {
      toast.error('Failed to add photos');
    } else {
      toast.success(`Added ${urlsToAdd.length} photo URL(s)`);
      setPhotoUrls('');
      setSelectedListingId('');
      fetchPartListings();
    }
  };

  const removePhotoUrl = async (listingId: string, urlToRemove: string) => {
    const listing = partListings.find(p => p.id === listingId);
    if (!listing) return;

    const updatedUrls = (listing.image_urls || []).filter(u => u !== urlToRemove);

    const { error } = await supabase
      .from('parts_listings')
      .update({ image_urls: updatedUrls })
      .eq('id', listingId);

    if (error) {
      toast.error('Failed to remove photo');
    } else {
      toast.success('Photo removed');
      fetchPartListings();
    }
  };

  const updateMechanicAddress = async (mechanicId: string, newAddress: string) => {
    if (!newAddress.trim()) {
      toast.error('Address cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ contact_address: newAddress })
      .eq('id', mechanicId);

    if (error) {
      toast.error('Failed to update address');
    } else {
      toast.success('Address updated');
      setMechanics(prev => prev.map(m => m.id === mechanicId ? { ...m, contact_address: newAddress } : m));
      setEditingMechanicId('');
      setEditingAddress('');
    }
  };

  const statCards = [
    { label: 'Demo Mechanics', value: stats.mechanics, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Demo Suppliers', value: stats.suppliers, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Parts Listings', value: stats.parts, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Rental Listings', value: stats.rentals, icon: Truck, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Rental Providers', value: stats.rentalProviders, icon: Database, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const tabs: { key: DemoView; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'mechanics', label: `Mechanics (${stats.mechanics})` },
    { key: 'parts', label: `Parts (${stats.parts})` },
    { key: 'rentals', label: `Rentals (${stats.rentals})` },
    { key: 'photos', label: 'Photo Management' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Demo Data Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage mock listings and mechanics that make the platform feel live to new visitors.
          </p>
        </div>

        <button
          onClick={toggleDemoMode}
          disabled={toggling}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            demoEnabled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {demoEnabled
            ? <><ToggleRight className="w-5 h-5" /> Demo Mode ON</>
            : <><ToggleLeft className="w-5 h-5" /> Demo Mode OFF</>}
        </button>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${demoEnabled ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        {demoEnabled
          ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
        <p className={`text-sm ${demoEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
          {demoEnabled
            ? 'Demo mode is active. Mock mechanics, parts listings and rental equipment are visible to all users, making the platform feel live.'
            : 'Demo mode is disabled. Mock data is hidden from the public marketplace. Only real user listings are shown.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {view === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">What Demo Data Includes</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-medium"><Wrench className="w-4 h-4" /> Mechanics</div>
                <ul className="text-slate-600 space-y-1 pl-6 list-disc">
                  <li>12 registered mechanics across Ethiopia</li>
                  <li>Cities: Addis Ababa, Dire Dawa, Hawassa, Mekelle, Bahir Dar, Gondar, Jimma, Adama</li>
                  <li>Brands: CAT, Komatsu, Volvo, Hitachi, Liebherr, John Deere, ISUZU</li>
                  <li>9 verified profiles with ratings</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-medium"><Package className="w-4 h-4" /> Parts Listings</div>
                <ul className="text-slate-600 space-y-1 pl-6 list-disc">
                  <li>50+ genuine part numbers across 6 suppliers</li>
                  <li>Hydraulic pumps, filters, seals, undercarriage</li>
                  <li>All major brands: CAT, Komatsu, Volvo, Hitachi, JD, Liebherr, Doosan</li>
                  <li>Realistic ETB prices</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-medium"><Truck className="w-4 h-4" /> Rentals</div>
                <ul className="text-slate-600 space-y-1 pl-6 list-disc">
                  <li>28 rental listings from 4 providers</li>
                  <li>Excavators, bulldozers, wheel loaders, graders, cranes, compactors</li>
                  <li>Locations: Addis Ababa, Hawassa, Jimma, Mekelle</li>
                  <li>Realistic ETB daily rates</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mechanics */}
      {view === 'mechanics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Specializations</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Rating</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mechanics.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{m.location}</td>
                    <td className="px-4 py-3">
                      {editingMechanicId === m.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editingAddress}
                            onChange={(e) => setEditingAddress(e.target.value)}
                            className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                            placeholder="Enter address"
                          />
                          <button
                            onClick={() => updateMechanicAddress(m.id, editingAddress)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingMechanicId('')}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                          >
                            <CancelIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="group flex items-center gap-2 cursor-pointer text-slate-700 text-xs hover:bg-slate-50 px-2 py-1 rounded"
                          onClick={() => {
                            setEditingMechanicId(m.id);
                            setEditingAddress(m.contact_address);
                          }}
                        >
                          <span className="flex-1 truncate">{m.contact_address || '—'}</span>
                          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.specializations.slice(0, 2).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs capitalize">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-sm">{m.rating.toFixed(1)} ★</td>
                    <td className="px-4 py-3">
                      {m.is_verified
                        ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                        : <span className="flex items-center gap-1 text-slate-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Parts */}
      {view === 'parts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Supplier</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Supplier Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Price (ETB)</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Stock</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {parts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{p.part_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono bg-slate-50 rounded px-2 py-1">{p.part_number}</td>
                    <td className="px-4 py-3 text-slate-700 text-sm font-medium">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.supplier_contact_address}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs capitalize">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{p.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePartActive(p.id, p.stock_quantity)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          p.stock_quantity > 0
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {p.stock_quantity > 0 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {p.stock_quantity > 0 ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Rentals */}
      {view === 'rentals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Machine</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Provider</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Location</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Daily (ETB)</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rentals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{r.brand} {r.machine_model}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.provider_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs capitalize">{r.machine_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.location}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{r.daily_rate.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRentalAvailability(r.id, r.is_available)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          r.is_available
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {r.is_available ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {r.is_available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Photo Management */}
      {view === 'photos' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Add Photo URLs to Demo Listings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Listing</label>
                <select
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a parts listing...</option>
                  {partListings.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.part_name} ({p.part_number}) - {p.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Photo URLs (one per line)</label>
                <textarea
                  value={photoUrls}
                  onChange={(e) => setPhotoUrls(e.target.value)}
                  placeholder="Paste Pexels or other image URLs here (one per line)&#10;Example: https://images.pexels.com/photos/..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  rows={4}
                />
                <p className="text-xs text-slate-500 mt-1">Recommended: Use Pexels.com for free, high-quality photos</p>
              </div>

              <button
                onClick={addPhotoUrl}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add Photo URLs
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Listing Photos
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {partListings.map(p => (
                <div key={p.id} className="p-6 hover:bg-slate-50/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-800">{p.part_name}</p>
                      <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded px-1.5 py-0.5 inline-block mb-1">{p.part_number}</p>
                      <p className="text-xs text-slate-600"><span className="font-medium">Supplier:</span> {p.supplier_name}</p>
                      <p className="text-xs text-slate-600"><span className="font-medium">Address:</span> {p.supplier_contact_address}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.image_urls?.length || 0} photos
                    </span>
                  </div>

                  {p.image_urls && p.image_urls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {p.image_urls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`${p.part_name} ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            onClick={() => removePhotoUrl(p.id, url)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-black/50 text-white px-2 py-1 rounded">
                            Photo {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-4 px-3 bg-slate-50 rounded-lg">
                      <LinkIcon className="w-4 h-4" />
                      No photos yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
