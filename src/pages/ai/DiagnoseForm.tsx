import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, ChevronDown, Zap } from 'lucide-react';

const EQUIPMENT_MODELS = [
  'Caterpillar 320',
  'Caterpillar 330',
  'Caterpillar 336',
  'Caterpillar 950',
  'Caterpillar 320D',
  'Komatsu PC200',
  'Komatsu PC220',
  'Komatsu WA470',
  'Volvo EC210',
  'Volvo L220H',
  'Hitachi ZX210',
  'John Deere 410',
  'Case CX140',
  'Perkins Engine 1103',
  'Perkins Engine 1104',
  'Other',
];

interface DiagnoseFormProps {
  onSubmit: (data: { machineModel: string; faultCode?: string; symptoms: string }) => void;
  loading: boolean;
  credits: number;
}

export default function DiagnoseForm({ onSubmit, loading, credits }: DiagnoseFormProps) {
  const [machineModel, setMachineModel] = useState('');
  const [faultCode, setFaultCode] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineModel || !symptoms || symptoms.trim().length < 10) return;
    onSubmit({ machineModel, faultCode, symptoms });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-teal-900/40 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Equipment Diagnosis</h2>
          <p className="text-gray-500 text-xs">Describe your equipment issue for AI-powered troubleshooting</p>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Equipment Model *</label>
        <div className="relative">
          <select
            value={machineModel}
            onChange={e => setMachineModel(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white rounded-xl py-3 px-4 text-sm outline-none transition-colors appearance-none"
          >
            <option value="" disabled>Select equipment model...</option>
            {EQUIPMENT_MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Fault Code (Optional)</label>
        <input
          type="text"
          value={faultCode}
          onChange={e => setFaultCode(e.target.value)}
          placeholder="e.g. P0123, DTC code, error number..."
          maxLength={50}
          className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 text-sm outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Symptoms & Problem Description *</label>
        <textarea
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
          placeholder="Describe the symptoms in detail. Include: sounds, performance changes, error messages, when it happens, recent service history, etc. Be as specific as possible for accurate diagnosis..."
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 text-sm outline-none transition-colors resize-none"
        />
        <p className="text-gray-600 text-xs mt-1 text-right">{symptoms.length}/2000</p>
      </div>

      {credits <= 0 ? (
        <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-center">
          <p className="text-red-400 text-sm font-medium">No credits available</p>
          <p className="text-gray-500 text-xs mt-0.5">You need to refill your credits to continue</p>
        </div>
      ) : (
        <div className="bg-teal-950/30 border border-teal-900/40 rounded-xl p-3 text-center flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <div>
            <p className="text-teal-400 text-sm font-medium">1 credit will be used</p>
            <p className="text-gray-500 text-xs mt-0.5">You have {credits} credits remaining</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !machineModel || symptoms.trim().length < 10 || credits <= 0}
        className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Bot className="w-4 h-4" />
            Get Diagnosis
          </>
        )}
      </button>
    </motion.form>
  );
}
