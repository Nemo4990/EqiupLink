import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ui/ProtectedRoute';
import { AlertTriangle } from 'lucide-react';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Mechanics from './pages/marketplace/Mechanics';
import Parts from './pages/marketplace/Parts';
import Rentals from './pages/marketplace/Rentals';
import BreakdownList from './pages/breakdown/BreakdownList';
import PostBreakdown from './pages/breakdown/PostBreakdown';
import Messages from './pages/messages/Messages';
import Profile from './pages/profile/Profile';
import MechanicDetail from './pages/profile/MechanicDetail';
import Notifications from './pages/Notifications';
import Admin from './pages/admin/Admin';
import NewPartListing from './pages/listings/NewPartListing';
import NewRentalListing from './pages/listings/NewRentalListing';
import MachineDetail from './pages/machines/MachineDetail';
import Jobs from './pages/jobs/Jobs';
import PostServiceRequest from './pages/requests/PostServiceRequest';
import MyRequests from './pages/requests/MyRequests';
import WriteReview from './pages/reviews/WriteReview';
import Search from './pages/Search';
import SubscriptionPage from './pages/subscription/Subscription';
import WalletPage from './pages/wallet/Wallet';
import Commissions from './pages/commissions/Commissions';

function IdleWarningBanner() {
  const { idleWarning, resetIdleTimer, signOut } = useAuth();
  if (!idleWarning) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-900/95 border-t border-orange-700 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
        <p className="text-white text-sm font-medium">You've been idle for a while. You'll be logged out in 2 minutes.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={resetIdleTimer}
          className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          Stay Logged In
        </button>
        <button
          onClick={signOut}
          className="border border-orange-600 hover:border-orange-400 text-orange-300 hover:text-white font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          Sign Out Now
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <IdleWarningBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/marketplace/mechanics" element={<Mechanics />} />
        <Route path="/marketplace/parts" element={<Parts />} />
        <Route path="/marketplace/rentals" element={<Rentals />} />
        <Route path="/mechanic/:userId" element={<MechanicDetail />} />
        <Route path="/breakdown" element={<BreakdownList />} />
        <Route path="/search" element={<Search />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/breakdown/new" element={<ProtectedRoute><PostBreakdown /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/machine/:machineId" element={<ProtectedRoute><MachineDetail /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
        <Route path="/requests/new" element={<ProtectedRoute><PostServiceRequest /></ProtectedRoute>} />
        <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
        <Route path="/review/:mechanicId" element={<ProtectedRoute><WriteReview /></ProtectedRoute>} />
        <Route path="/review/:mechanicId/:requestId" element={<ProtectedRoute><WriteReview /></ProtectedRoute>} />
        <Route path="/listings/new-part" element={<ProtectedRoute requiredRole="supplier"><NewPartListing /></ProtectedRoute>} />
        <Route path="/listings/new-rental" element={<ProtectedRoute requiredRole="rental_provider"><NewRentalListing /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
      </Routes>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: { iconTheme: { primary: '#facc15', secondary: '#111827' } },
          }}
        />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
