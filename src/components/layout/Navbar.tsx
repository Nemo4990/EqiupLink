import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, ChevronDown, Wrench, LogOut, User, Settings, Search, Briefcase, Shield, Wallet, Crown, Bot, Gift, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { supabase } from '../../lib/supabase';
import BottomNav from './BottomNav';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isPro = profile?.subscription_tier === 'pro';
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count ?? 0));

      supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setWalletBalance(data?.balance ?? 0));
    }
  }, [user]);

  useEffect(() => {
    if (profile) setWalletBalance(profile.wallet_balance ?? 0);
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isLanding = location.pathname === '/';
  const navBg = scrolled || !isLanding ? 'bg-gray-950 shadow-lg' : 'bg-transparent';

  const LangToggle = ({ compact = false }: { compact?: boolean }) => (
    <button
      onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
      title={language === 'en' ? 'Switch to Amharic' : 'Switch to English'}
      className={`flex items-center gap-1.5 transition-colors font-semibold text-xs border rounded-lg px-2 py-1 ${
        compact
          ? 'text-gray-300 border-gray-700 hover:border-yellow-400/60 hover:text-yellow-400'
          : 'text-gray-300 border-gray-700 hover:border-yellow-400/60 hover:text-yellow-400'
      }`}
    >
      <Languages className="w-3.5 h-3.5" />
      {language === 'en' ? 'አማ' : 'EN'}
    </button>
  );

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">

            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 select-none group">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shadow-md shadow-yellow-400/20 group-hover:bg-yellow-300 transition-colors">
                <Wrench className="w-4 h-4 text-gray-900 -rotate-12" />
              </div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-white">Equip</span><span className="text-yellow-400">Link</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/marketplace/mechanics" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">{t.nav.findMechanics}</Link>
              <Link to="/marketplace/parts" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">{t.nav.spareParts}</Link>
              <Link to="/marketplace/rentals" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">{t.nav.rentals}</Link>
              <Link to="/breakdown" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">{t.nav.breakdown}</Link>
              <Link to="/forum" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">{t.nav.forum}</Link>
              <Link to="/ai-diagnose" className="text-gray-300 hover:text-teal-400 transition-colors text-sm font-medium flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />{t.nav.aiDiagnose}
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <LangToggle />
              <Link to="/search" className="text-gray-300 hover:text-yellow-400 transition-colors p-2">
                <Search className="w-5 h-5" />
              </Link>
              {user ? (
                <>
                  {(profile?.role === 'mechanic' || profile?.role === 'technician') && (
                    <Link to="/jobs" className="text-gray-300 hover:text-yellow-400 transition-colors p-2" title={t.nav.jobs}>
                      <Briefcase className="w-5 h-5" />
                    </Link>
                  )}
                  {(profile?.role === 'owner' || profile?.role === 'customer') && (
                    <Link to="/my-requests" className="text-gray-300 hover:text-yellow-400 transition-colors p-2" title={t.nav.myRequests}>
                      <Briefcase className="w-5 h-5" />
                    </Link>
                  )}
                  <Link
                    to="/wallet"
                    className="flex items-center gap-1.5 text-xs font-semibold border border-gray-700 hover:border-yellow-400/60 text-gray-300 hover:text-yellow-400 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {walletBalance !== null ? `${walletBalance.toLocaleString()} ETB` : '—'}
                  </Link>
                  <Link to="/notifications" className="relative text-gray-300 hover:text-yellow-400 transition-colors p-2">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-sm">
                          {profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {isPro && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                            <Crown className="w-2.5 h-2.5 text-gray-900" />
                          </span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                              <p className="text-white text-sm font-medium">{profile?.name}</p>
                              {isPro && (
                                <span className="flex items-center gap-0.5 text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-semibold">
                                  <Crown className="w-2.5 h-2.5" /> Pro
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs capitalize">{profile?.role?.replace('_', ' ')}</p>
                            <p className="text-yellow-400 text-xs font-semibold mt-0.5">{walletBalance?.toLocaleString() ?? 0} ETB</p>
                          </div>
                          <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                            <User className="w-4 h-4" /> {t.nav.dashboard}
                          </Link>
                          <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                            <Wallet className="w-4 h-4" /> {t.nav.wallet}
                          </Link>
                          <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                            <Settings className="w-4 h-4" /> {t.nav.settings}
                          </Link>
                          <Link to="/referrals" className="flex items-center gap-2 px-4 py-2 text-yellow-400 hover:bg-gray-800 text-sm transition-colors">
                            <Gift className="w-4 h-4" /> {t.nav.inviteEarn}
                          </Link>
                          <Link to="/sessions" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                            <Shield className="w-4 h-4" /> {t.nav.security}
                          </Link>
                          {profile?.role === 'admin' && (
                            <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                              <Settings className="w-4 h-4" /> {t.nav.adminPanel}
                            </Link>
                          )}
                          <div className="px-4 py-2 border-t border-gray-800">
                            <button
                              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
                              className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 text-sm transition-colors w-full"
                            >
                              <Languages className="w-4 h-4" />
                              {language === 'en' ? 'አማርኛ' : 'English'}
                            </button>
                          </div>
                          <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-gray-800 text-sm transition-colors">
                            <LogOut className="w-4 h-4" /> {t.nav.signOut}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">{t.nav.signIn}</Link>
                  <Link to="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                    {t.nav.getStarted}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile right side */}
            <div className="flex md:hidden items-center gap-1">
              {user ? (
                <>
                  <Link to="/search" className="p-2.5 text-gray-300 hover:text-yellow-400 transition-colors">
                    <Search className="w-5 h-5" />
                  </Link>
                  <Link to="/wallet" className="flex items-center gap-1 text-xs font-semibold text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-lg">
                    <Wallet className="w-3 h-3" />
                    {walletBalance !== null ? `${walletBalance.toLocaleString()}` : '—'}
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <LangToggle compact />
                  <button
                    className="p-2.5 text-gray-300 hover:text-white"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                  >
                    {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu for non-logged-in users only */}
        <AnimatePresence>
          {!user && menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-gray-950 border-t border-gray-800 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {[
                  { to: '/marketplace/mechanics', label: t.nav.findMechanics },
                  { to: '/marketplace/parts', label: t.nav.spareParts },
                  { to: '/marketplace/rentals', label: t.nav.rentals },
                  { to: '/breakdown', label: t.nav.breakdownRequests },
                  { to: '/forum', label: t.nav.forum },
                ].map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="block text-gray-300 hover:text-yellow-400 py-3 px-2 text-sm font-medium border-b border-gray-800/50 last:border-0"
                  >
                    {label}
                  </Link>
                ))}
                <div className="pt-3 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center border border-gray-700 text-gray-300 font-semibold text-sm py-3 rounded-xl"
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center bg-yellow-400 text-gray-900 font-bold text-sm py-3 rounded-xl"
                  >
                    {t.nav.getStartedFree}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {user && <BottomNav unreadCount={unreadCount} />}
    </>
  );
}
