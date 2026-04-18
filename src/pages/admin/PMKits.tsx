import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Pencil, Trash2, Settings, ImagePlus, X,
  Eye, EyeOff, GripVertical, Check, Loader,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PMKit {
  id: string;
  brand: string;
  model: string;
  category: string;
  name: string;
  description: string;
  price: number;
  parts_list: string[];
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const CATEGORIES = [
  'engine_service',
  'hydraulic_service',
  'undercarriage_kit',
  'transmission_service',
  'electrical_kit',
  'fuel_system',
  'air_filter_kit',
  'brake_kit',
  'general_service',
];

const BRANDS = [
  'Caterpillar', 'Komatsu', 'John Deere', 'Hitachi', 'Volvo', 'Liebherr',
  'JCB', 'Case', 'Doosan', 'Hyundai', 'Sandvik', 'Atlas Copco', 'General',
];

const emptyKit: Omit<PMKit, 'id' | 'created_at'> = {
  brand: '',
  model: '',
  category: 'engine_service',
  name: '',
  description: '',
  price: 0,
  parts_list: [],
  image_url: null,
  is_active: true,
  sort_order: 0,
};

export default function PMKits() {
  const { profile } = useAuth();
  const [kits, setKits] = useState<PMKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Omit<PMKit, 'id' | 'created_at'>>(emptyKit);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partsInput, setPartsInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadKits(); }, []);

  async function loadKits() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pm_kits')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load kits'); }
    else setKits(((data || []) as any[]).map(k => ({ ...k, parts_list: Array.isArray(k.parts_list) ? k.parts_list : [] })));
    setLoading(false);
  }

  function openCreate() {
    setForm(emptyKit);
    setPartsInput('');
    setEditId(null);
    setModal('create');
  }

  function openEdit(kit: PMKit) {
    setForm({
      brand: kit.brand,
      model: kit.model,
      category: kit.category,
      name: kit.name,
      description: kit.description,
      price: kit.price,
      parts_list: kit.parts_list,
      image_url: kit.image_url,
      is_active: kit.is_active,
      sort_order: kit.sort_order,
    });
    setPartsInput(kit.parts_list.join(', '));
    setEditId(kit.id);
    setModal('edit');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `pm-kits/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function parseParts() {
    return partsInput
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    if (!form.brand || !form.name || !form.category) {
      toast.error('Brand, name, and category are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        parts_list: parseParts(),
        price: Number(form.price) || 0,
        sort_order: Number(form.sort_order) || 0,
        created_by: profile?.id,
      };

      if (editId) {
        const { error } = await supabase.from('pm_kits').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Kit updated');
      } else {
        const { error } = await supabase.from('pm_kits').insert(payload);
        if (error) throw error;
        toast.success('Kit created');
      }

      setModal(null);
      await loadKits();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kit: PMKit) {
    const { error } = await supabase.from('pm_kits').update({ is_active: !kit.is_active }).eq('id', kit.id);
    if (error) { toast.error('Failed to update'); return; }
    setKits(prev => prev.map(k => k.id === kit.id ? { ...k, is_active: !k.is_active } : k));
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('pm_kits').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Kit deleted');
    setDeleteConfirm(null);
    setKits(prev => prev.filter(k => k.id !== id));
  }

  const kitsByBrand = kits.reduce<Record<string, PMKit[]>>((acc, k) => {
    const b = k.brand || 'General';
    if (!acc[b]) acc[b] = [];
    acc[b].push(k);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h1 className="text-3xl font-black">Preventive Maintenance Kits</h1>
            </div>
            <p className="text-gray-400 text-sm">Manage PM kits displayed to owners on the dashboard.</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Kit
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : kits.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
            <Settings className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold mb-4">No PM kits yet</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Create First Kit
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(kitsByBrand).map(([brand, brandKits]) => (
              <div key={brand}>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  {brand}
                  <span className="text-xs text-gray-500 font-normal">{brandKits.length} kit{brandKits.length !== 1 ? 's' : ''}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {brandKits.map(kit => (
                    <motion.div key={kit.id} layout
                      className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${
                        kit.is_active ? 'border-gray-800 hover:border-cyan-700/40' : 'border-gray-800/50 opacity-60'
                      }`}>
                      <div className="relative">
                        {kit.image_url ? (
                          <img src={kit.image_url} alt={kit.name}
                            className="w-full h-44 object-cover" />
                        ) : (
                          <div className="w-full h-44 bg-gray-800 flex items-center justify-center">
                            <Settings className="w-10 h-10 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            kit.is_active ? 'bg-emerald-900/80 text-emerald-300' : 'bg-gray-900/80 text-gray-400'
                          }`}>
                            {kit.is_active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <h3 className="font-bold text-white truncate">{kit.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {kit.model || '—'} · {kit.category.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <span className="text-cyan-400 font-black text-sm whitespace-nowrap">
                            {Number(kit.price).toLocaleString()} ETB
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{kit.description}</p>
                        {kit.parts_list.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {kit.parts_list.slice(0, 5).map((p, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{p}</span>
                            ))}
                            {kit.parts_list.length > 5 && (
                              <span className="text-[10px] text-gray-500 px-1">+{kit.parts_list.length - 5}</span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 pt-3 border-t border-gray-800">
                          <button onClick={() => openEdit(kit)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-700 hover:border-cyan-600 text-gray-300 hover:text-cyan-300 text-xs font-medium py-2 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => toggleActive(kit)}
                            className="flex items-center justify-center gap-1.5 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors">
                            {kit.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setDeleteConfirm(kit.id)}
                            className="flex items-center justify-center gap-1.5 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 text-xs font-medium py-2 px-3 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-black">{modal === 'create' ? 'Add New PM Kit' : 'Edit PM Kit'}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Brand *</label>
                    <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                      <option value="">Select brand</option>
                      {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Category *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Machine Model</label>
                    <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                      placeholder="e.g. 320D, PC200-8"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Kit Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. 500-Hour Service Kit"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What's included, maintenance interval..."
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Price (ETB)</label>
                    <input type="number" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                      placeholder="0"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Sort Order</label>
                    <input type="number" value={form.sort_order || ''} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                      placeholder="0"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    Parts List <span className="text-gray-500 font-normal">(comma-separated)</span>
                  </label>
                  <textarea value={partsInput} onChange={e => setPartsInput(e.target.value)}
                    placeholder="Oil filter, Air filter, Fuel filter, Engine oil, ..."
                    rows={2}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
                  {parseParts().length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {parseParts().map((p, i) => (
                        <span key={i} className="text-[10px] bg-cyan-900/40 text-cyan-300 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Kit Image</label>
                  {form.image_url && (
                    <div className="relative mb-3 inline-block">
                      <img src={form.image_url} alt="preview" className="w-32 h-32 object-cover rounded-xl border border-gray-800" />
                      <button onClick={() => setForm(f => ({ ...f, image_url: null }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 border border-gray-700 hover:border-cyan-600 text-gray-300 hover:text-cyan-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                    {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-300">{form.is_active ? 'Visible to owners' : 'Hidden from owners'}</span>
                </div>

                <div className="flex gap-3 pt-2 border-t border-gray-800">
                  <button onClick={() => setModal(null)}
                    className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving...' : modal === 'create' ? 'Create Kit' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-2">Delete this PM kit?</h3>
              <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
