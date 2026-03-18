import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, MessageSquare, CheckCircle, Lock, Phone } from 'lucide-react';
import { MechanicProfile } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PaymentModal from '../ui/PaymentModal';

interface Props {
  mechanic: MechanicProfile;
}

const SPECIALIZATION_COLORS: Record<string, string> = {
  hydraulics: 'bg-blue-900/50 text-blue-300',
  engine: 'bg-red-900/50 text-red-300',
  electrical: 'bg-yellow-900/50 text-yellow-300',
  transmission: 'bg-green-900/50 text-green-300',
};

export default function MechanicCard({ mechanic }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('contact_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', mechanic.user_id)
        .eq('contact_type', 'mechanic')
        .maybeSingle()
        .then(({ data }) => setHasAccess(!!data));

      supabase
        .from('user_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('fee_type', 'mechanic_contact')
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => setPendingPayment(!!data));
    }
  }, [user, mechanic.user_id]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (hasAccess || profile?.role === 'admin') {
      navigate(`/messages?user=${mechanic.user_id}`);
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setPendingPayment(true);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = (mechanic.profile as any)?.contact_whatsapp || (mechanic.profile as any)?.contact_phone || (mechanic.profile as any)?.phone;
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    const name = mechanic.profile?.name || 'Mechanic';
    const msg = encodeURIComponent(`Hello ${name}, I found your profile on EquipLink and would like to discuss a job opportunity.`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  const whatsappPhone = (mechanic.profile as any)?.contact_whatsapp || (mechanic.profile as any)?.contact_phone || (mechanic.profile as any)?.phone;

  return (
    <>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
        transition={{ duration: 0.2 }}
        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer"
        onClick={() => navigate(`/mechanic/${mechanic.user_id}`)}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              {mechanic.profile?.avatar_url ? (
                <img src={mechanic.profile.avatar_url} alt={mechanic.profile.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-xl">
                  {mechanic.profile?.name?.charAt(0).toUpperCase() || 'M'}
                </div>
              )}
              {mechanic.is_available && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg truncate">{mechanic.profile?.name || 'Mechanic'}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">{mechanic.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({mechanic.total_reviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{mechanic.service_area || mechanic.profile?.location || 'Location not set'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {mechanic.specializations.slice(0, 3).map((spec) => (
              <span key={spec} className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SPECIALIZATION_COLORS[spec] || 'bg-gray-800 text-gray-300'}`}>
                {spec}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>{mechanic.years_experience} yrs exp</span>
            </div>
            {mechanic.hourly_rate && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="text-yellow-400 font-semibold">${mechanic.hourly_rate}/hr</span>
              </div>
            )}
          </div>

          {mechanic.supported_brands.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {mechanic.supported_brands.slice(0, 3).map((brand) => (
                <span key={brand} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                  {brand}
                </span>
              ))}
              {mechanic.supported_brands.length > 3 && (
                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">+{mechanic.supported_brands.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleContact}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold text-sm py-2 rounded-lg transition-colors ${
                hasAccess
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                  : pendingPayment
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
              }`}
              disabled={pendingPayment}
            >
              {hasAccess ? (
                <><MessageSquare className="w-4 h-4" /> Message</>
              ) : pendingPayment ? (
                <><Clock className="w-4 h-4" /> Pending</>
              ) : (
                <><Lock className="w-4 h-4" /> Pay to Contact</>
              )}
            </button>
            {hasAccess && whatsappPhone && (
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                title="Chat on WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
          </div>

          {mechanic.is_available && (
            <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Available now</span>
            </div>
          )}
        </div>
      </motion.div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        feeType="mechanic_contact"
        providerId={mechanic.user_id}
        providerName={mechanic.profile?.name}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
