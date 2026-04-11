import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Gift, Copy, Check, Share2, MessageCircle, Send, Link as LinkIcon, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getReferralStats, getReferralLink, getShareText } from '../../lib/referrals';
import { trackEvent } from '../../lib/analytics';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ReferralData {
  referralCode: string;
  totalInvites: number;
  completedInvites: number;
  pendingInvites: number;
  totalEarned: number;
  referrals: Array<{
    id: string;
    status: string;
    referrer_reward: number;
    created_at: string;
    completed_at: string | null;
  }>;
}

export default function ReferralDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      getReferralStats(user.id).then(d => { setData(d); setLoading(false); });
    }
  }, [user]);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(getReferralLink(data.referralCode));
    setCopied(true);
    toast.success('Referral link copied!');
    trackEvent(user?.id || null, 'referral_link_shared', { method: 'copy' });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralCode);
    toast.success('Code copied!');
    trackEvent(user?.id || null, 'referral_link_shared', { method: 'copy_code' });
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const text = encodeURIComponent(getShareText(data.referralCode));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    trackEvent(user?.id || null, 'invite_sent', { platform: 'whatsapp' });
  };

  const shareTelegram = () => {
    if (!data) return;
    const text = encodeURIComponent(getShareText(data.referralCode));
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getReferralLink(data.referralCode))}&text=${text}`, '_blank');
    trackEvent(user?.id || null, 'invite_sent', { platform: 'telegram' });
  };

  const shareNative = async () => {
    if (!data || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Join EquipLink',
        text: getShareText(data.referralCode),
        url: getReferralLink(data.referralCode),
      });
      trackEvent(user?.id || null, 'invite_sent', { platform: 'native_share' });
    } catch {
      // user cancelled
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data) return null;

  const link = getReferralLink(data.referralCode);

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Invite Friends, Earn Credits</h1>
            <p className="text-gray-400 text-sm">Share your code. When friends join, you both earn credits.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{data.totalInvites}</p>
              <p className="text-gray-500 text-xs">Invited</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <Check className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{data.completedInvites}</p>
              <p className="text-gray-500 text-xs">Joined</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-400">{data.totalEarned} ETB</p>
              <p className="text-gray-500 text-xs">Earned</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Your Referral Code</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center">
                <span className="text-yellow-400 font-mono font-bold text-xl tracking-[0.3em]">{data.referralCode}</span>
              </div>
              <button
                onClick={copyCode}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 p-3 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Share Link</p>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-2">
              <LinkIcon className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
              <span className="text-gray-400 text-xs truncate flex-1">{link}</span>
              <button
                onClick={copyLink}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                  copied ? 'bg-green-600 text-white' : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                }`}
              >
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={shareWhatsApp}
              className="flex flex-col items-center gap-2 bg-green-900/20 border border-green-800/40 hover:border-green-600/60 rounded-xl p-4 transition-colors"
            >
              <MessageCircle className="w-6 h-6 text-green-400" />
              <span className="text-green-400 text-xs font-medium">WhatsApp</span>
            </button>
            <button
              onClick={shareTelegram}
              className="flex flex-col items-center gap-2 bg-blue-900/20 border border-blue-800/40 hover:border-blue-600/60 rounded-xl p-4 transition-colors"
            >
              <Send className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400 text-xs font-medium">Telegram</span>
            </button>
            <button
              onClick={navigator.share ? shareNative : copyLink}
              className="flex flex-col items-center gap-2 bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/60 rounded-xl p-4 transition-colors"
            >
              <Share2 className="w-6 h-6 text-gray-400" />
              <span className="text-gray-400 text-xs font-medium">More</span>
            </button>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Share your unique code or link with friends' },
                { step: '2', text: 'They sign up using your referral code' },
                { step: '3', text: 'You both earn credits to unlock contacts' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  <p className="text-gray-400 text-sm">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
              <p className="text-yellow-400 text-xs font-semibold">Rewards: You get 5 ETB, they get 3 ETB per successful referral</p>
            </div>
          </div>

          {data.referrals.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="text-white font-semibold text-sm">Referral History</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {data.referrals.map((ref) => (
                  <div key={ref.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ref.status === 'completed' ? 'bg-green-900/30' : 'bg-yellow-900/30'
                      }`}>
                        {ref.status === 'completed' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${ref.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {ref.status === 'completed' ? `+${ref.referrer_reward} ETB earned` : 'Pending'}
                        </p>
                        <p className="text-gray-500 text-xs">{formatDistanceToNow(new Date(ref.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ref.status === 'completed'
                        ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
