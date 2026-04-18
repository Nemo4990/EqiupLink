import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, ShieldCheck, Send, AlertTriangle, MapPin,
  Wrench, Clock, User, CheckCircle2, Filter, Phone, RefreshCw,
  XCircle, CheckCircle, Zap, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BreakdownRow {
  id: string;
  owner_id: string;
  machine_type: string | null;
  machine_model: string | null;
  machine_serial: string | null;
  description: string | null;
  error_codes: string | null;
  location: string | null;
  urgency: string | null;
  status: string | null;
  dispatch_status: string | null;
  assigned_mechanic_id: string | null;
  mechanic_offer_status: string | null;
  quote_amount: number | null;
  quote_description: string | null;
  quote_sent_at: string | null;
  quote_expires_at: string | null;
  created_at: string;
  owner?: { name: string | null; phone: string | null };
  mechanic?: { name: string | null };
}

interface MechanicOption {
  id: string;
  name: string | null;
  location: string | null;
  phone: string | null;
  contact_phone: string | null;
  rating: number | null;
  profile?: {
    brand_experience: string[] | null;
    field_service_years: number | null;
    owns_service_truck: boolean | null;
    verification_status: string | null;
    specializations: string[] | null;
    current_location: string | null;
    contact_phone: string | null;
  } | null;
}

const STATUS_TABS: { key: string; label: string; color: string }[] = [
  { key: 'pending_admin_review', label: 'New Requests', color: 'bg-amber-500' },
  { key: 'quote_sent', label: 'Quote Sent', color: 'bg-blue-500' },
  { key: 'paid', label: 'Paid / Ready', color: 'bg-emerald-500' },
  { key: 'dispatched', label: 'Dispatched', color: 'bg-teal-500' },
  { key: 'completed', label: 'Completed', color: 'bg-gray-500' },
];

const OFFER_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Offer Pending', cls: 'bg-amber-900/60 text-amber-300 border border-amber-700/40' },
  accepted: { label: 'Mechanic Accepted', cls: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40' },
  declined: { label: 'Declined - Re-assign', cls: 'bg-red-900/60 text-red-300 border border-red-700/40' },
};

export default function JobDispatch() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('pending_admin_review');
  const [rows, setRows] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BreakdownRow | null>(null);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [mechSearch, setMechSearch] = useState('');
  const [chosenMechanic, setChosenMechanic] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteExpiry, setQuoteExpiry] = useState('');
  const [sending, setSending] = useState(false);
  const [modalStep, setModalStep] = useState<'select_mechanic' | 'awaiting_response' | 'send_quote'>('select_mechanic');

  useEffect(() => { void loadRows(); }, [activeTab]);

  async function loadRows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('breakdown_requests')
        .select('*, owner:profiles!breakdown_requests_owner_id_fkey(name, phone), mechanic:profiles!breakdown_requests_assigned_mechanic_id_fkey(name)')
        .eq('dispatch_status', activeTab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data as BreakdownRow[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job queue');
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(row: BreakdownRow) {
    setSelected(row);
    setChosenMechanic(row.assigned_mechanic_id);
    setQuoteAmount(row.quote_amount ? String(row.quote_amount) : '');
    setQuoteDescription(row.quote_description || '');
    setQuoteExpiry(row.quote_expires_at ? row.quote_expires_at.slice(0, 10) : '');
    setMechSearch('');

    if (row.mechanic_offer_status === 'accepted') {
      setModalStep('send_quote');
    } else if (row.mechanic_offer_status === 'pending') {
      setModalStep('awaiting_response');
    } else {
      setModalStep('select_mechanic');
    }

    const { data, error } = await supabase
      .from('mechanic_profiles')
      .select('*, profile:profiles!mechanic_profiles_user_id_fkey(id, name, location, phone, contact_phone, role)')
      .limit(300);

    if (error) console.error('Failed to load mechanics:', error);

    const normalized: MechanicOption[] = (data || []).map((m: any) => ({
      id: m.user_id,
      name: m.profile?.name || 'Unnamed',
      location: m.profile?.location || m.service_area || null,
      phone: m.profile?.phone || null,
      contact_phone: m.profile?.contact_phone || null,
      rating: m.rating ?? null,
      profile: {
        brand_experience: m.supported_brands || [],
        field_service_years: m.years_experience ?? null,
        owns_service_truck: null,
        verification_status: m.is_verified ? 'verified' : null,
        specializations: m.specializations || [],
        current_location: m.service_area || m.profile?.location || null,
        contact_phone: m.profile?.contact_phone || null,
      },
    }));
    setMechanics(normalized);
  }

  const filteredMechanics = useMemo(() => {
    const q = mechSearch.trim().toLowerCase();
    if (!q) return mechanics;
    return mechanics.filter((m) => {
      const brands = (m.profile?.brand_experience || []).join(' ').toLowerCase();
      const specs = (m.profile?.specializations || []).join(' ').toLowerCase();
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.profile?.current_location || '').toLowerCase().includes(q) ||
        brands.includes(q) ||
        specs.includes(q)
      );
    });
  }, [mechanics, mechSearch]);

  const chosenMechanicData = useMemo(
    () => mechanics.find(m => m.id === chosenMechanic),
    [mechanics, chosenMechanic],
  );

  async function sendJobOffer() {
    if (!selected || !chosenMechanic) { toast.error('Select a mechanic first'); return; }
    setSending(true);
    try {
      const { error } = await supabase
        .from('breakdown_requests')
        .update({
          assigned_mechanic_id: chosenMechanic,
          admin_id: profile?.id,
          mechanic_offer_status: 'pending',
          mechanic_offer_sent_at: new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/send-mechanic-job-offer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId: selected.id }),
      });

      toast.success('Job offer sent to mechanic');
      setSelected(null);
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send offer');
    } finally {
      setSending(false);
    }
  }

  async function sendQuote() {
    if (!selected || !chosenMechanic) { toast.error('Select a mechanic first'); return; }
    const amount = parseFloat(quoteAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid quote amount'); return; }
    if (!quoteDescription.trim()) { toast.error('Add a quote description'); return; }
    if (!quoteExpiry) { toast.error('Set a quote expiration date'); return; }

    setSending(true);
    try {
      const expiresAt = new Date(quoteExpiry + 'T23:59:59').toISOString();

      const { error } = await supabase
        .from('breakdown_requests')
        .update({
          quote_amount: amount,
          quote_description: quoteDescription.trim(),
          quote_expires_at: expiresAt,
          dispatch_status: 'quote_sent',
          quote_sent_at: new Date().toISOString(),
          status: 'quoted',
        })
        .eq('id', selected.id);
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/send-quote-notification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakdown_id: selected.id,
          owner_id: selected.owner_id,
          quote_amount: amount,
          quote_expires_at: expiresAt,
          machine_type: selected.machine_type,
          machine_model: selected.machine_model,
          location: selected.location,
          urgency: selected.urgency,
          admin_note: quoteDescription.trim(),
        }),
      });

      toast.success('Quote sent to owner via email and in-app notification');
      setSelected(null);
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send quote');
    } finally {
      setSending(false);
    }
  }

  async function resetOffer(row: BreakdownRow) {
    try {
      await supabase.from('breakdown_requests').update({
        assigned_mechanic_id: null,
        mechanic_offer_status: 'not_offered',
        mechanic_offer_sent_at: null,
      }).eq('id', row.id);
      toast.success('Offer reset — you can reassign');
      await loadRows();
    } catch {
      toast.error('Failed to reset offer');
    }
  }

  async function markDispatched(row: BreakdownRow) {
    try {
      const { error } = await supabase.from('breakdown_requests').update({
        dispatch_status: 'dispatched',
        dispatched_at: new Date().toISOString(),
        owner_location_shared: true,
        status: 'in_progress',
      }).eq('id', row.id);
      if (error) throw error;

      const notifs: any[] = [{
        user_id: row.owner_id, type: 'breakdown_dispatched',
        title: 'Mechanic Deployed',
        message: 'A verified technician has been dispatched to your site. You can track status from your dashboard.',
        data: { breakdown_id: row.id },
      }];
      if (row.assigned_mechanic_id) {
        notifs.push({
          user_id: row.assigned_mechanic_id, type: 'job_dispatched',
          title: 'Job Confirmed — Head to Site',
          message: `The owner has paid. Site location: ${row.location || 'See job details'}. Contact details are now available in the app.`,
          data: { breakdown_id: row.id, location: row.location },
        });
      }
      await supabase.from('notifications').insert(notifs);
      toast.success('Marked as dispatched — location shared with mechanic');
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  }

  const defaultExpiry = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Job Dispatch Center</h1>
            <p className="text-gray-400 mt-1">Assign technicians, send job offers, and issue price quotes.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="w-4 h-4" /><span>Ticket queue</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${tab.color}`}></span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-400 py-20 text-center">Loading tickets...</div>
        ) : rows.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">No tickets in this queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((row) => {
              const offerBadge = row.mechanic_offer_status && row.mechanic_offer_status !== 'not_offered'
                ? OFFER_BADGE[row.mechanic_offer_status] : null;
              return (
                <motion.div key={row.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-amber-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-amber-400" />
                        <span className="font-bold">{row.machine_type || 'Machine'} {row.machine_model || ''}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">#{row.id.slice(0, 8)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {row.urgency && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          row.urgency === 'critical' ? 'bg-red-900/60 text-red-300' :
                          row.urgency === 'high' ? 'bg-orange-900/60 text-orange-300' :
                          'bg-gray-800 text-gray-300'}`}>
                          {row.urgency.toUpperCase()}
                        </span>
                      )}
                      {offerBadge && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${offerBadge.cls}`}>
                          {offerBadge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 line-clamp-2 mb-3">{row.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {row.location || '—'}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(row.created_at).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {row.owner?.name || 'Owner'}</div>
                    {row.machine_serial && <div className="flex items-center gap-1.5 font-mono">SN: {row.machine_serial}</div>}
                  </div>

                  {row.quote_amount ? (
                    <div className="bg-blue-950/40 border border-blue-900/40 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-300">Quote</span>
                        <span className="font-black text-blue-200">ETB {Number(row.quote_amount).toLocaleString()}</span>
                      </div>
                      {row.mechanic?.name && (
                        <div className="text-xs text-gray-400 mt-1">Assigned: {row.mechanic.name}</div>
                      )}
                    </div>
                  ) : null}

                  {row.mechanic_offer_status === 'accepted' && row.mechanic?.name && (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-300 font-semibold">{row.mechanic.name} accepted the job</p>
                        <p className="text-xs text-gray-400">Ready to send quote to owner</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {activeTab === 'pending_admin_review' && (
                      <>
                        {row.mechanic_offer_status === 'declined' ? (
                          <button onClick={() => resetOffer(row)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Re-assign Mechanic
                          </button>
                        ) : row.mechanic_offer_status === 'accepted' ? (
                          <button onClick={() => openTicket(row)}
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                            <Send className="w-4 h-4" /> Send Quote to Owner
                          </button>
                        ) : row.mechanic_offer_status === 'pending' ? (
                          <button onClick={() => openTicket(row)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" /> Waiting for Mechanic
                          </button>
                        ) : (
                          <button onClick={() => openTicket(row)}
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" /> Assign Mechanic
                          </button>
                        )}
                      </>
                    )}
                    {activeTab === 'quote_sent' && (
                      <button onClick={() => openTicket(row)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                        Edit Quote
                      </button>
                    )}
                    {activeTab === 'paid' && (
                      <button onClick={() => markDispatched(row)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" /> Deploy Mechanic
                      </button>
                    )}
                    {(activeTab === 'dispatched' || activeTab === 'completed') && row.mechanic?.name && (
                      <div className="flex-1 text-sm text-gray-400 py-2 text-center">
                        Technician: <span className="text-white font-semibold">{row.mechanic.name}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black">
                  {modalStep === 'select_mechanic' && 'Step 1: Assign Mechanic'}
                  {modalStep === 'awaiting_response' && 'Step 1: Awaiting Mechanic Response'}
                  {modalStep === 'send_quote' && 'Step 2: Send Quote to Owner'}
                </h2>
                <p className="text-xs text-gray-500 font-mono">#{selected.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">Close</button>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-0">
                {['Assign Mechanic', 'Mechanic Accepts', 'Send Quote'].map((label, idx) => {
                  const stepMap = ['select_mechanic', 'awaiting_response', 'send_quote'];
                  const currentIdx = stepMap.indexOf(modalStep);
                  const done = idx < currentIdx;
                  const active = idx === currentIdx;
                  return (
                    <div key={label} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          done ? 'bg-emerald-500 text-white' : active ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-1 ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                      </div>
                      {idx < 2 && <div className={`h-0.5 w-full ${done ? 'bg-emerald-500' : 'bg-gray-800'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Machine:</span> <span className="font-semibold">{selected.machine_type} {selected.machine_model}</span></div>
                  <div><span className="text-gray-500">Serial:</span> <span className="font-mono">{selected.machine_serial || '—'}</span></div>
                  <div><span className="text-gray-500">Location:</span> {selected.location}</div>
                  <div><span className="text-gray-500">Urgency:</span> <span className={selected.urgency === 'critical' ? 'text-red-400' : selected.urgency === 'high' ? 'text-orange-400' : 'text-yellow-400'}>{selected.urgency}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="text-gray-500 text-xs mb-1">Symptoms</div>
                  <p className="text-sm text-gray-200">{selected.description}</p>
                  {selected.error_codes && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Error codes: <span className="font-mono">{selected.error_codes}</span>
                    </div>
                  )}
                </div>
              </div>

              {modalStep === 'awaiting_response' && (
                <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-5 text-center">
                  <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-amber-300 font-semibold text-lg">Waiting for Mechanic to Respond</p>
                  <p className="text-gray-400 text-sm mt-2">
                    An email and in-app notification have been sent. The mechanic can accept or decline the offer.
                  </p>
                  {chosenMechanicData && (
                    <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-3 inline-block">
                      <p className="text-white font-semibold">{chosenMechanicData.name}</p>
                      <p className="text-gray-500 text-xs">{chosenMechanicData.location}</p>
                    </div>
                  )}
                </div>
              )}

              {modalStep === 'select_mechanic' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Select Technician</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={mechSearch} onChange={(e) => setMechSearch(e.target.value)}
                      placeholder="Search by name, city, brand, or specialization..."
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {filteredMechanics.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No technicians found</p>
                    ) : (
                      filteredMechanics.map((m) => {
                        const verified = m.profile?.verification_status === 'verified';
                        const active = chosenMechanic === m.id;
                        return (
                          <button key={m.id} onClick={() => setChosenMechanic(m.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              active ? 'bg-amber-500/10 border-amber-500' : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                            }`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold truncate">{m.name || 'Unnamed'}</span>
                                  {verified && <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {m.profile?.current_location || m.location || '—'}
                                  {m.profile?.field_service_years ? ` • ${m.profile.field_service_years}y field` : ''}
                                  {m.profile?.owns_service_truck ? ' • Service truck' : ''}
                                </div>
                                {m.profile?.brand_experience && m.profile.brand_experience.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {m.profile.brand_experience.slice(0, 4).map((b) => (
                                      <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{b}</span>
                                    ))}
                                  </div>
                                )}
                                {m.profile?.specializations && m.profile.specializations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {m.profile.specializations.slice(0, 3).map((s) => (
                                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">{s}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {(m.phone || m.contact_phone || m.profile?.contact_phone) && (
                                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {modalStep === 'send_quote' && (
                <>
                  <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <p className="text-emerald-300 font-semibold">Mechanic accepted the job offer</p>
                    </div>
                    {chosenMechanicData && (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-white font-semibold">{chosenMechanicData.name}</p>
                          <p className="text-gray-500 text-xs">{chosenMechanicData.location}</p>
                        </div>
                        {(chosenMechanicData.profile?.contact_phone || chosenMechanicData.contact_phone || chosenMechanicData.phone) && (
                          <a href={`tel:${chosenMechanicData.profile?.contact_phone || chosenMechanicData.contact_phone || chosenMechanicData.phone}`}
                            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                            Call Mechanic
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Quote Amount (ETB)</label>
                        <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)}
                          placeholder="e.g. 15000"
                          className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Quote Expires On</span>
                        </label>
                        <input type="date" value={quoteExpiry || defaultExpiry()} onChange={(e) => setQuoteExpiry(e.target.value)}
                          min={new Date().toISOString().slice(0, 10)}
                          className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Scope & Description</label>
                      <textarea value={quoteDescription} onChange={(e) => setQuoteDescription(e.target.value)}
                        placeholder="Diagnosis findings, parts required, labor estimate, travel costs..."
                        rows={4}
                        className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 resize-none" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelected(null)}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors">
                  Cancel
                </button>
                {modalStep === 'select_mechanic' && (
                  <button onClick={sendJobOffer} disabled={sending || !chosenMechanic}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send Job Offer to Mechanic'}
                  </button>
                )}
                {modalStep === 'send_quote' && (
                  <button onClick={sendQuote} disabled={sending}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send Quote to Owner'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
