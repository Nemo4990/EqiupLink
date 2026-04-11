import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Bell, User, Grid3x3 as Grid3X3, Briefcase, Bot, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavTab {
  to: string;
  icon: React.ElementType;
  label: string;
  matchPaths?: string[];
  badge?: number;
}

interface BottomNavProps {
  unreadCount: number;
}

export default function BottomNav({ unreadCount }: BottomNavProps) {
  const { profile } = useAuth();
  const location = useLocation();

  const isMechanic = profile?.role === 'mechanic' || profile?.role === 'technician';
  const isOwner = profile?.role === 'owner' || profile?.role === 'customer';
  const isAdmin = profile?.role === 'admin';

  const tabs: NavTab[] = isAdmin
    ? [
        { to: '/admin', icon: Shield, label: 'Admin', matchPaths: ['/admin'] },
        { to: '/dashboard', icon: Home, label: 'Home', matchPaths: ['/dashboard'] },
        { to: '/users', icon: User, label: 'Users', matchPaths: ['/marketplace/mechanics'] },
        { to: '/notifications', icon: Bell, label: 'Alerts', matchPaths: ['/notifications'], badge: unreadCount },
        { to: '/profile', icon: User, label: 'Profile', matchPaths: ['/profile'] },
      ]
    : [
        { to: '/dashboard', icon: Home, label: 'Home', matchPaths: ['/dashboard'] },
        { to: '/search', icon: Grid3X3, label: 'Browse', matchPaths: ['/marketplace', '/search'] },
        ...(isMechanic ? [{ to: '/jobs', icon: Briefcase, label: 'Jobs', matchPaths: ['/jobs'] }] : []),
        ...(isOwner ? [{ to: '/my-requests', icon: Briefcase, label: 'Requests', matchPaths: ['/my-requests', '/requests'] }] : []),
        { to: '/messages', icon: MessageSquare, label: 'Messages', matchPaths: ['/messages'] },
        { to: '/notifications', icon: Bell, label: 'Alerts', matchPaths: ['/notifications'], badge: unreadCount },
        { to: '/ai-diagnose', icon: Bot, label: 'AI', matchPaths: ['/ai-diagnose'] },
        { to: '/profile', icon: User, label: 'Profile', matchPaths: ['/profile', '/wallet', '/subscription', '/sessions'] },
      ];

  const isActive = (tab: NavTab) => {
    const paths = tab.matchPaths ?? [tab.to];
    return paths.some(p => location.pathname.startsWith(p));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors min-w-0 ${
                active ? 'text-yellow-400' : 'text-gray-500'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-b-full" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
