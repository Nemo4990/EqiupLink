import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Wallet, Phone, Mail, MapPin, MessageCircle, Send, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { spendCredits, hasAccessGrant, getCreditRule } from '../../lib/credits';
import { trackEvent } from '../../lib/analytics';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface ContactInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
}

interface ContactUnlockProps {
  targetUserId: string;
  targetName: string;
  resourceType: 'mechanic' | 'part' | 'rental';
  contactInfo: ContactInfo;
  onUnlocked?: () => void;
}

const ACTION_MAP: Record<string, string> = {
  mechanic: 'view_mechanic_contact',
  part: 'view_part_contact',
  rental: 'view_rental_contact',
};

export default function ContactUnlock({ targetUserId, targetName, resourceType, contactInfo, onUnlocked }: ContactUnlockProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cost, setCost] = useState(1);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    Promise.all([
      hasAccessGrant(user.id, targetUserId, resourceType),
      getCreditRule(ACTION_MAP[resourceType]),
    ]).then(([granted, rule]) => {
      setUnlocked(granted || user.id === targetUserId);
      setCost(rule?.credits_cost ?? 1);
      setChecking(false);
    });
  }, [user, targetUserId, resourceType]);

  const handleUnlock = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    const result = await spendCredits(
      user.id,
      ACTION_MAP[resourceType],
      targetUserId,
      resourceType,
      `Unlocked ${resourceType} contact: ${targetName}`
    );
    setLoading(false);

    if (result.alreadyGranted) {
      setUnlocked(true);
      return;
    }

    if (result.insufficientBalance) {
      toast.error('Not enough credits. Top up your wallet.');
      navigate('/wallet');
      return;
    }

    if (result.success) {
      setUnlocked(true);
      await refreshProfile();
      trackEvent(user.id, 'contact_unlocked', { target: targetUserId, type: resourceType, cost });
      toast.success('Contact unlocked!');
      onUnlocked?.();
    }
  };

  const copyField = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  if (checking) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
        <div className="h-10 bg-gray-800 rounded-lg" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
      >
        <div className="p-4 text-center">
          <div className="relative mb-4">
            <div className="space-y-2 filter blur-sm select-none pointer-events-none">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone className="w-4 h-4" /> +251 9XX XXX XXX
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4" /> xxxxxxx@gmail.com
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4" /> Addis Ababa, Ethiopia
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-gray-900/90 border border-gray-700 rounded-xl px-4 py-2">
                <Lock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-gray-300 text-xs font-medium">Contact Hidden</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleUnlock}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              'Unlocking...'
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Unlock Contact ({cost} credit{cost !== 1 ? 's' : ''})
              </>
            )}
          </button>

          <p className="text-gray-500 text-xs mt-2">
            <Wallet className="w-3 h-3 inline mr-1" />
            One-time charge. View unlimited after unlocking.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900 border border-green-800/40 rounded-xl overflow-hidden"
    >
      <div className="bg-green-900/20 px-4 py-2 flex items-center gap-2 border-b border-green-800/30">
        <Unlock className="w-3.5 h-3.5 text-green-400" />
        <span className="text-green-400 text-xs font-semibold">Contact Unlocked</span>
      </div>
      <div className="p-4 space-y-3">
        {contactInfo.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Phone className="w-4 h-4 text-gray-500" />
              <a href={`tel:${contactInfo.phone}`} className="hover:text-yellow-400 transition-colors">{contactInfo.phone}</a>
            </div>
            <button onClick={() => copyField(contactInfo.phone!, 'Phone')} className="text-gray-500 hover:text-gray-300 p-1">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {contactInfo.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <a href={`mailto:${contactInfo.email}`} className="hover:text-yellow-400 transition-colors">{contactInfo.email}</a>
            </div>
            <button onClick={() => copyField(contactInfo.email!, 'Email')} className="text-gray-500 hover:text-gray-300 p-1">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {contactInfo.address && (
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{contactInfo.address}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {contactInfo.whatsapp && (
            <a
              href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {contactInfo.telegram && (
            <a
              href={`https://t.me/${contactInfo.telegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Telegram
            </a>
          )}
          {contactInfo.phone && !contactInfo.whatsapp && !contactInfo.telegram && (
            <a
              href={`tel:${contactInfo.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-xs font-semibold py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Call Now
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
