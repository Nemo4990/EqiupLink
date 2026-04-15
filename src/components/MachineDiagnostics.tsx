import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Loader, Send, History, AlertCircle } from 'lucide-react';

interface DiagnosticRecord {
  id: string;
  machine_model: string;
  fault_code?: string;
  symptoms: string;
  ai_response: string;
  created_at: string;
}

interface DiagnosticsProps {
  userId: string;
  credits: number;
  onCreditsUpdate?: (credits: number) => void;
}

export function MachineDiagnostics({ userId, credits, onCreditsUpdate }: DiagnosticsProps) {
  const [activeTab, setActiveTab] = useState<'diagnose' | 'history'>('diagnose');
  const [machineModel, setMachineModel] = useState('');
  const [faultCode, setFaultCode] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [history, setHistory] = useState<DiagnosticRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosticRecord | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('diagnostics_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      toast.error('Failed to load diagnostic history');
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!machineModel.trim() || !symptoms.trim()) {
      toast.error('Please fill in machine model and symptoms');
      return;
    }

    if (credits <= 0) {
      toast.error('No credits available. Please purchase credits.');
      return;
    }

    setLoading(true);
    setDiagnosis(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Session expired. Please login again.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-diagnose`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          machineModel,
          faultCode: faultCode || undefined,
          symptoms,
        }),
      });

      if (res.status === 403) {
        toast.error('No credits available. Please purchase credits.');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      const result = await res.json();
      setDiagnosis(result.diagnosis);
      onCreditsUpdate?.(result.remainingCredits);
      toast.success(`Analysis complete! (${result.remainingCredits} credits remaining)`);

      // Reset form
      setMachineModel('');
      setFaultCode('');
      setSymptoms('');

      // Reload history
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get diagnosis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-700">
          <h1 className="text-3xl font-bold text-white mb-2">Equipment Diagnostics</h1>
          <p className="text-blue-100">AI-powered analysis powered by Google Gemini</p>
        </div>

        {/* Credits Display */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Credits Available: <span className="text-blue-600 font-bold text-lg">{credits}</span>
            </span>
          </div>
          {credits <= 2 && (
            <span className="text-sm text-orange-600 font-medium">Low on credits</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('diagnose')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors ${
              activeTab === 'diagnose'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            New Diagnosis
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              if (history.length === 0) loadHistory();
            }}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History ({history.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'diagnose' ? (
            <div className="space-y-6">
              <form onSubmit={handleDiagnose} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Machine Model *
                  </label>
                  <input
                    type="text"
                    value={machineModel}
                    onChange={(e) => setMachineModel(e.target.value)}
                    placeholder="e.g., Caterpillar CAT 320D, Perkins 1104D-44 Engine"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fault Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={faultCode}
                    onChange={(e) => setFaultCode(e.target.value)}
                    placeholder="e.g., P0101, SPN 520FMI04"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symptoms *
                  </label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe the symptoms... e.g., Engine loss of power, overheating, unusual noise, etc."
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || credits <= 0}
                  className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                    loading || credits <= 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                      Analyzing ECM Data...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 inline mr-2" />
                      Get Diagnosis ({credits} credits)
                    </>
                  )}
                </button>
              </form>

              {diagnosis && (
                <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Diagnostic Analysis
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                    {diagnosis.split('\n').map((line, idx) => {
                      if (!line.trim()) return null;
                      if (line.startsWith('##')) {
                        return (
                          <h4 key={idx} className="text-md font-bold text-gray-900 mt-4 mb-2">
                            {line.replace(/^#+\s/, '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('**')) {
                        return (
                          <p key={idx} className="font-semibold text-gray-800">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        );
                      }
                      if (line.startsWith('-')) {
                        return (
                          <li key={idx} className="ml-4 text-gray-700">
                            {line.replace(/^-\s/, '')}
                          </li>
                        );
                      }
                      return (
                        <p key={idx} className="text-gray-700">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No diagnostic history yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.map((record) => (
                      <button
                        key={record.id}
                        onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{record.machine_model}</h4>
                            <p className="text-sm text-gray-600 mt-1">{record.symptoms}</p>
                            {record.fault_code && (
                              <p className="text-xs text-gray-500 mt-1">Code: {record.fault_code}</p>
                            )}
                          </div>
                          <time className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(record.created_at).toLocaleDateString()}
                          </time>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedRecord && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">
                        {selectedRecord.machine_model} - {new Date(selectedRecord.created_at).toLocaleDateString()}
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                        {selectedRecord.ai_response.split('\n').map((line, idx) => {
                          if (!line.trim()) return null;
                          if (line.startsWith('##')) {
                            return (
                              <h5 key={idx} className="text-md font-bold text-gray-900 mt-4 mb-2">
                                {line.replace(/^#+\s/, '')}
                              </h5>
                            );
                          }
                          if (line.startsWith('**')) {
                            return (
                              <p key={idx} className="font-semibold text-gray-800">
                                {line.replace(/\*\*/g, '')}
                              </p>
                            );
                          }
                          if (line.startsWith('-')) {
                            return (
                              <li key={idx} className="ml-4 text-gray-700">
                                {line.replace(/^-\s/, '')}
                              </li>
                            );
                          }
                          return (
                            <p key={idx} className="text-gray-700">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
