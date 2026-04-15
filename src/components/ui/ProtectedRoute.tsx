import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from './LoadingSpinner';

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.email_confirmed_at) return <Navigate to="/verify-email-sent" replace />;
  if (requiredRole && profile?.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
