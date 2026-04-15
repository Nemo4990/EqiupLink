import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PromoNotification from './components/ui/PromoNotification';
import { AlertTriangle, Clock } from 'lucide-react';
import { usePromoMode } from './lib/promoMode';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import EmailVerificationSent from './pages/auth/EmailVerificationSent';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
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
import Announcements from './pages/admin/Announcements';
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
import ActiveSessions from './pages/security/ActiveSessions';
import ForumList from './pages/forum/ForumList';
import ForumThread from './pages/forum/ForumThread';
import NewForumPost from './pages/forum/NewForumPost';
import AiDiagnose from './pages/ai/AiDiagnose';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import Onboarding from './pages/onboarding/Onboarding';
import ReferralDashboard from './pages/referrals/ReferralDashboard';
import SupplierContact from './pages/profile/SupplierContact';
import MechanicRegistration from './pages/onboarding/MechanicRegistration';
import MechanicVerificationDashboard from './pages/admin/MechanicVerification';
import PostJob from './pages/jobs/PostJob';
import MyJobs from './pages/jobs/MyJobs';
import OwnerJobs from './pages/jobs/OwnerJobs';
import JobMatching from './pages/admin/JobMatching';

function IdleWarningModal() {
  const { idleWarning, idleSecondsLeft, resetIdleTimer, signOut } = useAuth();
  if (!idleWarning) return null;

  const minutes = Math.floor(idleSecondsLeft / 60);
  const seconds = idleSecondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${idleSecondsLeft}s`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-orange-800/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Session Expiring</h3>
            <p className="text-gray-400 text-sm">You've been inactive for a while</p>
          </div>
        </div>

        <div className="bg-orange-950/40 border border-orange-900/50 rounded-xl p-4 mb-5 text-center">
          <p className="text-gray-300 text-sm mb-2">You'll be signed out in</p>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-3xl font-black text-orange-400 tabular-nums">{timeStr}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={signOut}
            className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold text-sm py-2.5 rounded-xl transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={resetIdleTimer}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoBanner() {
  return <PromoNotification />;
}

function AppContent() {
  const { user } = useAuth();
  const promo = usePromoMode();
  const hasBanner = promo.promoEnabled && !promo.loading;
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PromoBanner />
      <div className={hasBanner ? 'pt-7' : ''}>
      <Navbar />
      <IdleWarningModal />
      <div className={user ? 'md:block pb-16 md:pb-0' : ''}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email-sent" element={<EmailVerificationSent />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard/technician" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/owner" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/supplier" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

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
        <Route path="/sessions" element={<ProtectedRoute><ActiveSessions /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute requiredRole="admin"><Announcements /></ProtectedRoute>} />
        <Route path="/admin/mechanic-verification" element={<ProtectedRoute requiredRole="admin"><MechanicVerificationDashboard /></ProtectedRoute>} />
        <Route path="/admin/job-matching" element={<ProtectedRoute requiredRole="admin"><JobMatching /></ProtectedRoute>} />
        <Route path="/forum" element={<ForumList />} />
        <Route path="/forum/:postId" element={<ForumThread />} />
        <Route path="/forum/new" element={<ProtectedRoute><NewForumPost /></ProtectedRoute>} />
        <Route path="/ai-diagnose" element={<ProtectedRoute><AiDiagnose /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/mechanic-registration" element={<ProtectedRoute><MechanicRegistration /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><ReferralDashboard /></ProtectedRoute>} />
        <Route path="/jobs/post" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
        <Route path="/jobs/my-jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
        <Route path="/jobs/owner-jobs" element={<ProtectedRoute><OwnerJobs /></ProtectedRoute>} />
        <Route path="/supplier/:supplierId/contact" element={<SupplierContact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
      </div>
      <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
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
      </LanguageProvider>
    </BrowserRouter>
  );
}
