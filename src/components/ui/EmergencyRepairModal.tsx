import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Wrench, MapPin, Star, Phone, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MechanicProfile } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyRepairModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    supabase
      .from('mechanic_profiles')
      .select('*, profile:profiles!mechanic_profiles_user_id_fkey(name, avatar_url, location, contact_whatsapp, contact_phone, phone)')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setMechanics((data || []) as MechanicProfile[]);
        setLoading(false);
      });
  }, [isOpen]);

  const openWhatsApp = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${name}, I found your profile on EquipLink. My machine is down and I need emergency repair assistance. Are you available?`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  const getPhone = (mechanic: MechanicProfile) => {
    const p = mechanic.profile as any;
    return p?.contact_whatsapp || p?.contact_phone || p?.phone || null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full max-w-lg bg-gray-900 border border-red-800/60 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-red-950/80 to-red-900/40 px-5 py-4 flex items-center justify-between border-b border-red-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Emergency Repair Mode</h2>
                  <p className="text-red-400/80 text-xs">Available mechanics near you</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">Machine down? Contact an available technician directly or post a formal breakdown request.</p>
              </div>

              {loading ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                  <p className="text-gray-400 text-sm">Finding available mechanics...</p>
                </div>
              ) : mechanics.length === 0 ? (
                <div className="py-10 text-center">
                  <Wrench className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No mechanics available right now</p>
                  <button
                    onClick={() => { onClose(); navigate('/breakdown/new'); }}
                    className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
                  >
                    Post a breakdown request instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {mechanics.map((m) => {
                    const phone = getPhone(m);
                    return (
                      <div key={m.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {(m.profile as any)?.avatar_url ? (
                            <img src={(m.profile as any).avatar_url} alt={(m.profile as any).name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold">
                              {((m.profile as any)?.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{(m.profile as any)?.name || 'Mechanic'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-yellow-400 text-xs font-medium">{m.rating.toFixed(1)}</span>
                            <span className="text-gray-500 text-xs">· {m.years_experience}yrs</span>
                          </div>
                          {(m.profile as any)?.location && (
                            <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-xs">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{(m.profile as any).location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {phone && (
                            <button
                              onClick={() => openWhatsApp(phone, (m.profile as any)?.name || 'Mechanic')}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Phone className="w-3 h-3" /> WhatsApp
                            </button>
                          )}
                          <button
                            onClick={() => { onClose(); navigate(`/messages?user=${m.user_id}`); }}
                            className="flex items-center gap-1 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors border border-yellow-400/30"
                          >
                            <MessageSquare className="w-3 h-3" /> Message
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/breakdown/new'); }}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> Post Breakdown Request
                </button>
                <button
                  onClick={() => { onClose(); navigate('/marketplace/mechanics'); }}
                  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" /> All Mechanics
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
