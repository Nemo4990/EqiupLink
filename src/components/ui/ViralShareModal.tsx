import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, MessageCircle, Send, Copy, Share2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getReferralLink, getShareText } from '../../lib/referrals';
import { trackEvent } from '../../lib/analytics';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

interface ViralShareModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ViralShareModal({ open, onClose }: ViralShareModalProps) {
  const { user, profile } = useAuth();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (profile) {
      setCode(profile.referral_code || '');
    }
  }, [profile]);

  useEffect(() => {
    if (open && user) {
      trackEvent(user.id, 'viral_popup_shown');
    }
  }, [open, user]);

  if (!code) return null;

  const link = getReferralLink(code);
  const text = getShareText(code);

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    trackEvent(user?.id || null, 'viral_popup_shared', { platform: 'whatsapp' });
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
    trackEvent(user?.id || null, 'viral_popup_shared', { platform: 'telegram' });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
    trackEvent(user?.id || null, 'viral_popup_shared', { platform: 'copy' });
  };

  const shareNative = async () => {
    if (!navigator.share) { copyLink(); return; }
    try {
      await navigator.share({ title: 'Join EquipLink', text, url: link });
      trackEvent(user?.id || null, 'viral_popup_shared', { platform: 'native' });
    } catch { /* cancelled */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-b from-yellow-400/10 to-transparent p-6 pb-4 text-center">
              <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 p-1">
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-yellow-400/15 border border-yellow-400/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gift className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Invite 3 Friends</h3>
              <p className="text-gray-400 text-sm">Get <span className="text-yellow-400 font-semibold">3 free contact unlocks</span></p>
            </div>

            <div className="px-6 pb-2">
              <div className="flex items-center gap-3 mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-gray-500 text-[10px]">Friend {i}</span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-yellow-400 text-[10px] font-semibold">Reward</span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Share on WhatsApp
              </button>

              <button
                onClick={shareTelegram}
                className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <Send className="w-5 h-5" />
                Share on Telegram
              </button>

              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors text-sm"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
                {typeof navigator.share === 'function' && (
                  <button
                    onClick={shareNative}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                )}
              </div>

              <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-300 text-xs py-2 transition-colors">
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
