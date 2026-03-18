import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { checkUserCanAct, spendCredits } from '../../lib/credits';
import PhotoUpload from '../../components/ui/PhotoUpload';
import toast from 'react-hot-toast';

const MACHINE_TYPES = ['excavator', 'bulldozer', 'wheel loader', 'motor grader', 'crane', 'dump truck', 'compactor', 'forklift', 'backhoe', 'other'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'Doosan', 'JCB'];

export default function NewRentalListing() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role !== 'rental_provider' && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);
  const [form, setForm] = useState({
    machine_model: '', machine_type: '', brand: '', year: '',
    hourly_rate: '', daily_rate: '', location: '', description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (profile.role !== 'rental_provider' && profile.role !== 'admin')) return;

    if (!photoUrl) {
      toast.error('Please upload a photo of the equipment.');
      return;
    }

    setLoading(true);

    const { canActFree, cost, balance } = await checkUserCanAct(
      profile.id,
      'list_rental',
      async () => {
        const { count } = await supabase
          .from('equipment_rentals')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', profile.id);
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
        'list_rental',
        `listing_rental_${Date.now()}`,
        'rental',
        `Rental listing credit — ${form.machine_model}`
      );
      if (!result.success && !result.alreadyGranted) {
        toast.error('Failed to deduct credits. Please try again.');
        setLoading(false);
        return;
      }
      toast.success(`${cost} ETB deducted for this listing.`);
    }

    const { error } = await supabase.from('equipment_rentals').insert({
      provider_id: profile.id,
      machine_model: form.machine_model,
      machine_type: form.machine_type,
      brand: form.brand || null,
      year: form.year ? parseInt(form.year) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null,
      location: form.location,
      description: form.description || null,
      image_url: photoUrl,
      is_available: true,
    });
    if (!error) {
      toast.success('Rental listing added!');
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
            <Truck className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-black text-white">Add Rental Listing</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <PhotoUpload
                photoUrl={photoUrl}
                onUpload={setPhotoUrl}
                onRemove={() => setPhotoUrl(null)}
                label="Equipment Photo"
                required
                folder="rentals"
              />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Machine Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Machine Model *</label>
                  <input type="text" value={form.machine_model} onChange={e => fc('machine_model', e.target.value)} required placeholder="e.g. Caterpillar 336"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Machine Type *</label>
                  <select value={form.machine_type} onChange={e => fc('machine_type', e.target.value)} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 px-3 outline-none capitalize">
                    <option value="">Select type...</option>
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Brand</label>
                  <select value={form.brand} onChange={e => fc('brand', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 px-3 outline-none">
                    <option value="">Select brand...</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Year</label>
                  <input type="number" value={form.year} onChange={e => fc('year', e.target.value)} min={1990} max={2024} placeholder="e.g. 2019"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Location *</label>
                  <input type="text" value={form.location} onChange={e => fc('location', e.target.value)} required placeholder="City, State"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Hourly Rate ($)</label>
                  <input type="number" value={form.hourly_rate} onChange={e => fc('hourly_rate', e.target.value)} min="0" step="0.01" placeholder="e.g. 150"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Daily Rate ($)</label>
                  <input type="number" value={form.daily_rate} onChange={e => fc('daily_rate', e.target.value)} min="0" step="0.01" placeholder="e.g. 900"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => fc('description', e.target.value)} rows={3} placeholder="Machine condition, hours, features..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors" />
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
