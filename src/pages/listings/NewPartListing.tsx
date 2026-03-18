import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { checkUserCanAct, spendCredits } from '../../lib/credits';
import PhotoUpload from '../../components/ui/PhotoUpload';
import toast from 'react-hot-toast';

const CATEGORIES = ['hydraulics', 'engine', 'electrical', 'filters', 'sensors', 'valves', 'transmission', 'undercarriage', 'other'];
const MACHINES = ['Caterpillar D8R', 'Caterpillar M320D2', 'Komatsu PC360', 'John Deere 850K', 'Volvo EC380', 'Hitachi ZX350', 'Liebherr LTM 1100'];

export default function NewPartListing() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role !== 'supplier' && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [form, setForm] = useState({
    part_name: '', part_number: '', description: '',
    category: 'other', price: '', stock_quantity: '1',
  });

  const toggleMachine = (m: string) =>
    setSelectedMachines(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (profile.role !== 'supplier' && profile.role !== 'admin')) return;

    if (!photoUrl) {
      toast.error('Please upload a photo of the part.');
      return;
    }

    setLoading(true);

    const { canActFree, cost, balance } = await checkUserCanAct(
      profile.id,
      'list_part',
      async () => {
        const { count } = await supabase
          .from('parts_listings')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', profile.id);
        return count ?? 0;
      }
    );

    if (!canActFree) {
      if (balance < cost) {
        toast.error(`You've used your 3 free listings. Add ${cost} ETB to your wallet to continue.`);
        setLoading(false);
        navigate('/wallet');
        return;
      }
      const result = await spendCredits(
        profile.id,
        'list_part',
        `listing_part_${Date.now()}`,
        'part',
        `Part listing credit — ${form.part_name}`
      );
      if (!result.success && !result.alreadyGranted) {
        toast.error('Failed to deduct credits. Please try again.');
        setLoading(false);
        return;
      }
      toast.success(`${cost} ETB deducted for this listing.`);
    }

    const { error } = await supabase.from('parts_listings').insert({
      supplier_id: profile.id,
      part_name: form.part_name,
      part_number: form.part_number || null,
      description: form.description || null,
      category: form.category,
      price: parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity),
      machine_compatibility: selectedMachines,
      image_url: photoUrl,
      is_active: true,
    });
    if (!error) {
      toast.success('Part listing added!');
      navigate('/dashboard');
    } else {
      toast.error('Failed to add listing.');
    }
    setLoading(false);
  };

  const fc = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-6 h-6 text-orange-400" />
            <h1 className="text-2xl font-black text-white">Add Part Listing</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <PhotoUpload
                photoUrl={photoUrl}
                onUpload={setPhotoUrl}
                onRemove={() => setPhotoUrl(null)}
                label="Part Photo"
                required
                folder="parts"
              />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Part Name *</label>
                  <input type="text" value={form.part_name} onChange={e => fc('part_name', e.target.value)} required placeholder="e.g. Hydraulic Pump Assembly"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Part Number</label>
                  <input type="text" value={form.part_number} onChange={e => fc('part_number', e.target.value)} placeholder="e.g. CAT-123-4567"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Category</label>
                  <select value={form.category} onChange={e => fc('category', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 px-3 outline-none capitalize">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Price ($) *</label>
                  <input type="number" value={form.price} onChange={e => fc('price', e.target.value)} required min="0" step="0.01" placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Stock Quantity</label>
                  <input type="number" value={form.stock_quantity} onChange={e => fc('stock_quantity', e.target.value)} min="1"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => fc('description', e.target.value)} rows={3} placeholder="Describe the part, condition, specifications..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <label className="block text-gray-300 text-sm font-medium mb-3">Machine Compatibility</label>
              <div className="flex flex-wrap gap-2">
                {MACHINES.map(m => (
                  <button key={m} type="button" onClick={() => toggleMachine(m)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      selectedMachines.includes(m) ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/dashboard" className="flex-1 text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={loading || !photoUrl}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors">
                {loading ? 'Adding...' : 'Add Listing'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
