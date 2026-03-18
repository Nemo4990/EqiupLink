import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, History, Clock, Trash2, ChevronRight, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import DiagnoseForm from './DiagnoseForm';
import DiagnoseResult from './DiagnoseResult';
import { formatDistanceToNow } from 'date-fns';

interface AiResponse {
  causes: string[];
  steps: string[];
  severity: string;
  recommendation: string;
}

interface AiSession {
  id: string;
  machine_type: string;
  brand: string;
  problem: string;
  ai_response: AiResponse;
  created_at: string;
}

export default function AiDiagnose() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [lastInput, setLastInput] = useState({ machineType: '', brand: '' });
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AiSession | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [freeQuota, setFreeQuota] = useState(3);
  const [cost, setCost] = useState(1);
  const [balance, setBalance] = useState(0);

  const loadMeta = useCallback(async () => {
    if (!user) return;
    const [countRes, ruleRes, walletRes] = await Promise.all([
      supabase.from('ai_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('credit_rules').select('credits_cost, free_quota').eq('action_key', 'ai_diagnose').eq('is_active', true).maybeSingle(),
      supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    ]);
    setSessionCount(countRes.count ?? 0);
    setFreeQuota(ruleRes.data?.free_quota ?? 3);
    setCost(ruleRes.data?.credits_cost ?? 1);
    setBalance(walletRes.data?.balance ?? 0);
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSessions(data ?? []);
  }, [user]);

  useEffect(() => {
    loadMeta();
    loadHistory();
  }, [loadMeta, loadHistory]);

  const isPro = profile?.subscription_tier === 'pro';
  const remainingFree = isPro ? Infinity : Math.max(0, freeQuota - sessionCount);

  const handleSubmit = async (data: { machineType: string; brand: string; problem: string }) => {
    if (!user) { navigate('/login'); return; }

    const needsCredits = !isPro && sessionCount >= freeQuota;
    if (needsCredits && balance < cost) {
      toast.error('Insufficient balance. Please top up your wallet.');
      navigate('/wallet');
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedSession(null);
    setLastInput({ machineType: data.machineType, brand: data.brand });

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-diagnose`;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(data),
      });

      if (res.status === 402) {
        toast.error('Insufficient balance. Please top up your wallet.');
        navigate('/wallet');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get diagnosis');
      }

      const aiRes: AiResponse = await res.json();
      setResult(aiRes);
      toast.success('Diagnosis complete!');
      loadMeta();
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get diagnosis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedSession(null);
  };

  const viewSession = (s: AiSession) => {
    setSelectedSession(s);
    setResult(null);
    setShowHistory(false);
  };

  const sevColor = (severity: string) => {
    if (severity === 'Critical') return 'text-red-400 bg-red-900/30 border-red-800/40';
    if (severity === 'Medium') return 'text-yellow-400 bg-yellow-900/30 border-yellow-800/40';
    return 'text-green-400 bg-green-900/30 border-green-800/40';
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-900/40 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Smart Mechanic Assistant</h1>
              <p className="text-gray-500 text-sm">AI-powered equipment diagnostics</p>
            </div>
          </div>
          <button
            onClick={() => { setShowHistory(!showHistory); setSelectedSession(null); setResult(null); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-teal-400 text-sm font-medium transition-colors border border-gray-800 hover:border-teal-800/50 px-3 py-2 rounded-xl"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-teal-400">{sessionCount}</p>
            <p className="text-gray-500 text-xs">Total Diagnoses</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{isPro ? 'Unlimited' : remainingFree}</p>
            <p className="text-gray-500 text-xs">Free Remaining</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-yellow-400">{cost} ETB</p>
            <p className="text-gray-500 text-xs">Per Diagnosis</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-lg font-black text-yellow-400">{balance}</p>
            </div>
            <p className="text-gray-500 text-xs">Wallet Balance</p>
          </div>
        </div>

        {showHistory ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h2 className="text-white font-bold text-lg mb-4">Diagnosis History</h2>
            {sessions.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No diagnoses yet. Run your first one above!</p>
              </div>
            ) : (
              sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => viewSession(s)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-teal-800/50 rounded-xl p-4 text-left transition-colors group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-semibold text-sm">{s.brand ? `${s.brand} ` : ''}{s.machine_type}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sevColor(s.ai_response?.severity)}`}>
                          {s.ai_response?.severity || 'N/A'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs truncate">{s.problem}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-gray-600 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </motion.div>
        ) : selectedSession ? (
          <DiagnoseResult
            result={selectedSession.ai_response}
            machineType={selectedSession.machine_type}
            brand={selectedSession.brand}
            onReset={handleReset}
          />
        ) : result ? (
          <DiagnoseResult
            result={result}
            machineType={lastInput.machineType}
            brand={lastInput.brand}
            onReset={handleReset}
          />
        ) : (
          <DiagnoseForm
            onSubmit={handleSubmit}
            loading={loading}
            remainingFree={isPro ? Infinity : remainingFree}
            cost={cost}
            balance={balance}
          />
        )}
      </div>
    </div>
  );
}
