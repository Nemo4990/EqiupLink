import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Truck, AlertTriangle, Star, Shield, Zap, Users,
  ArrowRight, Search, MessageSquare, Award, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const SERVICES = [
  {
    icon: Wrench,
    title: 'Find Mechanics',
    desc: 'Connect with certified field technicians specialized in hydraulics, engines, electrical systems, and transmissions.',
    color: 'text-yellow-400',
    border: 'border-yellow-400/20 hover:border-yellow-400/50',
    bg: 'bg-yellow-400/10',
    link: '/marketplace/mechanics',
  },
  {
    icon: Package,
    title: 'Spare Parts',
    desc: 'Source OEM and aftermarket parts from verified suppliers. Hydraulic pumps, injectors, sensors, filters and more.',
    color: 'text-orange-400',
    border: 'border-orange-400/20 hover:border-orange-400/50',
    bg: 'bg-orange-400/10',
    link: '/marketplace/parts',
  },
  {
    icon: Truck,
    title: 'Equipment Rentals',
    desc: 'Rent excavators, bulldozers, wheel loaders, motor graders and more from trusted providers nationwide.',
    color: 'text-blue-400',
    border: 'border-blue-400/20 hover:border-blue-400/50',
    bg: 'bg-blue-400/10',
    link: '/marketplace/rentals',
  },
  {
    icon: AlertTriangle,
    title: 'Emergency Breakdown',
    desc: 'Post urgent breakdown requests and get responses from nearby mechanics within minutes.',
    color: 'text-red-400',
    border: 'border-red-400/20 hover:border-red-400/50',
    bg: 'bg-red-400/10',
    link: '/breakdown',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Describe Your Need', desc: 'Post a breakdown request, search for parts, or browse mechanics in your area.' },
  { step: '02', title: 'Get Matched', desc: 'Our platform connects you with qualified professionals based on location and specialization.' },
  { step: '03', title: 'Connect & Resolve', desc: 'Chat directly, agree on terms, and get your equipment back operational fast.' },
];

const TESTIMONIALS = [
  {
    name: 'Marcus T.',
    role: 'Site Manager',
    company: 'T&B Construction',
    text: 'Found a hydraulic specialist for our Cat D8R within 2 hours of posting. EquipLink saved us from a costly shutdown.',
    rating: 5,
  },
  {
    name: 'Sarah K.',
    role: 'Fleet Owner',
    company: 'K&R Earthmoving',
    text: 'The parts marketplace is outstanding. I sourced hard-to-find injectors for our Komatsu in the same day.',
    rating: 5,
  },
  {
    name: 'David R.',
    role: 'Independent Mechanic',
    company: 'Diesel Pro Services',
    text: 'My EquipLink profile has tripled my client base. The platform understands the heavy equipment industry.',
    rating: 5,
  },
];

export default function Landing() {
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
              <span>Emergency Response Available 24/7</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight">
              Heavy Equipment<br />
              <span className="text-yellow-400">Service Network</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-4 sm:mt-6 text-base sm:text-xl text-gray-300 leading-relaxed max-w-2xl">
              The industrial marketplace connecting contractors with certified mechanics, parts suppliers, and rental providers across major construction sites nationwide.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                to="/marketplace/mechanics"
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40"
              >
                <Search className="w-5 h-5" /> Find a Mechanic
              </Link>
              <Link
                to="/breakdown"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all duration-200"
              >
                <AlertTriangle className="w-5 h-5 text-orange-400" /> Post Breakdown
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 sm:mt-10">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">Trusted for equipment from</p>
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-400 uppercase tracking-widest mb-2">Equipment Brands We Support</h2>
            <p className="text-gray-500 text-sm">Mechanics and parts suppliers for every major manufacturer</p>
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
          <h2 className="text-3xl sm:text-4xl font-black">One Platform, Every Need</h2>
          <p className="text-gray-400 mt-3 text-base sm:text-lg">Everything the construction industry needs to keep machines running</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {SERVICES.map((service) => (
            <motion.div key={service.title} variants={fadeUp}>
              <Link to={service.link}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  className={`bg-gray-900 border ${service.border} rounded-2xl p-5 sm:p-6 h-full transition-colors cursor-pointer`}
                >
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 ${service.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <service.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${service.color}`} />
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{service.desc}</p>
                  <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${service.color}`}>
                    <span>Explore</span><ArrowRight className="w-4 h-4" />
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
            <h2 className="text-3xl sm:text-4xl font-black">How It Works</h2>
            <p className="text-gray-400 mt-3 text-base sm:text-lg">Get equipment back operational in three simple steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map((step, i) => (
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
                  <h3 className="text-white font-bold text-lg sm:text-xl mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{step.desc}</p>
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
          <h2 className="text-3xl sm:text-4xl font-black">Trusted by Industry Professionals</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="text-white font-semibold">{t.name}</p>
                <p className="text-gray-500 text-sm">{t.role} · {t.company}</p>
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 text-base sm:text-lg mb-8">Join thousands of contractors and service professionals on EquipLink</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
              >
                <Users className="w-5 h-5" /> Create Free Account
              </Link>
              <Link
                to="/marketplace/mechanics"
                className="flex items-center justify-center gap-2 border border-gray-600 hover:border-yellow-400 text-white hover:text-yellow-400 font-bold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl transition-all"
              >
                Browse Marketplace <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
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
                <h4 className="text-white font-semibold mb-1">Verified Professionals</h4>
                <p className="text-gray-400 text-sm">All mechanics and suppliers are verified and reviewed by the community.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Direct Communication</h4>
                <p className="text-gray-400 text-sm">Built-in messaging to connect with service providers without leaving the platform.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Rated & Reviewed</h4>
                <p className="text-gray-400 text-sm">Transparent ratings help you choose the best professional for your equipment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
