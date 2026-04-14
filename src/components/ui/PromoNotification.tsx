import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePromoMode } from '../../lib/promoMode';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function PromoNotification() {
  const { user } = useAuth();
  const promo = usePromoMode();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || promo.loading) return;

    const checkDismissed = async () => {
      const { data } = await supabase
        .from('user_promo_notifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setDismissed(!!data);
      setLoading(false);
    };

    checkDismissed();
  }, [user, promo.loading]);

  const handleDismiss = async () => {
    if (!user) return;

    try {
      await supabase
        .from('user_promo_notifications')
        .insert({ user_id: user.id });

      setDismissed(true);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  if (
    !promo.promoEnabled ||
    promo.loading ||
    loading ||
    dismissed ||
    !user
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-600 to-teal-600 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap className="w-4 h-4 text-white flex-shrink-0" />
            <p className="text-white text-sm font-semibold flex-1 truncate">
              {promo.promoMessage || 'Free promotional period — all features unlocked for everyone!'}
              {promo.promoEndDate && (
                <span className="opacity-80 text-xs ml-2">Ends {promo.promoEndDate}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
