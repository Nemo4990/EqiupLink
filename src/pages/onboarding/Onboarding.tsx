import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Package, Search, Truck, ChevronRight, Gift, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';

const GOALS = [
  { id: 'find_mechanic', label: 'Find a Mechanic', desc: 'Get my equipment fixed', icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50', route: '/marketplace/mechanics' },
  { id: 'find_parts', label: 'Find Spare Parts', desc: 'Source parts for my machines', icon: Package, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50', route: '/marketplace/parts' },
  { id: 'offer_services', label: 'Offer My Services', desc: 'I am a mechanic or supplier', icon: Wrench, color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/50', route: '/profile' },
  { id: 'rent_equipment', label: 'Rent Equipment', desc: 'Find or list rental machines', icon: Truck, color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50', route: '/marketplace/rentals' },
  { id: 'browse', label: 'Just Browsing', desc: 'I want to explore the platform', icon: Search, color: 'text-gray-400', bg: 'bg-gray-800/50 border-gray-700/50', route: '/dashboard' },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const completeOnboarding = async (route: string) => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      await trackEvent(user.id, 'onboarding_completed', { goal: selectedGoal });
      await refreshProfile();
    }
    navigate(route, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Gift className="w-10 h-10 text-yellow-400" />
              </div>

              <h1 className="text-3xl font-black text-white mb-3">
                Welcome, {profile?.name?.split(' ')[0] || 'there'}!
              </h1>

              <p className="text-gray-400 mb-2 text-lg">
                You have received
              </p>

              <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700/50 rounded-xl px-5 py-3 mb-6">
                <Sparkles className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-bold text-xl">3 Free Credits</span>
              </div>

              <p className="text-gray-500 text-sm mb-8">
                Use them to unlock mechanic and supplier contacts instantly.
              </p>

              <button
                onClick={() => {
                  trackEvent(user?.id || null, 'onboarding_started');
                  setStep(1);
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Get Started <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-black text-white mb-2 text-center">What do you need?</h2>
              <p className="text-gray-400 text-center mb-6 text-sm">We'll take you right where you need to go</p>

              <div className="space-y-3 mb-6">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedGoal === goal.id
                        ? 'border-yellow-400 bg-yellow-400/5 ring-1 ring-yellow-400/30'
                        : `${goal.bg} hover:border-gray-600`
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedGoal === goal.id ? 'bg-yellow-400/20' : 'bg-gray-800'
                    }`}>
                      <goal.icon className={`w-5 h-5 ${selectedGoal === goal.id ? 'text-yellow-400' : goal.color}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${selectedGoal === goal.id ? 'text-white' : 'text-gray-200'}`}>{goal.label}</p>
                      <p className="text-gray-500 text-sm">{goal.desc}</p>
                    </div>
                    {selectedGoal === goal.id && (
                      <div className="ml-auto w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-3 h-3 text-gray-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const goal = GOALS.find(g => g.id === selectedGoal);
                  completeOnboarding(goal?.route || '/dashboard');
                }}
                disabled={!selectedGoal}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold py-3.5 rounded-xl transition-colors"
              >
                Continue
              </button>

              <button
                onClick={() => completeOnboarding('/dashboard')}
                className="w-full text-gray-500 hover:text-gray-300 text-sm mt-3 py-2 transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
