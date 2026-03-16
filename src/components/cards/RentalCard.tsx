import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, MessageSquare, Clock, Calendar, CheckCircle, Lock } from 'lucide-react';
import { EquipmentRental } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PaymentModal from '../ui/PaymentModal';

interface Props {
  rental: EquipmentRental;
}

export default function RentalCard({ rental }: Props) {
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
        .eq('provider_id', rental.provider_id)
        .eq('contact_type', 'rental')
        .maybeSingle()
        .then(({ data }) => setHasAccess(!!data));

      supabase
        .from('user_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('fee_type', 'rental_inquiry')
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => setPendingPayment(!!data));
    }
  }, [user, rental.provider_id]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (hasAccess || profile?.role === 'admin') {
      navigate(`/messages?user=${rental.provider_id}`);
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setPendingPayment(true);
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      transition={{ duration: 0.2 }}
      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
    >
      <div className="relative aspect-video bg-gray-800 overflow-hidden">
        {rental.image_url ? (
          <img src={rental.image_url} alt={rental.machine_model} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Truck className="w-16 h-16 text-gray-600" />
          </div>
        )}
        {rental.is_available && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-900/80 text-green-400 text-xs px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> Available
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent h-16 pointer-events-none"></div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-white font-semibold text-base">{rental.machine_model}</h3>
            <p className="text-gray-400 text-sm capitalize">{rental.machine_type}{rental.brand ? ` · ${rental.brand}` : ''}{rental.year ? ` · ${rental.year}` : ''}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-gray-400 text-sm">
          <MapPin className="w-3.5 h-3.5 text-yellow-400" />
          <span>{rental.location}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {rental.hourly_rate && (
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-0.5">
                <Clock className="w-3 h-3" /> Per Hour
              </div>
              <p className="text-yellow-400 font-bold">${rental.hourly_rate}</p>
            </div>
          )}
          {rental.daily_rate && (
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-0.5">
                <Calendar className="w-3 h-3" /> Per Day
              </div>
              <p className="text-yellow-400 font-bold">${rental.daily_rate}</p>
            </div>
          )}
        </div>

        <div className="mt-3 text-sm text-gray-500">
          <span>Provider: </span>
          <span className="text-gray-300">{rental.provider?.name || 'Unknown'}</span>
        </div>

        <button
          onClick={handleContact}
          disabled={pendingPayment}
          className={`mt-3 w-full flex items-center justify-center gap-2 font-semibold text-sm py-2 rounded-lg transition-colors ${
            hasAccess
              ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
              : pendingPayment
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
          }`}
        >
          {hasAccess ? (
            <><MessageSquare className="w-4 h-4" /> Inquire</>
          ) : pendingPayment ? (
            <><Clock className="w-4 h-4" /> Pending Approval</>
          ) : (
            <><Lock className="w-4 h-4" /> Pay to Contact</>
          )}
        </button>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        feeType="rental_inquiry"
        providerId={rental.provider_id}
        providerName={rental.provider?.name}
        onSuccess={handlePaymentSuccess}
      />

    </motion.div>
  );
}
