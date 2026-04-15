import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, FileText, Award, Loader, Check, X, Eye, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface MechanicProfile {
  id: string;
  user_id: string;
  experience_level: string;
  years_experience: number;
  current_location: string;
  educational_status: string;
  driving_license: string;
  hands_on_experience: string;
  expertise_areas: string[];
  diagnostic_tools: string[];
  owns_service_truck: boolean;
  employment_status: string;
  company_name: string | null;
  willing_travel: boolean;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  cv_file_url: string | null;
  verified_by_admin: boolean;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
  user: { name: string; email: string };
}

export default function MechanicVerification() {
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicProfile | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [filter, setFilter] = useState<'pending' | 'verified'>('pending');

  useEffect(() => {
    loadMechanics();
  }, [filter]);

  const loadMechanics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mechanic_verification_profiles')
        .select(
          `
          *,
          user:profiles!mechanic_verification_profiles_user_id_fkey(name, email)
        `
        )
        .eq('verified_by_admin', filter === 'verified')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMechanics(data || []);
    } catch (error) {
      console.error('Error loading mechanics:', error);
      toast.error('Failed to load mechanics');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (mechanic: MechanicProfile) => {
    setVerifyingId(mechanic.user_id);
    try {
      const { error } = await supabase
        .from('mechanic_verification_profiles')
        .update({
          verified_by_admin: true,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes || 'Verified by admin',
        })
        .eq('user_id', mechanic.user_id);

      if (error) throw error;

      toast.success(`${mechanic.user.name} has been verified`);
      setVerificationNotes('');
      setShowDetails(false);
      setSelectedMechanic(null);
      await loadMechanics();
    } catch (error) {
      console.error('Error verifying mechanic:', error);
      toast.error('Failed to verify mechanic');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (mechanic: MechanicProfile) => {
    if (!verificationNotes.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    setRejectingId(mechanic.user_id);
    try {
      const { error } = await supabase
        .from('mechanic_verification_profiles')
        .update({
          verification_notes: `REJECTED: ${verificationNotes}`,
        })
        .eq('user_id', mechanic.user_id);

      if (error) throw error;

      toast.success(`${mechanic.user.name} has been rejected`);
      setVerificationNotes('');
      setShowDetails(false);
      setSelectedMechanic(null);
      await loadMechanics();
    } catch (error) {
      console.error('Error rejecting mechanic:', error);
      toast.error('Failed to reject mechanic');
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Mechanic Verification</h1>
        <p className="text-gray-400">Review and verify mechanic professional profiles</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4">
        <button
          onClick={() => setFilter('pending')}
          className={`px-6 py-2.5 rounded-lg font-medium transition ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Pending Review ({mechanics.length})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-6 py-2.5 rounded-lg font-medium transition ${
            filter === 'verified'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Verified
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : mechanics.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            {filter === 'pending' ? 'No pending verifications' : 'No verified mechanics yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {mechanics.map((mechanic) => (
            <div
              key={mechanic.user_id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{mechanic.user.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {mechanic.contact_email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {mechanic.contact_phone}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedMechanic(mechanic);
                    setShowDetails(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4 py-4 border-t border-b border-gray-800">
                <div>
                  <p className="text-gray-500 text-xs">Experience</p>
                  <p className="font-semibold text-white capitalize">{mechanic.experience_level}</p>
                  <p className="text-gray-400 text-xs">{mechanic.years_experience} years</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Location</p>
                  <p className="font-semibold text-white">{mechanic.current_location}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Employment</p>
                  <p className="font-semibold text-white capitalize">{mechanic.employment_status}</p>
                  {mechanic.company_name && (
                    <p className="text-gray-400 text-xs">{mechanic.company_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Expertise Areas</p>
                  <p className="font-semibold text-white">{mechanic.expertise_areas.length} areas</p>
                </div>
              </div>

              <div className="flex gap-2">
                {mechanic.expertise_areas.slice(0, 3).map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs font-medium"
                  >
                    {area}
                  </span>
                ))}
                {mechanic.expertise_areas.length > 3 && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-medium">
                    +{mechanic.expertise_areas.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedMechanic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-4xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Mechanic Profile Review</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
              {/* Basic Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="font-semibold text-white">{selectedMechanic.user.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="font-semibold text-white">{selectedMechanic.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Phone</p>
                    <p className="font-semibold text-white">{selectedMechanic.contact_phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Address</p>
                    <p className="font-semibold text-white">{selectedMechanic.contact_address}</p>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Professional Experience</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-400">Experience Level</p>
                    <p className="font-semibold text-white capitalize">{selectedMechanic.experience_level}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Years of Experience</p>
                    <p className="font-semibold text-white">{selectedMechanic.years_experience} years</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current Location</p>
                    <p className="font-semibold text-white">{selectedMechanic.current_location}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Willing to Travel</p>
                    <p className="font-semibold text-white">{selectedMechanic.willing_travel ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Hands-on Experience Details</p>
                  <p className="text-white bg-gray-700 rounded p-3 text-sm">
                    {selectedMechanic.hands_on_experience}
                  </p>
                </div>
              </div>

              {/* Education & Certifications */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Education & Certifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Educational Status</p>
                    <p className="font-semibold text-white capitalize">
                      {selectedMechanic.educational_status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Driving License</p>
                    <p className="font-semibold text-white capitalize">
                      {selectedMechanic.driving_license.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expertise & Tools */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Expertise & Equipment</h3>
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Areas of Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMechanic.expertise_areas.map((area) => (
                      <span
                        key={area}
                        className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Diagnostic Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMechanic.diagnostic_tools.map((tool) => (
                      <span
                        key={tool}
                        className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-xs font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">Service Truck</p>
                  <p className="font-semibold text-white">
                    {selectedMechanic.owns_service_truck ? 'Yes - Owns a service truck' : 'No'}
                  </p>
                </div>
              </div>

              {/* Employment */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Employment Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Employment Status</p>
                    <p className="font-semibold text-white capitalize">
                      {selectedMechanic.employment_status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {selectedMechanic.company_name && (
                    <div>
                      <p className="text-gray-400">Company Name</p>
                      <p className="font-semibold text-white">{selectedMechanic.company_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CV */}
              {selectedMechanic.cv_file_url && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">CV Document</h3>
                  <a
                    href={selectedMechanic.cv_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    View CV
                  </a>
                </div>
              )}

              {/* Verification Notes */}
              {!selectedMechanic.verified_by_admin && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Verification Notes</h3>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about this mechanic's verification..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Verification Status */}
              {selectedMechanic.verified_at && (
                <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <p className="font-semibold text-green-300">Verified</p>
                  </div>
                  <p className="text-sm text-green-200">
                    Verified on {new Date(selectedMechanic.verified_at).toLocaleDateString()}
                  </p>
                  {selectedMechanic.verification_notes && (
                    <p className="text-sm text-green-200 mt-2">{selectedMechanic.verification_notes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {!selectedMechanic.verified_by_admin && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleReject(selectedMechanic)}
                  disabled={rejectingId === selectedMechanic.user_id || !verificationNotes.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {rejectingId === selectedMechanic.user_id ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Reject
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleVerify(selectedMechanic)}
                  disabled={verifyingId === selectedMechanic.user_id}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {verifyingId === selectedMechanic.user_id ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
