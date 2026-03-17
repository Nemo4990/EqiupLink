import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Commission } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-900/30',
  paid: 'text-green-400 bg-green-900/30',
  disputed: 'text-red-400 bg-red-900/30',
  waived: 'text-gray-400 bg-gray-800',
};

export default function Commissions() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchCommissions();
  }, [profile]);

  const fetchCommissions = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('commissions')
      .select('*, breakdown_request:breakdown_requests(machine_model, machine_type, location)')
      .eq('technician_id', profile.id)
      .order('created_at', { ascending: false });
    setCommissions((data || []) as Commission[]);
    setLoading(false);
  };

  const totalJobs = commissions.length;
  const totalGross = commissions.reduce((s, c) => s + c.job_amount, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commission_amount, 0);
  const totalNet = totalGross - totalCommission;
  const avgRate = commissions.length > 0 ? commissions.reduce((s, c) => s + c.commission_rate, 0) / commissions.length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center pt-20">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <div>
            <h1 className="text-2xl font-black text-white">My Earnings</h1>
            <p className="text-gray-400 text-sm">Commission history and net earnings</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Jobs', value: totalJobs.toString(), color: 'text-blue-400', bg: 'bg-blue-900/30' },
            { label: 'Gross Earned', value: `$${totalGross.toFixed(2)}`, color: 'text-gray-300', bg: 'bg-gray-800' },
            { label: 'Commission Paid', value: `$${totalCommission.toFixed(2)}`, color: 'text-red-400', bg: 'bg-red-900/30' },
            { label: 'Net Earnings', value: `$${totalNet.toFixed(2)}`, color: 'text-green-400', bg: 'bg-green-900/30' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-500 text-sm mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {commissions.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No commissions yet</h3>
            <p className="text-gray-400">Complete jobs to see your earnings and commission history here.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Commission History</h2>
              <span className="text-gray-500 text-sm">Avg. rate: {avgRate.toFixed(1)}%</span>
            </div>
            <div className="divide-y divide-gray-800">
              {commissions.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm">
                          {(c.breakdown_request as { machine_model?: string })?.machine_model || `Job #${c.breakdown_request_id.slice(0, 8)}`}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {(c.breakdown_request as { machine_type?: string })?.machine_type} ·
                        {(c.breakdown_request as { location?: string })?.location} ·
                        {format(new Date(c.created_at), 'MMM d, yyyy')}
                      </p>
                      {c.notes && (
                        <p className="text-gray-500 text-xs mt-1 italic">{c.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm">${c.job_amount.toFixed(2)} gross</p>
                      <p className="text-red-400 text-xs mt-0.5">-${c.commission_amount.toFixed(2)} ({c.commission_rate}%)</p>
                      <p className="text-green-400 font-bold text-sm mt-0.5">${(c.job_amount - c.commission_amount).toFixed(2)} net</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            How commissions work
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              When a job is marked as resolved, a 5–10% commission is applied to your earnings.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              The exact rate is set by the admin and may vary by job type or value.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Commissions are tracked transparently — you can dispute any charge.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
