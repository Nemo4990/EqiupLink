import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ReAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionLabel?: string;
}

export default function ReAuthModal({ isOpen, onClose, onSuccess, actionLabel = 'this action' }: ReAuthModalProps) {
  const { verifyPassword, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError('');
    setLoading(true);
    const valid = await verifyPassword(password);
    setLoading(false);
    if (!valid) {
      setError('Incorrect password. Please try again.');
      setPassword('');
      return;
    }
    setPassword('');
    onSuccess();
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Security Check</h3>
                  <p className="text-gray-500 text-xs">Re-enter password to continue</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 mb-5">
              <p className="text-gray-300 text-sm">
                For your security, please confirm your password to proceed with <span className="text-white font-medium">{actionLabel}</span>.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Signed in as <span className="text-gray-400">{profile?.email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 px-3 py-2.5 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Your Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="Enter your password"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-2.5 pl-10 pr-10 text-sm outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-gray-900 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Confirm</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
