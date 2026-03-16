import { useState, useEffect, useCallback } from 'react';
import { Package, Truck, Plus, Trash2, Pencil, X, Save, Search, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PartsListing, EquipmentRental } from '../../types';
import PhotoUpload from '../../components/ui/PhotoUpload';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ListingTab = 'parts' | 'rentals';

const CATEGORIES = ['hydraulics', 'engine', 'electrical', 'filters', 'sensors', 'valves', 'transmission', 'undercarriage', 'other'];
const MACHINES = ['Caterpillar D8R', 'Caterpillar M320D2', 'Komatsu PC360', 'John Deere 850K', 'Volvo EC380', 'Hitachi ZX350', 'Liebherr LTM 1100'];
const MACHINE_TYPES = ['excavator', 'bulldozer', 'wheel loader', 'motor grader', 'crane', 'dump truck', 'compactor', 'forklift', 'backhoe', 'other'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'Doosan', 'JCB'];

const EMPTY_PART = {
  part_name: '', part_number: '', description: '', category: 'other',
  price: '', stock_quantity: '1', image_url: '',
};

const EMPTY_RENTAL = {
  machine_model: '', machine_type: '', brand: '', year: '',
  hourly_rate: '', daily_rate: '', location: '', description: '', image_url: '',
};

interface Props {
  adminId: string;
}

export default function AdminListings({ adminId }: Props) {
  const [listingTab, setListingTab] = useState<ListingTab>('parts');
  const [parts, setParts] = useState<PartsListing[]>([]);
  const [rentals, setRentals] = useState<EquipmentRental[]>([]);
  const [partsCount, setPartsCount] = useState(0);
  const [rentalsCount, setRentalsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<PartsListing | null>(null);
  const [partForm, setPartForm] = useState({ ...EMPTY_PART });
  const [partPhotoUrl, setPartPhotoUrl] = useState<string | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [savingPart, setSavingPart] = useState(false);

  const [showRentalForm, setShowRentalForm] = useState(false);
  const [editingRental, setEditingRental] = useState<EquipmentRental | null>(null);
  const [rentalForm, setRentalForm] = useState({ ...EMPTY_RENTAL });
  const [rentalPhotoUrl, setRentalPhotoUrl] = useState<string | null>(null);
  const [savingRental, setSavingRental] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    const [partsRes, rentalsRes] = await Promise.all([
      supabase
        .from('parts_listings')
        .select('*, supplier:profiles!parts_listings_supplier_id_fkey(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('equipment_rentals')
        .select('*, provider:profiles!equipment_rentals_provider_id_fkey(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setParts((partsRes.data || []) as PartsListing[]);
    setRentals((rentalsRes.data || []) as EquipmentRental[]);
    setPartsCount(partsRes.count ?? 0);
    setRentalsCount(rentalsRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  const filteredParts = parts.filter(p =>
    !search || p.part_name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRentals = rentals.filter(r =>
    !search || r.machine_model.toLowerCase().includes(search.toLowerCase()) ||
    r.machine_type.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  const openAddPart = () => {
    setEditingPart(null);
    setPartForm({ ...EMPTY_PART });
    setPartPhotoUrl(null);
    setSelectedMachines([]);
    setShowPartForm(true);
  };

  const openEditPart = (part: PartsListing) => {
    setEditingPart(part);
    setPartForm({
      part_name: part.part_name,
      part_number: part.part_number || '',
      description: part.description || '',
      category: part.category,
      price: part.price.toString(),
      stock_quantity: part.stock_quantity.toString(),
      image_url: part.image_url || '',
    });
    setPartPhotoUrl(part.image_url);
    setSelectedMachines(part.machine_compatibility || []);
    setShowPartForm(true);
  };

  const savePart = async () => {
    if (!partForm.part_name || !partForm.price) {
      toast.error('Part name and price are required');
      return;
    }
    setSavingPart(true);
    const payload = {
      part_name: partForm.part_name,
      part_number: partForm.part_number || null,
      description: partForm.description || null,
      category: partForm.category,
      price: parseFloat(partForm.price),
      stock_quantity: parseInt(partForm.stock_quantity) || 1,
      machine_compatibility: selectedMachines,
      image_url: partPhotoUrl || null,
      is_active: true,
    };

    if (editingPart) {
      const { error } = await supabase.from('parts_listings').update(payload).eq('id', editingPart.id);
      if (!error) {
        setParts(prev => prev.map(p => p.id === editingPart.id ? { ...p, ...payload } : p));
        toast.success('Part listing updated');
        setShowPartForm(false);
      } else {
        toast.error('Failed to update part');
      }
    } else {
      const { data, error } = await supabase.from('parts_listings')
        .insert({ ...payload, supplier_id: adminId })
        .select('*, supplier:profiles!parts_listings_supplier_id_fkey(name)')
        .single();
      if (!error && data) {
        setParts(prev => [data as PartsListing, ...prev]);
        setPartsCount(c => c + 1);
        toast.success('Part listing added');
        setShowPartForm(false);
      } else {
        toast.error('Failed to add part');
      }
    }
    setSavingPart(false);
  };

  const deletePart = async (id: string) => {
    const { error } = await supabase.from('parts_listings').delete().eq('id', id);
    if (!error) {
      setParts(prev => prev.filter(p => p.id !== id));
      setPartsCount(c => c - 1);
      toast.success('Part deleted');
    }
  };

  const togglePartActive = async (part: PartsListing) => {
    const { error } = await supabase.from('parts_listings').update({ is_active: !part.is_active }).eq('id', part.id);
    if (!error) {
      setParts(prev => prev.map(p => p.id === part.id ? { ...p, is_active: !part.is_active } : p));
    }
  };

  const openAddRental = () => {
    setEditingRental(null);
    setRentalForm({ ...EMPTY_RENTAL });
    setRentalPhotoUrl(null);
    setShowRentalForm(true);
  };

  const openEditRental = (rental: EquipmentRental) => {
    setEditingRental(rental);
    setRentalForm({
      machine_model: rental.machine_model,
      machine_type: rental.machine_type,
      brand: rental.brand || '',
      year: rental.year?.toString() || '',
      hourly_rate: rental.hourly_rate?.toString() || '',
      daily_rate: rental.daily_rate?.toString() || '',
      location: rental.location,
      description: rental.description || '',
      image_url: rental.image_url || '',
    });
    setRentalPhotoUrl(rental.image_url);
    setShowRentalForm(true);
  };

  const saveRental = async () => {
    if (!rentalForm.machine_model || !rentalForm.machine_type || !rentalForm.location) {
      toast.error('Model, type and location are required');
      return;
    }
    setSavingRental(true);
    const payload = {
      machine_model: rentalForm.machine_model,
      machine_type: rentalForm.machine_type,
      brand: rentalForm.brand || null,
      year: rentalForm.year ? parseInt(rentalForm.year) : null,
      hourly_rate: rentalForm.hourly_rate ? parseFloat(rentalForm.hourly_rate) : null,
      daily_rate: rentalForm.daily_rate ? parseFloat(rentalForm.daily_rate) : null,
      location: rentalForm.location,
      description: rentalForm.description || null,
      image_url: rentalPhotoUrl || null,
      is_available: true,
    };

    if (editingRental) {
      const { error } = await supabase.from('equipment_rentals').update(payload).eq('id', editingRental.id);
      if (!error) {
        setRentals(prev => prev.map(r => r.id === editingRental.id ? { ...r, ...payload } : r));
        toast.success('Rental listing updated');
        setShowRentalForm(false);
      } else {
        toast.error('Failed to update rental');
      }
    } else {
      const { data, error } = await supabase.from('equipment_rentals')
        .insert({ ...payload, provider_id: adminId })
        .select('*, provider:profiles!equipment_rentals_provider_id_fkey(name)')
        .single();
      if (!error && data) {
        setRentals(prev => [data as EquipmentRental, ...prev]);
        setRentalsCount(c => c + 1);
        toast.success('Rental listing added');
        setShowRentalForm(false);
      } else {
        toast.error('Failed to add rental');
      }
    }
    setSavingRental(false);
  };

  const deleteRental = async (id: string) => {
    const { error } = await supabase.from('equipment_rentals').delete().eq('id', id);
    if (!error) {
      setRentals(prev => prev.filter(r => r.id !== id));
      setRentalsCount(c => c - 1);
      toast.success('Rental deleted');
    }
  };

  const toggleRentalAvailable = async (rental: EquipmentRental) => {
    const { error } = await supabase.from('equipment_rentals').update({ is_available: !rental.is_available }).eq('id', rental.id);
    if (!error) {
      setRentals(prev => prev.map(r => r.id === rental.id ? { ...r, is_available: !rental.is_available } : r));
    }
  };

  const toggleMachine = (m: string) =>
    setSelectedMachines(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-400/10 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-yellow-400">{partsCount.toLocaleString()}</p>
            <p className="text-gray-400 text-sm">Parts Listed</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-400/10 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-yellow-400">{rentalsCount.toLocaleString()}</p>
            <p className="text-gray-400 text-sm">Equipment for Rent</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setListingTab('parts'); setSearch(''); setShowPartForm(false); setShowRentalForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${listingTab === 'parts' ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30' : 'text-gray-400 hover:text-white'}`}
          >
            <Package className="w-4 h-4" /> Parts ({partsCount})
          </button>
          <button
            onClick={() => { setListingTab('rentals'); setSearch(''); setShowPartForm(false); setShowRentalForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${listingTab === 'rentals' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'text-gray-400 hover:text-white'}`}
          >
            <Truck className="w-4 h-4" /> Rentals ({rentalsCount})
          </button>
        </div>
        <button
          onClick={listingTab === 'parts' ? openAddPart : openAddRental}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add {listingTab === 'parts' ? 'Part' : 'Rental'}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={listingTab === 'parts' ? 'Search parts by name, category, number...' : 'Search rentals by model, type, location...'}
          className="w-full bg-gray-900 border border-gray-800 focus:border-yellow-400 text-white placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
        />
      </div>

      {listingTab === 'parts' && (
        <>
          {showPartForm && (
            <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{editingPart ? 'Edit Part Listing' : 'Add Part Listing'}</h4>
                <button onClick={() => setShowPartForm(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <PhotoUpload
                photoUrl={partPhotoUrl}
                onUpload={setPartPhotoUrl}
                onRemove={() => setPartPhotoUrl(null)}
                label="Part Photo"
                folder="parts"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium mb-1">Part Name *</label>
                  <input type="text" value={partForm.part_name} onChange={e => setPartForm(p => ({ ...p, part_name: e.target.value }))}
                    placeholder="e.g. Hydraulic Pump Assembly"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Part Number</label>
                  <input type="text" value={partForm.part_number} onChange={e => setPartForm(p => ({ ...p, part_number: e.target.value }))}
                    placeholder="e.g. CAT-123-4567"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Category</label>
                  <select value={partForm.category} onChange={e => setPartForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 text-sm outline-none capitalize">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Price ($) *</label>
                  <input type="number" value={partForm.price} onChange={e => setPartForm(p => ({ ...p, price: e.target.value }))}
                    min="0" step="0.01" placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Stock Quantity</label>
                  <input type="number" value={partForm.stock_quantity} onChange={e => setPartForm(p => ({ ...p, stock_quantity: e.target.value }))}
                    min="1"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium mb-1">Description</label>
                  <textarea value={partForm.description} onChange={e => setPartForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Describe the part condition, specs..."
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none resize-none transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-2">Machine Compatibility</label>
                <div className="flex flex-wrap gap-2">
                  {MACHINES.map(m => (
                    <button key={m} type="button" onClick={() => toggleMachine(m)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${selectedMachines.includes(m) ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowPartForm(false)} className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
                <button onClick={savePart} disabled={savingPart} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> {savingPart ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredParts.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
                <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">{search ? 'No parts match your search' : 'No parts listed yet'}</p>
              </div>
            ) : filteredParts.map(part => (
              <div key={part.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${!part.is_active ? 'border-gray-800/50 opacity-60' : 'border-gray-800'}`}>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  {part.image_url ? (
                    <img src={part.image_url} alt={part.part_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{part.part_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${part.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {part.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="capitalize">{part.category}</span>
                    {part.part_number && <span>#{part.part_number}</span>}
                    <span className="text-yellow-400 font-semibold">${part.price}</span>
                    <span>Qty: {part.stock_quantity}</span>
                    <span>By: {(part as any).supplier?.name || 'Admin'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => togglePartActive(part)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title={part.is_active ? 'Hide' : 'Show'}>
                    {part.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEditPart(part)} className="text-gray-400 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-yellow-400/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePart(part.id)} className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {listingTab === 'rentals' && (
        <>
          {showRentalForm && (
            <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{editingRental ? 'Edit Rental Listing' : 'Add Rental Listing'}</h4>
                <button onClick={() => setShowRentalForm(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <PhotoUpload
                photoUrl={rentalPhotoUrl}
                onUpload={setRentalPhotoUrl}
                onRemove={() => setRentalPhotoUrl(null)}
                label="Equipment Photo"
                folder="rentals"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium mb-1">Machine Model *</label>
                  <input type="text" value={rentalForm.machine_model} onChange={e => setRentalForm(p => ({ ...p, machine_model: e.target.value }))}
                    placeholder="e.g. Caterpillar 336"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Machine Type *</label>
                  <select value={rentalForm.machine_type} onChange={e => setRentalForm(p => ({ ...p, machine_type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 text-sm outline-none capitalize">
                    <option value="">Select type...</option>
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Brand</label>
                  <select value={rentalForm.brand} onChange={e => setRentalForm(p => ({ ...p, brand: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2 px-3 text-sm outline-none">
                    <option value="">Select brand...</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Year</label>
                  <input type="number" value={rentalForm.year} onChange={e => setRentalForm(p => ({ ...p, year: e.target.value }))}
                    min={1990} max={2025} placeholder="e.g. 2019"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Location *</label>
                  <input type="text" value={rentalForm.location} onChange={e => setRentalForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="City, State"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Hourly Rate ($)</label>
                  <input type="number" value={rentalForm.hourly_rate} onChange={e => setRentalForm(p => ({ ...p, hourly_rate: e.target.value }))}
                    min="0" step="0.01" placeholder="e.g. 150"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1">Daily Rate ($)</label>
                  <input type="number" value={rentalForm.daily_rate} onChange={e => setRentalForm(p => ({ ...p, daily_rate: e.target.value }))}
                    min="0" step="0.01" placeholder="e.g. 900"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium mb-1">Description</label>
                  <textarea value={rentalForm.description} onChange={e => setRentalForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Machine condition, hours, features..."
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2 px-3 text-sm outline-none resize-none transition-colors" />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRentalForm(false)} className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
                <button onClick={saveRental} disabled={savingRental} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> {savingRental ? 'Saving...' : 'Save Rental'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
                <Truck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">{search ? 'No rentals match your search' : 'No rental listings yet'}</p>
              </div>
            ) : filteredRentals.map(rental => (
              <div key={rental.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${!rental.is_available ? 'border-gray-800/50 opacity-60' : 'border-gray-800'}`}>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  {rental.image_url ? (
                    <img src={rental.image_url} alt={rental.machine_model} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{rental.machine_model}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${rental.is_available ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {rental.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="capitalize">{rental.machine_type}</span>
                    {rental.brand && <span>{rental.brand}</span>}
                    {rental.year && <span>{rental.year}</span>}
                    <span>{rental.location}</span>
                    {rental.daily_rate && <span className="text-yellow-400 font-semibold">${rental.daily_rate}/day</span>}
                    <span>By: {(rental as any).provider?.name || 'Admin'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleRentalAvailable(rental)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title={rental.is_available ? 'Mark Unavailable' : 'Mark Available'}>
                    {rental.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEditRental(rental)} className="text-gray-400 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-yellow-400/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRental(rental.id)} className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
