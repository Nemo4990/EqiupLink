import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, CheckCircle, AlertCircle, Loader, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function MechanicVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    experience_level: '',
    years_experience: 0,
    current_work_status: '',
    educational_status: '',
    willing_travel: false,
    specializations: [] as string[],
    additional_info: '',
  });

  const specializations = [
    'Engine Repair',
    'Transmission',
    'Electrical',
    'Suspension',
    'Braking System',
    'Air Conditioning',
    'Welding',
    'Painting',
    'Diagnostic',
    'General Maintenance',
  ];

  const handleSpecializationToggle = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const handleCVUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-cv-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('mechanic-cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('mechanic-cvs')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('CV upload error:', error);
      toast.error('Failed to upload CV');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.experience_level ||
      !formData.current_work_status ||
      !formData.educational_status ||
      formData.specializations.length === 0
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let cvUrl = null;
      if (cvFile) {
        cvUrl = await handleCVUpload(cvFile);
      }

      const { error } = await supabase.from('mechanic_verification_profiles').insert({
        user_id: user?.id,
        experience_level: formData.experience_level,
        years_experience: formData.years_experience,
        current_work_status: formData.current_work_status,
        educational_status: formData.educational_status,
        willing_travel: formData.willing_travel,
        specializations: formData.specializations,
        additional_info: formData.additional_info,
        cv_file_url: cvUrl,
      });

      if (error) throw error;

      toast.success('Verification profile created! Awaiting admin review');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Professional Verification</h1>
          <p className="text-gray-400">
            Help us verify your expertise. This information helps us match you with suitable jobs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {[
                { step: 1, title: 'Experience' },
                { step: 2, title: 'Education & Status' },
                { step: 3, title: 'Specializations' },
                { step: 4, title: 'CV & Additional Info' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                    currentStep === s.step
                      ? 'bg-blue-600 text-white'
                      : currentStep > s.step
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {currentStep > s.step ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-current" />
                    )}
                    {s.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Experience Level</h2>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      What is your experience level?
                    </label>
                    {[
                      { value: 'novice', label: 'Novice', desc: '0-2 years experience' },
                      { value: 'intermediate', label: 'Intermediate', desc: '2-5 years experience' },
                      { value: 'advanced', label: 'Advanced', desc: '5-10 years experience' },
                      { value: 'expert', label: 'Expert', desc: '10+ years experience' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormData((prev) => ({ ...prev, experience_level: opt.value }))}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          formData.experience_level === opt.value
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-semibold text-white">{opt.label}</div>
                        <div className="text-sm text-gray-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total years of experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.years_experience}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          years_experience: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Education & Work Status</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Current work status
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'employed', label: 'Employed' },
                        { value: 'self-employed', label: 'Self-Employed' },
                        { value: 'looking', label: 'Looking for Work' },
                        { value: 'not-available', label: 'Not Available' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFormData((prev) => ({ ...prev, current_work_status: opt.value }))}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            formData.current_work_status === opt.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          }`}
                        >
                          <div className="font-medium text-white">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Educational status
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'high_school', label: 'High School' },
                        { value: 'diploma', label: 'Diploma/Certificate' },
                        { value: 'bachelors', label: "Bachelor's Degree" },
                        { value: 'masters', label: "Master's Degree" },
                        { value: 'other', label: 'Other' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFormData((prev) => ({ ...prev, educational_status: opt.value }))}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            formData.educational_status === opt.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          }`}
                        >
                          <div className="font-medium text-white">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your Specializations</h2>
                    <p className="text-gray-400 text-sm mb-6">
                      Select all areas you specialize in
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {specializations.map((spec) => (
                      <button
                        key={spec}
                        onClick={() => handleSpecializationToggle(spec)}
                        className={`p-3 rounded-lg border-2 transition-all text-left font-medium ${
                          formData.specializations.includes(spec)
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition">
                      <input
                        type="checkbox"
                        checked={formData.willing_travel}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, willing_travel: e.target.checked }))
                        }
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-white font-medium">Willing to travel for jobs</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">CV & Additional Information</h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Upload your CV (PDF or DOC)
                    </label>
                    <label className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition block">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-gray-500" />
                        <div className="font-medium text-white">
                          {cvFile ? cvFile.name : 'Click to upload CV'}
                        </div>
                        <div className="text-sm text-gray-500">PDF or DOC (Max 5MB)</div>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('File size must be less than 5MB');
                            } else {
                              setCvFile(file);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional information about your expertise
                    </label>
                    <textarea
                      value={formData.additional_info}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, additional_info: e.target.value }))
                      }
                      placeholder="Tell us about your achievements, certifications, notable projects, or anything else that should help verify your expertise..."
                      rows={5}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">Important</p>
                        <p>
                          Your profile will be reviewed by our admin team. Once verified, you'll be eligible to
                          receive job requests from customers.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium py-2.5 rounded-lg transition"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Submit Verification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
