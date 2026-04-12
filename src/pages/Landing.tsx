import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Truck, AlertTriangle, Star, Shield, Zap, Users,
  ArrowRight, Search, MessageSquare, Award, ChevronLeft, ChevronRight,
  LayoutDashboard, PlusCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/i18n/LanguageContext';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const HERO_SLIDES = [
  {
    url: 'https://images.pexels.com/photos/3197978/pexels-photo-3197978.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'CAT Excavator at Work',
  },
  {
    url: 'https://images.pexels.com/photos/2449603/pexels-photo-2449603.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Yellow Excavator on Site',
  },
  {
    url: 'https://images.pexels.com/photos/1238864/pexels-photo-1238864.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Excavator Fleet with Front End Loader',
  },
  {
    url: 'https://images.pexels.com/photos/259966/pexels-photo-259966.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Bulldozer on Construction Site',
  },
  {
    url: 'https://images.pexels.com/photos/3998410/pexels-photo-3998410.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Heavy Construction Equipment',
  },
  {
    url: 'https://images.pexels.com/photos/129544/pexels-photo-129544.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Yellow Heavy Equipment Loader',
  },
];

const BRANDS = [
  {
    name: 'CAT',
    full: 'Caterpillar',
    color: 'text-yellow-400',
    accent: 'bg-yellow-400',
    logoColor: '#FFCD11',
    desc: 'Mining & Construction',
  },
  {
    name: 'KOMATSU',
    full: 'Komatsu',
    color: 'text-blue-400',
    accent: 'bg-blue-400',
    logoColor: '#003087',
    desc: 'Construction Equipment',
  },
  {
    name: 'JOHN DEERE',
    full: 'John Deere',
    color: 'text-green-400',
    accent: 'bg-green-500',
    logoColor: '#367C2B',
    desc: 'Agriculture & Construction',
  },
  {
    name: 'HITACHI',
    full: 'Hitachi',
    color: 'text-red-400',
    accent: 'bg-red-500',
    logoColor: '#E60012',
    desc: 'Excavators & Mining',
  },
  {
    name: 'VOLVO CE',
    full: 'Volvo Construction',
    color: 'text-sky-400',
    accent: 'bg-sky-400',
    logoColor: '#003057',
    desc: 'Road & Earth Moving',
  },
  {
    name: 'LIEBHERR',
    full: 'Liebherr',
    color: 'text-orange-400',
    accent: 'bg-orange-400',
    logoColor: '#F5821E',
    desc: 'Cranes & Heavy Lift',
  },
  {
    name: 'DOOSAN',
    full: 'Doosan Bobcat',
    color: 'text-cyan-400',
    accent: 'bg-cyan-400',
    logoColor: '#0075BF',
    desc: 'Compact Equipment',
  },
  {
    name: 'JCB',
    full: 'JCB',
    color: 'text-amber-400',
    accent: 'bg-amber-400',
    logoColor: '#FCBE00',
    desc: 'Backhoes & Loaders',
  },
  {
    name: 'MANITOWOC',
    full: 'Manitowoc',
    color: 'text-teal-400',
    accent: 'bg-teal-400',
    logoColor: '#005C97',
    desc: 'Lattice Boom Cranes',
  },
  {
    name: 'SANDVIK',
    full: 'Sandvik',
    color: 'text-rose-400',
    accent: 'bg-rose-400',
    logoColor: '#C0392B',
    desc: 'Drilling & Mining',
  },
];

interface SiteStat {
  id: string;
  stat_key: string;
  stat_value: string;
  stat_label: string;
  sort_order: number;
}

const DEFAULT_STATS = [
  { stat_value: '12,000+', stat_label: 'Certified Mechanics' },
  { stat_value: '45,000+', stat_label: 'Parts Listed' },
  { stat_value: '3,200+', stat_label: 'Equipment for Rent' },
  { stat_value: '98%', stat_label: 'Satisfaction Rate' },
];

const SERVICE_META = [
  { icon: Wrench, color: 'text-yellow-400', border: 'border-yellow-400/20 hover:border-yellow-400/50', bg: 'bg-yellow-400/10', link: '/marketplace/mechanics', titleKey: 'featFindMechanics', descKey: 'featFindMechanicsDesc' },
  { icon: Package, color: 'text-orange-400', border: 'border-orange-400/20 hover:border-orange-400/50', bg: 'bg-orange-400/10', link: '/marketplace/parts', titleKey: 'featSpareParts', descKey: 'featSparePartsDesc' },
  { icon: Truck, color: 'text-blue-400', border: 'border-blue-400/20 hover:border-blue-400/50', bg: 'bg-blue-400/10', link: '/marketplace/rentals', titleKey: 'featRentals', descKey: 'featRentalsDesc' },
  { icon: AlertTriangle, color: 'text-red-400', border: 'border-red-400/20 hover:border-red-400/50', bg: 'bg-red-400/10', link: '/breakdown', titleKey: 'featBreakdown', descKey: 'featBreakdownDesc' },
] as const;

const TESTIMONIAL_META = [
  { name: 'Marcus T.', role: 'Site Manager', company: 'T&B Construction', textKey: 'testimonial1', rating: 5 },
  { name: 'Sarah K.', role: 'Fleet Owner', company: 'K&R Earthmoving', textKey: 'testimonial2', rating: 5 },
  { name: 'David R.', role: 'Independent Mechanic', company: 'Diesel Pro Services', textKey: 'testimonial3', rating: 5 },
] as const;

export default function Landing() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [slideIndex, setSlideIndex] = useState(0);
  const [siteStats, setSiteStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    const timer = setInterval(() => setSlideIndex(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase
      .from('site_stats')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSiteStats(data.map((s: SiteStat) => ({ stat_value: s.stat_value, stat_label: s.stat_label })));
        }
      });
  }, []);

  return (
    <div className="bg-gray-950 text-white">
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="absolute inset-0"
          >
            <img
              src={HERO_SLIDES[slideIndex].url}
              alt={HERO_SLIDES[slideIndex].caption}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-gray-950/30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/30"></div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 flex items-center gap-2 z-20">
          <button
            onClick={() => setSlideIndex(i => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex gap-1.5">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === slideIndex ? 'w-6 bg-yellow-400' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setSlideIndex(i => (i + 1) % HERO_SLIDES.length)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 w-full">
          <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-3xl">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-5 sm:mb-6">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>{t.landing.emergencyBadge}</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight">
              {t.landing.heroTitle1}<br />
              <span className="text-yellow-400">{t.landing.heroTitle2}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-4 sm:mt-6 text-base sm:text-xl text-gray-300 leading-relaxed max-w-2xl">
              {t.landing.heroSubtitle}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                to="/marketplace/mechanics"
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40"
              >
                <Search className="w-5 h-5" /> {t.landing.findMechanic}
              </Link>
              <Link
                to="/breakdown"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all duration-200"
              >
                <AlertTriangle className="w-5 h-5 text-orange-400" /> {t.landing.postBreakdown}
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 sm:mt-10">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">{t.landing.trustedFor}</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {BRANDS.slice(0, 8).map((brand) => (
                  <div key={brand.name} className="flex items-center gap-1.5 bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg px-2.5 sm:px-3 py-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${brand.accent}`}></div>
                    <span className={`text-xs sm:text-sm font-bold ${brand.color}`}>{brand.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none"></div>
      </section>

      <section className="bg-gray-950 border-b border-gray-800 py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {siteStats.map((stat) => (
              <div key={stat.stat_label} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-yellow-400">{stat.stat_value}</div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">{stat.stat_label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-gray-900/30 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-400 uppercase tracking-widest mb-2">{t.landing.brandsTitle}</h2>
            <p className="text-gray-500 text-sm">{t.landing.brandsSubtitle}</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {BRANDS.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg ${brand.accent} flex items-center justify-center font-black text-gray-900 text-sm`}>
                  {brand.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-black text-sm ${brand.color}`}>{brand.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{brand.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-black">{t.landing.platformTitle}</h2>
          <p className="text-gray-400 mt-3 text-base sm:text-lg">{t.landing.platformSubtitle}</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {SERVICE_META.map((service) => (
            <motion.div key={service.titleKey} variants={fadeUp}>
              <Link to={service.link}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  className={`bg-gray-900 border ${service.border} rounded-2xl p-5 sm:p-6 h-full transition-colors cursor-pointer`}
                >
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 ${service.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <service.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${service.color}`} />
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2">{t.landing[service.titleKey]}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{t.landing[service.descKey]}</p>
                  <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${service.color}`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="py-14 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1238864/pexels-photo-1238864.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Excavators and heavy machinery on construction site"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-gray-950"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-black">{t.landing.howTitle}</h2>
            <p className="text-gray-400 mt-3 text-base sm:text-lg">{t.landing.howSubtitle}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {([
              { step: '01', titleKey: 'step1Title', descKey: 'step1Desc' },
              { step: '02', titleKey: 'step2Title', descKey: 'step2Desc' },
              { step: '03', titleKey: 'step3Title', descKey: 'step3Desc' },
            ] as const).map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 sm:p-8 text-center">
                  <div className="text-5xl sm:text-6xl font-black text-yellow-400/20 mb-4">{step.step}</div>
                  <h3 className="text-white font-bold text-lg sm:text-xl mb-3">{t.landing[step.titleKey]}</h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{t.landing[step.descKey]}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-yellow-400" />
                  </div>
                )}
                {i < 2 && (
                  <div className="md:hidden flex justify-center mt-4 mb-2">
                    <ArrowRight className="w-5 h-5 text-yellow-400 rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-black">{t.landing.trustedTitle}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIAL_META.map((tm, i) => (
            <motion.div
              key={tm.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: tm.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">"{t.landing[tm.textKey]}"</p>
              <div>
                <p className="text-white font-semibold">{tm.name}</p>
                <p className="text-gray-500 text-sm">{tm.role} · {tm.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-yellow-400/10 border-y border-yellow-400/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {user ? (
              <>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">{t.landing.welcomeBack}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!</h2>
                <p className="text-gray-300 text-base sm:text-lg mb-8">{t.landing.welcomeSubtitle}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                  >
                    <LayoutDashboard className="w-5 h-5" /> {t.landing.goToDashboard}
                  </Link>
                  {(profile?.role === 'supplier') && (
                    <Link
                      to="/listings/new-part"
                      className="flex items-center justify-center gap-2 border border-gray-600 hover:border-yellow-400 text-white hover:text-yellow-400 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                    >
                      <PlusCircle className="w-5 h-5" /> {t.landing.listPart}
                    </Link>
                  )}
                  {(profile?.role === 'rental_provider') && (
                    <Link
                      to="/listings/new-rental"
                      className="flex items-center justify-center gap-2 border border-gray-600 hover:border-yellow-400 text-white hover:text-yellow-400 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                    >
                      <PlusCircle className="w-5 h-5" /> {t.landing.listEquipment}
                    </Link>
                  )}
                  {(profile?.role !== 'supplier' && profile?.role !== 'rental_provider') && (
                    <Link
                      to="/search"
                      className="flex items-center justify-center gap-2 border border-gray-600 hover:border-yellow-400 text-white hover:text-yellow-400 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                    >
                      {t.landing.browseMarketplace} <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">{t.landing.ctaTitle}</h2>
                <p className="text-gray-300 text-base sm:text-lg mb-8">{t.landing.ctaSubtitle}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                  >
                    <Users className="w-5 h-5" /> {t.landing.createFreeAccount}
                  </Link>
                  <Link
                    to="/search"
                    className="flex items-center justify-center gap-2 border border-gray-600 hover:border-yellow-400 text-white hover:text-yellow-400 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
                  >
                    {t.landing.browseMarketplace} <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-gray-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">{t.landing.trust1Title}</h4>
                <p className="text-gray-400 text-sm">{t.landing.trust1Desc}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">{t.landing.trust2Title}</h4>
                <p className="text-gray-400 text-sm">{t.landing.trust2Desc}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">{t.landing.trust3Title}</h4>
                <p className="text-gray-400 text-sm">{t.landing.trust3Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
