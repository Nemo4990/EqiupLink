import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, MapPin, AtSign, MessageSquare, Copy, ExternalLink, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ContactDetails {
  name: string;
  role: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  contact_telegram: string | null;
  contact_whatsapp: string | null;
  contact_other: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName?: string;
}

export default function ContactCard({ isOpen, onClose, providerId, providerName }: Props) {
  const navigate = useNavigate();
  const [details, setDetails] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !providerId) return;
    setLoading(true);
    setDetails(null);

    supabase
      .from('profiles')
      .select('name, role, contact_phone, contact_email, contact_address, contact_telegram, contact_whatsapp, contact_other')
      .eq('id', providerId)
      .maybeSingle()
      .then(({ data }) => {
        setDetails(data as ContactDetails | null);
        setLoading(false);
      });
  }, [isOpen, providerId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const hasAnyContact = details && (
    details.contact_phone ||
    details.contact_email ||
    details.contact_address ||
    details.contact_telegram ||
    details.contact_whatsapp ||
    details.contact_other
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="bg-gradient-to-r from-yellow-400/15 to-orange-400/10 border-b border-gray-800 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Contact Details Unlocked</h2>
                <p className="text-gray-400 text-xs">Verified contact information</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-2 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
              </div>
            ) : !details || !hasAnyContact ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">{details?.name || providerName || 'Provider'}</p>
                <p className="text-gray-400 text-sm mb-2">This provider hasn't added their contact details yet.</p>
                <p className="text-gray-500 text-xs">You can still reach them via the in-app chat below.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-black text-lg">
                    {details.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold">{details.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{details.role?.replace('_', ' ')}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-green-400 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified Access
                  </span>
                </div>

                {details.contact_phone && (
                  <ContactRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone"
                    value={details.contact_phone}
                    href={`tel:${details.contact_phone}`}
                    onCopy={() => copyToClipboard(details.contact_phone!, 'Phone number')}
                  />
                )}

                {details.contact_whatsapp && (
                  <ContactRow
                    icon={<Phone className="w-4 h-4" />}
                    label="WhatsApp"
                    value={details.contact_whatsapp}
                    href={`https://wa.me/${details.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                    external
                    onCopy={() => copyToClipboard(details.contact_whatsapp!, 'WhatsApp number')}
                    accent="green"
                  />
                )}

                {details.contact_telegram && (
                  <ContactRow
                    icon={<AtSign className="w-4 h-4" />}
                    label="Telegram"
                    value={details.contact_telegram}
                    href={`https://t.me/${details.contact_telegram.replace('@', '')}`}
                    external
                    onCopy={() => copyToClipboard(details.contact_telegram!, 'Telegram handle')}
                    accent="blue"
                  />
                )}

                {details.contact_email && (
                  <ContactRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={details.contact_email}
                    href={`mailto:${details.contact_email}`}
                    onCopy={() => copyToClipboard(details.contact_email!, 'Email address')}
                  />
                )}

                {details.contact_address && (
                  <div className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 text-yellow-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-xs mb-0.5">Address</p>
                      <p className="text-white text-sm leading-snug">{details.contact_address}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(details.contact_address!, 'Address')}
                      className="text-gray-500 hover:text-yellow-400 transition-colors flex-shrink-0 mt-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {details.contact_other && (
                  <div className="bg-gray-800 rounded-xl px-4 py-3">
                    <p className="text-gray-400 text-xs mb-0.5">Other Info</p>
                    <p className="text-white text-sm">{details.contact_other}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-800 space-y-2">
              <button
                onClick={() => { onClose(); navigate(`/messages?user=${providerId}`); }}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Chat Now
              </button>
              <p className="text-center text-gray-600 text-xs">Send a message directly through EquipLink</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ContactRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  onCopy: () => void;
  accent?: 'green' | 'blue' | 'default';
}

function ContactRow({ icon, label, value, href, external, onCopy, accent }: ContactRowProps) {
  const accentColor = accent === 'green' ? 'text-green-400 bg-green-900/30' :
                      accent === 'blue' ? 'text-blue-400 bg-blue-900/30' :
                      'text-yellow-400 bg-yellow-400/10';

  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-xs mb-0.5">{label}</p>
        <p className="text-white text-sm font-medium truncate">{value}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onCopy} className="text-gray-500 hover:text-yellow-400 transition-colors p-1">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="text-gray-500 hover:text-yellow-400 transition-colors p-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
