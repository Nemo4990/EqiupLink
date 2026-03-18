import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, ChevronDown } from 'lucide-react';

const MACHINE_TYPES = [
  'Excavator',
  'Bulldozer',
  'Wheel Loader',
  'Backhoe Loader',
  'Motor Grader',
  'Dump Truck',
  'Crane',
  'Forklift',
  'Compactor / Roller',
  'Concrete Mixer',
  'Generator',
  'Air Compressor',
  'Drilling Rig',
  'Paver',
  'Skid Steer Loader',
  'Tractor',
  'Other',
];

interface DiagnoseFormProps {
  onSubmit: (data: { machineType: string; brand: string; problem: string }) => void;
  loading: boolean;
  remainingFree: number;
  cost: number;
  balance: number;
}

export default function DiagnoseForm({ onSubmit, loading, remainingFree, cost, balance }: DiagnoseFormProps) {
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [problem, setProblem] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineType || !problem || problem.trim().length < 10) return;
    onSubmit({ machineType, brand, problem });
  };

  const needsCredits = remainingFree <= 0;
  const canAfford = balance >= cost;

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
          <h2 className="text-white font-bold text-lg">Describe the Issue</h2>
          <p className="text-gray-500 text-xs">Fill in the details below and our AI will analyze the problem</p>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Machine Type *</label>
        <div className="relative">
          <select
            value={machineType}
            onChange={e => setMachineType(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white rounded-xl py-3 px-4 text-sm outline-none transition-colors appearance-none"
          >
            <option value="" disabled>Select machine type...</option>
            {MACHINE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Brand / Manufacturer</label>
        <input
          type="text"
          value={brand}
          onChange={e => setBrand(e.target.value)}
          placeholder="e.g. Caterpillar, Komatsu, Volvo..."
          maxLength={100}
          className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 text-sm outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium mb-1.5">Problem Description *</label>
        <textarea
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Describe what's happening with the machine in detail. The more specific you are, the better the diagnosis will be..."
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 focus:border-teal-400 text-white placeholder-gray-600 rounded-xl py-3 px-4 text-sm outline-none transition-colors resize-none"
        />
        <p className="text-gray-600 text-xs mt-1 text-right">{problem.length}/2000</p>
      </div>

      {needsCredits && !canAfford && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-center">
          <p className="text-red-400 text-sm font-medium">Insufficient wallet balance</p>
          <p className="text-gray-500 text-xs mt-0.5">You need {cost} ETB credit. Current balance: {balance} ETB</p>
        </div>
      )}

      {needsCredits && canAfford && (
        <div className="bg-teal-950/30 border border-teal-900/40 rounded-xl p-3 text-center">
          <p className="text-teal-400 text-sm font-medium">{cost} ETB credit will be deducted</p>
          <p className="text-gray-500 text-xs mt-0.5">Current balance: {balance} ETB</p>
        </div>
      )}

      {!needsCredits && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-sm">{remainingFree} free {remainingFree === 1 ? 'diagnosis' : 'diagnoses'} remaining</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !machineType || problem.trim().length < 10 || (needsCredits && !canAfford)}
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
            Get AI Diagnosis
          </>
        )}
      </button>
    </motion.form>
  );
}
