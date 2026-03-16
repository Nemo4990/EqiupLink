import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, Save, Star, Wrench, Package, Truck, Plus, Trash2, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MechanicProfile, Machine, Review } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SPECIALIZATIONS = ['hydraulics', 'engine', 'electrical', 'transmission', 'undercarriage', 'pneumatics'];
const BRANDS = ['Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr', 'JCB', 'Case'];

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'machines' | 'reviews'>('profile');

  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
  });

  const [mechanicData, setMechanicData] = useState<Partial<MechanicProfile>>({});
  const [machines, setMachines] = useState<Machine[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [newMachine, setNewMachine] = useState({ machine_type: '', machine_model: '', brand: '', year: '' });
  const [addingMachine, setAddingMachine] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const loadData = async () => {
      const promises: Promise<any>[] = [];
      if (profile.role === 'mechanic') {
        promises.push(
          supabase.from('mechanic_profiles').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
            if (data) setMechanicData(data);
            else setMechanicData({ specializations: [], supported_brands: [], years_experience: 0 });
          }),
          supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)')
            .eq('mechanic_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => setReviews((data || []) as Review[]))
        );
      }
      if (profile.role === 'owner') {
        promises.push(
          supabase.from('machines').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false })
            .then(({ data }) => setMachines((data || []) as Machine[]))
        );
      }
      await Promise.all(promises);
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update(profileData).eq('id', profile.id);
    if (!error && profile.role === 'mechanic') {
      const exists = !!(await supabase.from('mechanic_profiles').select('id').eq('user_id', profile.id).maybeSingle()).data;
      if (exists) {
        await supabase.from('mechanic_profiles').update(mechanicData).eq('user_id', profile.id);
      } else {
        await supabase.from('mechanic_profiles').insert({ user_id: profile.id, ...mechanicData });
      }
    }
    if (!error) {
      await refreshProfile();
      toast.success('Profile saved!');
    } else {
      toast.error('Failed to save profile.');
    }
    setSaving(false);
  };

  const toggleSpec = (spec: string) => {
    const specs = mechanicData.specializations || [];
    setMechanicData(prev => ({
      ...prev,
      specializations: specs.includes(spec) ? specs.filter(s => s !== spec) : [...specs, spec]
    }));
  };

  const toggleBrand = (brand: string) => {
    const brands = mechanicData.supported_brands || [];
    setMechanicData(prev => ({
      ...prev,
      supported_brands: brands.includes(brand) ? brands.filter(b => b !== brand) : [...brands, brand]
    }));
  };

  const addMachine = async () => {
    if (!profile || !newMachine.machine_type || !newMachine.machine_model || !newMachine.brand) return;
    setAddingMachine(true);
    const { data, error } = await supabase.from('machines').insert({
      owner_id: profile.id,
      machine_type: newMachine.machine_type,
      machine_model: newMachine.machine_model,
      brand: newMachine.brand,
      year: newMachine.year ? parseInt(newMachine.year) : null,
    }).select().single();
    if (!error && data) {
      setMachines(prev => [data as Machine, ...prev]);
      setNewMachine({ machine_type: '', machine_model: '', brand: '', year: '' });
      toast.success('Machine added!');
    }
    setAddingMachine(false);
  };

  const deleteMachine = async (id: string) => {
    await supabase.from('machines').delete().eq('id', id);
    setMachines(prev => prev.filter(m => m.id !== id));
    toast.success('Machine removed.');
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-2xl">
            {profile?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{profile?.name}</h1>
            <p className="text-gray-400 capitalize">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
          {(['profile', ...(profile?.role === 'owner' ? ['machines'] : []), ...(profile?.role === 'mechanic' ? ['reviews'] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={profileData.name} onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="tel" value={profileData.phone || ''} onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={profileData.location || ''} onChange={(e) => setProfileData(p => ({ ...p, location: e.target.value }))}
                    placeholder="City, State"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-3 outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Bio</label>
                <textarea value={profileData.bio || ''} onChange={(e) => setProfileData(p => ({ ...p, bio: e.target.value }))}
                  rows={3} placeholder="Tell others about yourself..."
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none transition-colors" />
              </div>
            </div>

            {profile?.role === 'mechanic' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                <h3 className="text-white font-semibold">Mechanic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Years of Experience</label>
                    <input type="number" value={mechanicData.years_experience || 0} min={0} max={60}
                      onChange={(e) => setMechanicData(p => ({ ...p, years_experience: parseInt(e.target.value) }))}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Hourly Rate ($)</label>
                    <input type="number" value={mechanicData.hourly_rate || ''} min={0}
                      onChange={(e) => setMechanicData(p => ({ ...p, hourly_rate: parseFloat(e.target.value) }))}
                      placeholder="e.g. 85"
                      className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Service Area</label>
                  <input type="text" value={mechanicData.service_area || ''}
                    onChange={(e) => setMechanicData(p => ({ ...p, service_area: e.target.value }))}
                    placeholder="e.g. Greater Houston Area, within 100 miles"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Specializations</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map(spec => (
                      <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                        className={`capitalize text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                          (mechanicData.specializations || []).includes(spec)
                            ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}>{spec}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Supported Brands</label>
                  <div className="flex flex-wrap gap-2">
                    {BRANDS.map(brand => (
                      <button key={brand} type="button" onClick={() => toggleBrand(brand)}
                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                          (mechanicData.supported_brands || []).includes(brand)
                            ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}>{brand}</button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={mechanicData.is_available ?? true}
                    onChange={(e) => setMechanicData(p => ({ ...p, is_available: e.target.checked }))}
                    className="w-4 h-4 rounded accent-yellow-400" />
                  <span className="text-gray-300 text-sm">Available for new jobs</span>
                </label>
              </div>
            )}

            <button onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </motion.div>
        )}

        {activeTab === 'machines' && profile?.role === 'owner' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
              <h3 className="text-white font-semibold mb-4">Add New Machine</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" value={newMachine.machine_type} onChange={(e) => setNewMachine(p => ({ ...p, machine_type: e.target.value }))}
                  placeholder="Type (e.g. excavator)"
                  className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none text-sm transition-colors" />
                <input type="text" value={newMachine.machine_model} onChange={(e) => setNewMachine(p => ({ ...p, machine_model: e.target.value }))}
                  placeholder="Model (e.g. Cat D8R)"
                  className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none text-sm transition-colors" />
                <input type="text" value={newMachine.brand} onChange={(e) => setNewMachine(p => ({ ...p, brand: e.target.value }))}
                  placeholder="Brand"
                  className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none text-sm transition-colors" />
                <input type="number" value={newMachine.year} onChange={(e) => setNewMachine(p => ({ ...p, year: e.target.value }))}
                  placeholder="Year" min={1980} max={2024}
                  className="bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none text-sm transition-colors" />
              </div>
              <button onClick={addMachine} disabled={addingMachine}
                className="mt-3 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> {addingMachine ? 'Adding...' : 'Add Machine'}
              </button>
            </div>

            {machines.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">No machines added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {machines.map(m => (
                  <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{m.machine_model}</p>
                        <p className="text-gray-400 text-sm capitalize">{m.machine_type} · {m.brand}{m.year ? ` · ${m.year}` : ''}</p>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); deleteMachine(m.id); }} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Link to={`/machine/${m.id}`} className="mt-3 flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-xs font-medium transition-colors">
                      <FileText className="w-3 h-3" /> View Service History <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'reviews' && profile?.role === 'mechanic' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{r.reviewer?.name}</p>
                        <p className="text-gray-500 text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-gray-300 mt-3 text-sm leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
