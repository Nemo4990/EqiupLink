import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, AlertOctagon, Wrench, ArrowRight, ListChecks, Search as SearchIcon, MessageCircle } from 'lucide-react';

interface AiResponse {
  causes: string[];
  steps: string[];
  severity: string;
  recommendation: string;
}

interface DiagnoseResultProps {
  result: AiResponse;
  machineType: string;
  brand: string;
  onReset: () => void;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.FC<{ className?: string }> }> = {
  Low: { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-800/50', icon: CheckCircle },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50', icon: AlertTriangle },
  Critical: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-800/50', icon: AlertOctagon },
};

export default function DiagnoseResult({ result, machineType, brand, onReset }: DiagnoseResultProps) {
  const sev = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.Medium;
  const SeverityIcon = sev.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className={`${sev.bg} border ${sev.border} rounded-2xl p-5 flex items-start gap-4`}>
        <div className={`w-12 h-12 ${sev.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <SeverityIcon className={`w-6 h-6 ${sev.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-white font-bold text-lg">Severity: {result.severity}</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sev.bg} ${sev.color} border ${sev.border}`}>
              {result.severity.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{brand ? `${brand} ` : ''}{machineType}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-orange-900/30 rounded-lg flex items-center justify-center">
            <SearchIcon className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="text-white font-bold">Likely Causes</h3>
        </div>
        <ul className="space-y-3">
          {result.causes.map((cause, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-orange-900/30 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-gray-300 text-sm leading-relaxed">{cause}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-teal-900/30 rounded-lg flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-teal-400" />
          </div>
          <h3 className="text-white font-bold">Troubleshooting Steps</h3>
        </div>
        <ol className="space-y-3">
          {result.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-900/30 text-teal-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-white font-bold">Recommendation</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{result.recommendation}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/marketplace/mechanics"
          className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Wrench className="w-4 h-4" />
          Find a Mechanic
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={onReset}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm border border-gray-700"
        >
          Diagnose Another Issue
        </button>
      </div>
    </motion.div>
  );
}
