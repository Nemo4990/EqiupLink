import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminListings from './AdminListings';

export default function AdminListingsPage() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>
        <h1 className="text-3xl md:text-4xl font-black mb-2">Listings Management</h1>
        <p className="text-gray-400 mb-8">Moderate parts and rental listings across the marketplace.</p>
        {profile?.id && <AdminListings adminId={profile.id} />}
      </div>
    </div>
  );
}
