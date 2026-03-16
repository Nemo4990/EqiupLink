import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wrench, Calendar, DollarSign, User, Plus, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Machine, ServiceHistory } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function MachineDetail() {
  const { machineId } = useParams<{ machineId: string }>();
  const { profile } = useAuth();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    service_type: '',
    description: '',
    cost: '',
    service_date: new Date().toISOString().split('T')[0],
    parts_replaced: '',
  });

  useEffect(() => {
    if (!machineId) return;
    Promise.all([
      supabase.from('machines').select('*').eq('id', machineId).maybeSingle(),
      supabase.from('service_history')
        .select('*, mechanic:profiles!service_history_mechanic_id_fkey(name)')
        .eq('machine_id', machineId)
        .order('service_date', { ascending: false }),
    ]).then(([{ data: m }, { data: h }]) => {
      setMachine(m as Machine | null);
      setHistory((h || []) as ServiceHistory[]);
      setLoading(false);
    });
  }, [machineId]);

  const addServiceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine || !profile) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('service_history').insert({
      machine_id: machine.id,
      owner_id: profile.id,
      service_type: form.service_type,
      description: form.description,
      cost: form.cost ? parseFloat(form.cost) : null,
      service_date: form.service_date,
      parts_replaced: form.parts_replaced ? form.parts_replaced.split(',').map(p => p.trim()) : [],
    }).select('*, mechanic:profiles!service_history_mechanic_id_fkey(name)').single();

    if (!error && data) {
      setHistory(prev => [data as ServiceHistory, ...prev]);
      setShowAddForm(false);
      setForm({ service_type: '', description: '', cost: '', service_date: new Date().toISOString().split('T')[0], parts_replaced: '' });
      toast.success('Service record added!');
    } else {
      toast.error('Failed to add record.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!machine) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Wrench className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Machine not found</h3>
        <Link to="/profile" className="text-yellow-400 hover:text-yellow-300">Back to profile</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">{machine.machine_model}</h1>
                <p className="text-gray-400 capitalize">{machine.machine_type} · {machine.brand}{machine.year ? ` · ${machine.year}` : ''}</p>
                {machine.serial_number && <p className="text-gray-500 text-sm mt-1">S/N: {machine.serial_number}</p>}
              </div>
              <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Service History</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>

          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={addServiceRecord}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Service Type *</label>
                  <select
                    value={form.service_type}
                    onChange={(e) => setForm(f => ({ ...f, service_type: e.target.value }))}
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 px-3 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="scheduled_maintenance">Scheduled Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                    <option value="oil_change">Oil Change</option>
                    <option value="filter_replacement">Filter Replacement</option>
                    <option value="hydraulic_service">Hydraulic Service</option>
                    <option value="engine_overhaul">Engine Overhaul</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Service Date *</label>
                  <input
                    type="date"
                    value={form.service_date}
                    onChange={(e) => setForm(f => ({ ...f, service_date: e.target.value }))}
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 px-3 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  rows={2}
                  placeholder="What work was done..."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Cost ($)</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Parts Replaced</label>
                  <input
                    type="text"
                    value={form.parts_replaced}
                    onChange={(e) => setForm(f => ({ ...f, parts_replaced: e.target.value }))}
                    placeholder="Filter, gasket, etc (comma-separated)"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-lg hover:border-gray-500 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors">
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </motion.form>
          )}

          {history.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">No service history</h3>
              <p className="text-gray-500 text-sm">Add your first service record to start tracking maintenance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400 font-medium capitalize">{record.service_type.replace(/_/g, ' ')}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(record.service_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{record.description}</p>
                      {record.parts_replaced.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {record.parts_replaced.map((part, i) => (
                            <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{part}</span>
                          ))}
                        </div>
                      )}
                      {record.mechanic && (
                        <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                          <User className="w-3 h-3" /> Serviced by: {record.mechanic.name}
                        </p>
                      )}
                    </div>
                    {record.cost && (
                      <div className="text-right flex-shrink-0">
                        <span className="text-yellow-400 font-semibold flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />{record.cost}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
