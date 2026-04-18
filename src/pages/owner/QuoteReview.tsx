import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ShieldCheck, Wrench, FileText,
  Wallet as WalletIcon, AlertTriangle, CheckCircle2,
  Clock, MapPin, Truck, Download, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateQuotePdf } from '../../lib/generateQuotePdf';

interface QuoteDetail {
  id: string;
  owner_id: string;
  machine_type: string | null;
  machine_model: string | null;
  machine_serial: string | null;
  description: string | null;
  error_codes: string | null;
  location: string | null;
  urgency: string | null;
  dispatch_status: string | null;
  quote_amount: number | null;
  quote_description: string | null;
  quote_sent_at: string | null;
  quote_expires_at: string | null;
  quote_accepted_at: string | null;
  payment_secured_at: string | null;
  dispatched_at: string | null;
  assigned_mechanic_id: string | null;
  created_at: string;
}

const DISPATCH_PROGRESS = [
  { key: 'pending_admin_review', label: 'Reviewing' },
  { key: 'quote_sent', label: 'Quoted' },
  { key: 'paid', label: 'Paid' },
  { key: 'dispatched', label: 'Deployed' },
  { key: 'completed', label: 'Done' },
];

export default function QuoteReview() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<QuoteDetail | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: breakdown }, { data: wallet }] = await Promise.all([
        supabase.from('breakdown_requests').select('*').eq('id', id!).maybeSingle(),
        supabase.from('wallets').select('balance, total_spent').eq('user_id', profile?.id || '').maybeSingle(),
      ]);
      setRow(breakdown as QuoteDetail | null);
      setBalance(Number(wallet?.balance || 0));
      setTotalSpent(Number(wallet?.total_spent || 0));
      setOwnerName(profile?.name || 'Machine Owner');
    } finally {
      setLoading(false);
    }
  }

  async function approveAndPay() {
    if (!row || !row.quote_amount) return;
    const amount = Number(row.quote_amount);
    if (balance < amount) {
      toast.error('Insufficient wallet balance. Please top up first.');
      navigate('/wallet');
      return;
    }
    setPaying(true);
    try {
      const now = new Date().toISOString();

      const { error: walletErr } = await supabase
        .from('wallets')
        .update({
          balance: balance - amount,
          total_spent: totalSpent + amount,
          updated_at: now,
        })
        .eq('user_id', profile!.id);
      if (walletErr) throw walletErr;

      await supabase.from('wallet_transactions').insert({
        user_id: profile!.id,
        amount: -amount,
        type: 'breakdown_payment',
        description: `Breakdown dispatch payment — ${row.machine_type || ''} ${row.machine_model || ''}`,
        reference_id: row.id,
        balance_after: balance - amount,
      });

      const { error: updErr } = await supabase
        .from('breakdown_requests')
        .update({
          dispatch_status: 'paid',
          quote_accepted_at: now,
          payment_secured_at: now,
          status: 'assigned',
        })
        .eq('id', row.id);
      if (updErr) throw updErr;

      const notifs: any[] = [];
      if (row.assigned_mechanic_id) {
        notifs.push({
          user_id: row.assigned_mechanic_id,
          type: 'payment_secured',
          title: 'Payment Secured',
          message: 'Owner approved and paid the dispatch quote. Admin will deploy you shortly.',
          data: { breakdown_id: row.id },
        });
      }

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(5);
      (admins || []).forEach(a => {
        notifs.push({
          user_id: a.id,
          type: 'payment_secured',
          title: 'Owner Approved & Paid',
          message: `${ownerName} approved and paid ETB ${amount.toLocaleString()} for ${row.machine_type} job. Ready to dispatch.`,
          data: { breakdown_id: row.id },
        });
      });

      if (notifs.length) await supabase.from('notifications').insert(notifs);

      toast.success('Payment secured. Technician will be dispatched.');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Payment failed');
    } finally {
      setPaying(false);
    }
  }

  function downloadPdf() {
    if (!row) return;
    generateQuotePdf({
      ticketId: row.id,
      machineType: row.machine_type || '',
      machineModel: row.machine_model || '',
      machineSerial: row.machine_serial || '',
      location: row.location || '',
      urgency: row.urgency || '',
      description: row.description || '',
      errorCodes: row.error_codes || '',
      quoteAmount: Number(row.quote_amount || 0),
      quoteDescription: row.quote_description || '',
      quoteSentAt: row.quote_sent_at || row.created_at,
      quoteExpiresAt: row.quote_expires_at || '',
      ownerName,
    });
    toast.success('PDF downloaded');
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center">Loading quote...</div>;
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold">Quote not found</p>
          <Link to="/dashboard" className="text-amber-400 text-sm mt-2 inline-block">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const currentStep = DISPATCH_PROGRESS.findIndex((s) => s.key === (row.dispatch_status || 'pending_admin_review'));
  const amount = Number(row.quote_amount || 0);
  const insufficient = balance < amount;
  const isExpired = row.quote_expires_at && new Date(row.quote_expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Verified Quote</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">Review & Approve Dispatch</h1>
          <p className="text-gray-400 mt-1">Your breakdown ticket has been reviewed by EquipLink. Approve the quote to secure funds and deploy a technician.</p>
        </motion.div>

        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold">Dispatch Progress</h3>
            <span className="text-xs text-gray-500">Ticket #{row.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {DISPATCH_PROGRESS.map((step, idx) => {
              const done = idx <= currentStep;
              return (
                <div key={step.key} className="flex items-center gap-2 flex-1 min-w-[72px]">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-[11px] mt-1 ${done ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
                  </div>
                  {idx < DISPATCH_PROGRESS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${idx < currentStep ? 'bg-amber-500' : 'bg-gray-800'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold">Machine & Issue</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Machine" value={`${row.machine_type || ''} ${row.machine_model || ''}`.trim() || '--'} />
                <Detail label="Serial" value={row.machine_serial || '--'} mono />
                <Detail label="Location" value={row.location || '--'} icon={<MapPin className="w-3.5 h-3.5" />} />
                <Detail label="Urgency" value={row.urgency || '--'} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="text-gray-500 text-xs mb-1">Reported symptoms</div>
                <p className="text-sm text-gray-200">{row.description}</p>
                {row.error_codes && (
                  <p className="text-xs text-amber-300 mt-2 font-mono">Codes: {row.error_codes}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold">Service Quotation</h3>
                </div>
                {row.quote_amount ? (
                  <button onClick={downloadPdf}
                    className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                ) : null}
              </div>
              {row.quote_amount ? (
                <>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Service Cost</div>
                        <div className="text-4xl font-black text-amber-400">ETB {amount.toLocaleString()}</div>
                      </div>
                      {row.quote_expires_at && (
                        <div className={`text-right ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                          <div className="flex items-center gap-1 text-xs mb-0.5">
                            <Calendar className="w-3 h-3" />
                            {isExpired ? 'Expired' : 'Valid until'}
                          </div>
                          <div className="text-sm font-semibold">
                            {new Date(row.quote_expires_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Scope & description</div>
                    <p className="text-sm text-gray-200 whitespace-pre-line">{row.quote_description}</p>
                  </div>
                  {row.quote_sent_at && (
                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Sent {new Date(row.quote_sent_at).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">Quote pending from admin. You'll be notified as soon as it's ready.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <WalletIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Payment</h3>
              </div>
              <div className="text-xs text-gray-500 mb-1">Wallet balance</div>
              <div className="text-2xl font-black mb-4">ETB {balance.toLocaleString()}</div>

              {row.dispatch_status === 'quote_sent' && row.quote_amount && !isExpired ? (
                <>
                  {insufficient && (
                    <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 mb-3 text-xs text-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Not enough balance. Top up ETB {(amount - balance).toLocaleString()} more.
                    </div>
                  )}
                  <button
                    onClick={approveAndPay}
                    disabled={paying || insufficient}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {paying ? 'Processing...' : 'Approve & Pay'}
                  </button>
                  {insufficient && (
                    <Link
                      to="/wallet"
                      className="w-full block text-center border border-gray-700 hover:border-gray-500 text-gray-200 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Top up wallet
                    </Link>
                  )}
                </>
              ) : row.dispatch_status === 'quote_sent' && isExpired ? (
                <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 text-sm text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  This quotation has expired. Please contact EquipLink for a new quote.
                </div>
              ) : row.dispatch_status === 'paid' ? (
                <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 text-sm text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Payment secured. Awaiting dispatch confirmation.
                </div>
              ) : row.dispatch_status === 'dispatched' ? (
                <div className="bg-teal-950/40 border border-teal-900/40 rounded-xl p-3 text-sm text-teal-300 flex items-start gap-2">
                  <Truck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Technician is en route to your site.
                </div>
              ) : row.dispatch_status === 'completed' ? (
                <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 text-sm text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Job completed successfully.
                </div>
              ) : (
                <p className="text-sm text-gray-400">Waiting for admin to send the quote.</p>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                For your protection, technician contact details are kept private.
                All communication and dispatch coordination happens through EquipLink.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">{icon}{label}</div>
      <div className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
