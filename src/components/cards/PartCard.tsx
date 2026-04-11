import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Tag, Layers, Award } from 'lucide-react';
import { PartsListing } from '../../types';
import ContactUnlock from '../ui/ContactUnlock';
import ViralShareModal from '../ui/ViralShareModal';

interface Props {
  part: PartsListing;
}

const BADGE_STYLES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-900/30', icon: '🥉' },
  silver: { label: 'Silver', color: 'text-slate-300', bg: 'bg-slate-800/50', icon: '🥈' },
  gold: { label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: '🥇' },
  platinum: { label: 'Platinum', color: 'text-cyan-300', bg: 'bg-cyan-900/30', icon: '💎' },
};

const CATEGORY_COLORS: Record<string, string> = {
  hydraulics: 'bg-blue-900/50 text-blue-300',
  engine: 'bg-red-900/50 text-red-300',
  electrical: 'bg-yellow-900/50 text-yellow-300',
  filters: 'bg-green-900/50 text-green-300',
  sensors: 'bg-cyan-900/50 text-cyan-300',
  valves: 'bg-orange-900/50 text-orange-300',
};

export default function PartCard({ part }: Props) {
  const [showViralShare, setShowViralShare] = useState(false);

  return (
    <>
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
            <span className="text-2xl font-bold text-yellow-400">{part.price.toLocaleString()} ETB</span>
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

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-500 min-w-0">
              <span>Supplier: </span>
              <span className="text-gray-300">{part.supplier?.name || 'Unknown'}</span>
            </div>
            {(() => {
              const badge = (part.supplier as Record<string, unknown>)?.merchant_badge as string | undefined;
              const cfg = badge ? BADGE_STYLES[badge] : null;
              if (!cfg) return null;
              return (
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                  <Award className="w-3 h-3" /> {cfg.icon} {cfg.label}
                </span>
              );
            })()}
          </div>

          <div className="mt-3">
            <ContactUnlock
              targetUserId={part.supplier_id}
              targetName={part.supplier?.name || 'Supplier'}
              resourceType="part"
              contactInfo={{
                name: part.supplier?.name || '',
                phone: part.supplier?.contact_phone,
                email: part.supplier?.contact_email,
                address: part.supplier?.contact_address,
                telegram: part.supplier?.contact_telegram,
                whatsapp: part.supplier?.contact_whatsapp,
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
