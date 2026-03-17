import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ui/ProtectedRoute';

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
import WriteReview from './pages/reviews/WriteReview';
import Search from './pages/Search';
import SubscriptionPage from './pages/subscription/Subscription';
import WalletPage from './pages/wallet/Wallet';
import Commissions from './pages/commissions/Commissions';

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
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
