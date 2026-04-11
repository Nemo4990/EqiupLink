import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Tag, Layers, Award, ChevronLeft, ChevronRight, Phone, MessageSquare } from 'lucide-react';
import { PartsListing } from '../../types';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);

  const images: string[] = part.image_urls?.length
    ? part.image_urls
    : part.image_url
    ? [part.image_url]
    : [];

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex(i => (i - 1 + images.length) % images.length);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex(i => (i + 1) % images.length);
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      transition={{ duration: 0.2 }}
      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col"
    >
      <div className="relative aspect-video bg-gray-800 overflow-hidden group">
        {images.length > 0 ? (
          <>
            <img
              src={images[imageIndex]}
              alt={`${part.part_name} photo ${imageIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-200"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setImageIndex(i); }}
                      className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md z-10">
                  {imageIndex + 1}/{images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-600" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[part.category] || 'bg-gray-800 text-gray-300'}`}>
            {part.category}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-semibold text-base">{part.part_name}</h3>
        {part.part_number && (
          <p className="text-gray-500 text-xs mt-0.5">Part #: {part.part_number}</p>
        )}

        {part.description && (
          <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{part.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
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
          <div className="text-sm text-gray-500 min-w-0 truncate">
            <span>By </span>
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate(`/supplier/${part.supplier_id}/contact`)}
            className="flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm py-2.5 rounded-xl transition-colors"
          >
            <Phone className="w-4 h-4" /> Contact
          </button>
          <button
            onClick={() => navigate(`/messages?user=${part.supplier_id}`)}
            className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold text-sm py-2.5 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
        </div>
      </div>
    </motion.div>
  );
}
