import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Search,
  ChevronDown, ChevronUp, DollarSign, User, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface PaymentRecord {
  id: string;
  user_id: string;
  fee_type: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transaction_id: string;
  payment_method: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

const STATUS_COLORS = {
  pending: { bg: 'bg-amber-900/40', border: 'border-amber-800/40', badge: 'bg-amber-500/20 text-amber-300', icon: Clock },
  approved: { bg: 'bg-emerald-900/40', border: 'border-emerald-800/40', badge: 'bg-emerald-500/20 text-emerald-300', icon: CheckCircle },
  rejected: { bg: 'bg-red-900/40', border: 'border-red-800/40', badge: 'bg-red-500/20 text-red-300', icon: XCircle },
};

export default function PaymentApproval() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  async function loadPayments() {
    setLoading(true);
    try {
      let query = supabase
        .from('user_payments')
        .select('*, user:profiles!user_payments_user_id_fkey(id, name, email, phone)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPayments((data as PaymentRecord[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  async function approvePayment(paymentId: string, amount: number, userId: string) {
    setApproving(paymentId);
    try {
      const now = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('user_payments')
        .update({
          status: 'approved',
          reviewed_by: profile?.id,
          reviewed_at: now,
        })
        .eq('id', paymentId);

      if (updateErr) throw updateErr;

      const walletRes = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletRes.data) {
        const newBalance = Number(walletRes.data.balance) + amount;
        await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            total_purchased: amount,
          })
          .eq('id', walletRes.data.id);

        await supabase.from('wallet_transactions').insert({
          wallet_id: walletRes.data.id,
          user_id: userId,
          type: 'purchase',
          amount: amount,
          balance_after: newBalance,
          description: 'Wallet top-up approved by admin',
          status: 'completed',
        });

        await supabase.from('profiles').update({
          wallet_balance: newBalance,
        }).eq('id', userId);
      }

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `Your payment of ETB ${Number(amount).toLocaleString()} has been approved. Credits added to your wallet.`,
        data: { payment_id: paymentId, amount },
      });

      toast.success('Payment approved and credits added');
      await loadPayments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve payment');
    } finally {
      setApproving(null);
    }
  }

  async function rejectPayment(paymentId: string, userId: string) {
    setRejectingId(paymentId);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('user_payments')
        .update({
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: now,
          admin_notes: rejectNote || 'Payment rejected by admin',
        })
        .eq('id', paymentId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: rejectNote || 'Your payment has been rejected. Please contact support for more information.',
        data: { payment_id: paymentId },
      });

      toast.success('Payment rejected');
      setRejectNote('');
      await loadPayments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject payment');
    } finally {
      setRejectingId(null);
    }
  }

  const filtered = payments.filter(p =>
    p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    total_pending: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white">Payment Approvals</h1>
          </div>
          <p className="text-gray-400 text-sm">Review and approve pending user payments</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-900/30 border border-amber-800/50 rounded-2xl p-5"
          >
            <p className="text-amber-300 text-xs uppercase tracking-wide mb-2">Pending Approvals</p>
            <p className="text-3xl font-black text-white">{stats.pending}</p>
            <p className="text-amber-300 text-sm mt-1 font-semibold">ETB {stats.total_pending.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Payments</p>
            <p className="text-3xl font-black text-white">{payments.length}</p>
            <p className="text-gray-500 text-sm mt-1">All time</p>
          </motion.div>
        </div>

        <div className="mb-6 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  filter === status
                    ? 'bg-amber-400 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No payments found</p>
            </div>
          ) : (
            filtered.map((payment, idx) => {
              const StatusIcon = STATUS_COLORS[payment.status].icon;
              const isExpanded = expandedId === payment.id;

              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`border rounded-2xl transition-all ${
                    STATUS_COLORS[payment.status].border
                  } ${isExpanded ? 'bg-gray-900' : 'bg-gray-950 hover:bg-gray-900'}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                    className="w-full p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 text-left">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_COLORS[payment.status].badge}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold truncate">{payment.user?.name || 'User'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_COLORS[payment.status].badge}`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">{payment.user?.email || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white font-black text-lg">ETB {Number(payment.amount).toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">{formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}</p>
                      </div>

                      <button className="text-gray-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Transaction ID</p>
                          <p className="text-white font-mono">{payment.transaction_id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Payment Method</p>
                          <p className="text-white capitalize">{payment.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Fee Type</p>
                          <p className="text-white">{payment.fee_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Submitted</p>
                          <p className="text-white">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {payment.admin_notes && (
                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs mb-1">Admin Notes</p>
                          <p className="text-white text-sm">{payment.admin_notes}</p>
                        </div>
                      )}

                      {payment.status === 'pending' && (
                        <div className="space-y-3">
                          {rejectingId === payment.id && (
                            <textarea
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Reason for rejection (optional)..."
                              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 transition-colors"
                              rows={2}
                            />
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => approvePayment(payment.id, payment.amount, payment.user_id)}
                              disabled={approving === payment.id}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve & Add Credits
                            </button>

                            {rejectingId === payment.id ? (
                              <button
                                onClick={() => rejectPayment(payment.id, payment.user_id)}
                                disabled={rejectingId === payment.id}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                              >
                                Confirm Rejection
                              </button>
                            ) : (
                              <button
                                onClick={() => setRejectingId(payment.id)}
                                className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 font-bold py-2.5 rounded-xl transition-colors border border-red-800/40"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {payment.reviewed_at && (
                        <div className="bg-gray-800/50 rounded-xl p-3 text-xs text-gray-400">
                          <p>Reviewed on {new Date(payment.reviewed_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
