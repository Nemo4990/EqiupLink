import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, History, Clock, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import DiagnoseForm from './DiagnoseForm';
import DiagnoseResult from './DiagnoseResult';
import { formatDistanceToNow } from 'date-fns';

interface Diagnostic {
  id: string;
  machine_model: string;
  fault_code: string | null;
  symptoms: string;
  ai_response: string;
  created_at: string;
}

export default function AiDiagnose() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState({ machineModel: '', faultCode: '' });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Diagnostic | null>(null);
  const [credits, setCredits] = useState(0);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .maybeSingle();
      setCredits(profileData?.credits ?? 0);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('diagnostics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setDiagnostics(data ?? []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
    loadHistory();
  }, [loadUserData, loadHistory]);

  const handleSubmit = async (data: { machineModel: string; faultCode?: string; symptoms: string }) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (credits <= 0) {
      toast.error('No credits available. Please refill your credits.');
      return;
    }

    setLoading(true);
    setDiagnosis(null);
    setSelectedDiagnostic(null);
    setLastInput({ machineModel: data.machineModel, faultCode: data.faultCode || '' });

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-machine`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Session expired. Please refresh and login again.');
        navigate('/login');
        return;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 403) {
        toast.error('No credits available. Please refill your credits.');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = err.error || `Server error (${res.status})`;
        console.error('API Error:', errorMsg, err);
        throw new Error(errorMsg);
      }

      const result = await res.json();
      setDiagnosis(result.diagnosis);
      setCredits(result.remainingCredits);
      toast.success(`Diagnosis complete! (${result.remainingCredits} credits remaining)`);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get diagnosis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDiagnosis(null);
    setSelectedDiagnostic(null);
  };

  const viewDiagnostic = (d: Diagnostic) => {
    setSelectedDiagnostic(d);
    setDiagnosis(null);
    setShowHistory(false);
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
              <h1 className="text-2xl sm:text-3xl font-black text-white">Equipment Diagnostics</h1>
              <p className="text-gray-500 text-sm">AI-powered machinery troubleshooting</p>
            </div>
          </div>
          <button
            onClick={() => { setShowHistory(!showHistory); setSelectedDiagnostic(null); setDiagnosis(null); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-teal-400 text-sm font-medium transition-colors border border-gray-800 hover:border-teal-800/50 px-3 py-2 rounded-xl"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-teal-400">{diagnostics.length}</p>
            <p className="text-gray-500 text-xs">Total Diagnoses</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <p className="text-lg font-black text-yellow-400">{credits}</p>
            </div>
            <p className="text-gray-500 text-xs">Credits</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-blue-400">1</p>
            <p className="text-gray-500 text-xs">Per Diagnosis</p>
          </div>
        </div>

        {showHistory ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h2 className="text-white font-bold text-lg mb-4">Diagnosis History</h2>
            {diagnostics.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No diagnoses yet. Run your first one above!</p>
              </div>
            ) : (
              diagnostics.map(d => (
                <button
                  key={d.id}
                  onClick={() => viewDiagnostic(d)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-teal-800/50 rounded-xl p-4 text-left transition-colors group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-semibold text-sm">{d.machine_model}</p>
                        {d.fault_code && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-blue-900/50 text-blue-400 bg-blue-900/20 font-medium">
                            {d.fault_code}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{d.symptoms}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-gray-600 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </motion.div>
        ) : selectedDiagnostic ? (
          <div className="space-y-4">
            <button
              onClick={handleReset}
              className="text-teal-400 hover:text-teal-300 text-sm font-medium flex items-center gap-1"
            >
              ← Back to Form
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-white font-bold text-lg mb-1">{selectedDiagnostic.machine_model}</h2>
                {selectedDiagnostic.fault_code && (
                  <p className="text-teal-400 text-sm">Fault Code: {selectedDiagnostic.fault_code}</p>
                )}
              </div>
              <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedDiagnostic.ai_response}
              </div>
            </div>
          </div>
        ) : diagnosis ? (
          <div className="space-y-4">
            <button
              onClick={handleReset}
              className="text-teal-400 hover:text-teal-300 text-sm font-medium flex items-center gap-1"
            >
              ← Back to Form
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-white font-bold text-lg mb-1">{lastInput.machineModel}</h2>
                {lastInput.faultCode && (
                  <p className="text-teal-400 text-sm">Fault Code: {lastInput.faultCode}</p>
                )}
              </div>
              <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {diagnosis}
              </div>
            </div>
          </div>
        ) : (
          <DiagnoseForm
            onSubmit={handleSubmit}
            loading={loading}
            credits={credits}
          />
        )}
      </div>
    </div>
  );
}
