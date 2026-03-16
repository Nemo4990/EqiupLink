import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MessageSquare, Tag, Layers, Lock, Clock } from 'lucide-react';
import { PartsListing } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PaymentModal from '../ui/PaymentModal';

interface Props {
  part: PartsListing;
}

const CATEGORY_COLORS: Record<string, string> = {
  hydraulics: 'bg-blue-900/50 text-blue-300',
  engine: 'bg-red-900/50 text-red-300',
  electrical: 'bg-yellow-900/50 text-yellow-300',
  filters: 'bg-green-900/50 text-green-300',
  sensors: 'bg-cyan-900/50 text-cyan-300',
  valves: 'bg-orange-900/50 text-orange-300',
};

export default function PartCard({ part }: Props) {
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
        .eq('provider_id', part.supplier_id)
        .eq('contact_type', 'supplier')
        .maybeSingle()
        .then(({ data }) => setHasAccess(!!data));

      supabase
        .from('user_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('fee_type', 'parts_inquiry')
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => setPendingPayment(!!data));
    }
  }, [user, part.supplier_id]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (hasAccess || profile?.role === 'admin') {
      navigate(`/messages?user=${part.supplier_id}`);
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
        {part.image_url ? (
          <img src={part.image_url} alt={part.part_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-600" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[part.category] || 'bg-gray-800 text-gray-300'}`}>
            {part.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-base">{part.part_name}</h3>
        {part.part_number && (
          <p className="text-gray-500 text-xs mt-0.5">Part #: {part.part_number}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-2xl font-bold text-yellow-400">${part.price.toFixed(2)}</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Layers className="w-3.5 h-3.5" />
            <span>{part.stock_quantity} in stock</span>
          </div>
        </div>

        {part.machine_compatibility.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Tag className="w-3 h-3" /> Compatible with:
            </div>
            <div className="flex flex-wrap gap-1">
              {part.machine_compatibility.slice(0, 3).map((m) => (
                <span key={m} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{m}</span>
              ))}
              {part.machine_compatibility.length > 3 && (
                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">+{part.machine_compatibility.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 text-sm text-gray-500">
          <span>Supplier: </span>
          <span className="text-gray-300">{part.supplier?.name || 'Unknown'}</span>
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
            <><MessageSquare className="w-4 h-4" /> Contact Supplier</>
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
        feeType="parts_inquiry"
        providerId={part.supplier_id}
        providerName={part.supplier?.name}
        onSuccess={handlePaymentSuccess}
      />
    </motion.div>
  );
}
