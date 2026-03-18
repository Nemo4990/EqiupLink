import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, MessageSquare, ChevronDown, Wrench, LogOut, User, Settings, Search, Briefcase, Shield, Wallet, Crown, Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
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
    if (profile) {
      setWalletBalance(profile.wallet_balance ?? 0);
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setDropdownOpen(false);
  };

  const isLanding = location.pathname === '/';
  const navBg = scrolled || !isLanding ? 'bg-gray-950 shadow-lg' : 'bg-transparent';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 select-none group">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shadow-md shadow-yellow-400/20 group-hover:bg-yellow-300 transition-colors">
              <Wrench className="w-4 h-4 text-gray-900 -rotate-12" />
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-white">Equip</span><span className="text-yellow-400">Link</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/marketplace/mechanics" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">Find Mechanics</Link>
            <Link to="/marketplace/parts" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">Spare Parts</Link>
            <Link to="/marketplace/rentals" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">Rentals</Link>
            <Link to="/breakdown" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">Breakdown Requests</Link>
            <Link to="/forum" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm font-medium">Forum</Link>
            <Link to="/ai-diagnose" className="text-gray-300 hover:text-teal-400 transition-colors text-sm font-medium flex items-center gap-1"><Bot className="w-3.5 h-3.5" />AI Diagnose</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/search" className="text-gray-300 hover:text-yellow-400 transition-colors p-2">
              <Search className="w-5 h-5" />
            </Link>
            {user ? (
              <>
                {(profile?.role === 'mechanic' || profile?.role === 'technician') && (
                  <Link to="/jobs" className="text-gray-300 hover:text-yellow-400 transition-colors p-2" title="Jobs">
                    <Briefcase className="w-5 h-5" />
                  </Link>
                )}
                {(profile?.role === 'owner' || profile?.role === 'customer') && (
                  <Link to="/my-requests" className="text-gray-300 hover:text-yellow-400 transition-colors p-2" title="My Requests">
                    <Briefcase className="w-5 h-5" />
                  </Link>
                )}

                <Link
                  to="/wallet"
                  className="flex items-center gap-1.5 text-xs font-semibold border border-gray-700 hover:border-yellow-400/60 text-gray-300 hover:text-yellow-400 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="My Wallet"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {walletBalance !== null ? `${walletBalance.toLocaleString()} ETB` : '—'}
                </Link>

                <Link to="/messages" className="relative text-gray-300 hover:text-yellow-400 transition-colors p-2">
                  <MessageSquare className="w-5 h-5" />
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
                        className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
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
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                          <User className="w-4 h-4" /> Dashboard
                        </Link>
                        <Link to="/wallet" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                          <Wallet className="w-4 h-4" /> My Wallet
                        </Link>
                        <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Link to="/sessions" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                          <Shield className="w-4 h-4" /> Security
                        </Link>
                        {profile?.role === 'admin' && (
                          <Link to="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
                            <Settings className="w-4 h-4" /> Admin Panel
                          </Link>
                        )}
                        <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-gray-800 text-sm transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Sign In</Link>
                <Link to="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-gray-950 border-t border-gray-800"
          >
            <div className="px-4 py-4 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
              <Link to="/marketplace/mechanics" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Find Mechanics</Link>
              <Link to="/marketplace/parts" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Spare Parts</Link>
              <Link to="/marketplace/rentals" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Rentals</Link>
              <Link to="/breakdown" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Breakdown Requests</Link>
              <Link to="/forum" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Forum</Link>
              <Link to="/ai-diagnose" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 text-gray-300 hover:text-teal-400 py-2 text-sm font-medium"><Bot className="w-3.5 h-3.5" />AI Diagnose</Link>
              <Link to="/search" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Search</Link>
              {user ? (
                <>
                  <Link to="/wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-yellow-400 py-2 text-sm font-semibold">
                    <Wallet className="w-4 h-4" />
                    {walletBalance !== null ? `${walletBalance.toLocaleString()} ETB` : 'My Wallet'}
                  </Link>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Dashboard</Link>
                  {(profile?.role === 'mechanic' || profile?.role === 'technician') && (
                    <Link to="/jobs" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Jobs</Link>
                  )}
                  {(profile?.role === 'owner' || profile?.role === 'customer') && (
                    <Link to="/my-requests" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">My Requests</Link>
                  )}
                  <Link to="/messages" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Messages</Link>
                  <button onClick={() => { handleSignOut(); setMenuOpen(false); }} className="block text-red-400 py-2 text-sm font-medium">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-yellow-400 py-2 text-sm font-medium">Sign In</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="block bg-yellow-400 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg text-center">Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
