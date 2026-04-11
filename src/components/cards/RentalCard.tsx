import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, Calendar, CheckCircle } from 'lucide-react';
import { EquipmentRental } from '../../types';
import ContactUnlock from '../ui/ContactUnlock';
import ViralShareModal from '../ui/ViralShareModal';

interface Props {
  rental: EquipmentRental;
}

export default function RentalCard({ rental }: Props) {
  const [showViralShare, setShowViralShare] = useState(false);

  return (
    <>
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
                <p className="text-yellow-400 font-bold">{rental.hourly_rate} ETB</p>
              </div>
            )}
            {rental.daily_rate && (
              <div className="bg-gray-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-0.5">
                  <Calendar className="w-3 h-3" /> Per Day
                </div>
                <p className="text-yellow-400 font-bold">{rental.daily_rate} ETB</p>
              </div>
            )}
          </div>

          <div className="mt-3 text-sm text-gray-500">
            <span>Provider: </span>
            <span className="text-gray-300">{rental.provider?.name || 'Unknown'}</span>
          </div>

          <div className="mt-3">
            <ContactUnlock
              targetUserId={rental.provider_id}
              targetName={rental.provider?.name || 'Provider'}
              resourceType="rental"
              contactInfo={{
                name: rental.provider?.name || '',
                phone: rental.provider?.contact_phone,
                email: rental.provider?.contact_email,
                address: rental.provider?.contact_address,
                telegram: rental.provider?.contact_telegram,
                whatsapp: rental.provider?.contact_whatsapp,
              }}
              onUnlocked={() => setShowViralShare(true)}
            />
          </div>
        </div>
      </motion.div>

      <ViralShareModal open={showViralShare} onClose={() => setShowViralShare(false)} />
    </>
  );
}
