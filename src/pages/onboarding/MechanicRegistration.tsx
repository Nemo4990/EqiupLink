import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, Upload, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function MechanicRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const expertiseOptions = [
    'Engine Repair',
    'Transmission',
    'Hydraulic Systems',
    'Electric Systems',
    'ECM Programming',
    'CRC Diagnostics',
    'Field Technology',
    'Caterpillar Equipment',
    'Hitachi Equipment',
    'Doosan Equipment',
    'Volvo Equipment',
    'JCB Equipment',
    'Komatsu Equipment',
    'Hyundai Equipment',
    'XCMG Equipment',
    'Sany Equipment',
    'Liugong Equipment',
    'SDLG Equipment',
  ];

  const diagnosticToolsOptions = [
    'CAT ET (Caterpillar)',
    'Doosan Diagnostic Tool',
    'Komatsu KOMTRAX',
    'Volvo Diagnostic Tool',
    'JCB Service Master',
    'Hyundai Diagnostic Tool',
    'XCMG Diagnostic Tool',
    'Sany Diagnostic Tool',
    'Generic OBD-II Scanner',
    'Heavy Equipment Scanner',
  ];

  const [formData, setFormData] = useState({
    // Step 1: Basic Experience
    experience_level: '',
    years_experience: 0,
    current_location: '',

    // Step 2: Education & Certifications
    educational_status: '',
    driving_license: '',
    hands_on_experience: '',

    // Step 3: Expertise & Equipment
    expertise_areas: [] as string[],
    diagnostic_tools: [] as string[],
    owns_service_truck: false,

    // Step 4: Employment & Willingness
    employment_status: '',
    company_name: '',
    willing_travel: false,

    // Step 5: Contact Information
    contact_email: '',
    contact_phone: '',
    contact_address: '',
  });

  const handleExpertiseToggle = (expertise: string) => {
    setFormData((prev) => ({
      ...prev,
      expertise_areas: prev.expertise_areas.includes(expertise)
        ? prev.expertise_areas.filter((e) => e !== expertise)
        : [...prev.expertise_areas, expertise],
    }));
  };

  const handleToolToggle = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      diagnostic_tools: prev.diagnostic_tools.includes(tool)
        ? prev.diagnostic_tools.filter((t) => t !== tool)
        : [...prev.diagnostic_tools, tool],
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.experience_level && formData.years_experience >= 0 && !!formData.current_location;
      case 2:
        return !!formData.educational_status && !!formData.driving_license && !!formData.hands_on_experience;
      case 3:
        return formData.expertise_areas.length > 0 && formData.diagnostic_tools.length > 0;
      case 4:
        return !!formData.employment_status && (formData.employment_status !== 'employed' || !!formData.company_name);
      case 5:
        return !!formData.contact_email && !!formData.contact_phone && !!formData.contact_address;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.expertise_areas.length === 0) {
      toast.error('Please select at least one area of expertise');
      return;
    }

    setLoading(true);
    try {
      let cvUrl = null;
      if (cvFile) {
        cvUrl = await handleCVUpload(cvFile);
      }

      const { data: existingProfile } = await supabase
        .from('mechanic_verification_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('mechanic_verification_profiles')
          .update({
            experience_level: formData.experience_level,
            years_experience: formData.years_experience,
            current_location: formData.current_location,
            educational_status: formData.educational_status,
            driving_license: formData.driving_license,
            hands_on_experience: formData.hands_on_experience,
            expertise_areas: formData.expertise_areas,
            diagnostic_tools: formData.diagnostic_tools,
            owns_service_truck: formData.owns_service_truck,
            employment_status: formData.employment_status,
            company_name: formData.company_name || null,
            willing_travel: formData.willing_travel,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            contact_address: formData.contact_address,
            cv_file_url: cvUrl || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('mechanic_verification_profiles').insert({
          user_id: user?.id,
          experience_level: formData.experience_level,
          years_experience: formData.years_experience,
          current_location: formData.current_location,
          educational_status: formData.educational_status,
          driving_license: formData.driving_license,
          hands_on_experience: formData.hands_on_experience,
          expertise_areas: formData.expertise_areas,
          diagnostic_tools: formData.diagnostic_tools,
          owns_service_truck: formData.owns_service_truck,
          employment_status: formData.employment_status,
          company_name: formData.company_name || null,
          willing_travel: formData.willing_travel,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          contact_address: formData.contact_address,
          cv_file_url: cvUrl,
        });

        if (error) throw error;
      }

      toast.success('Registration complete! Your profile is under admin review.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast.error('Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Experience' },
    { num: 2, title: 'Education' },
    { num: 3, title: 'Expertise' },
    { num: 4, title: 'Employment' },
    { num: 5, title: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Mechanic Professional Registration</h1>
          <p className="text-gray-400">Complete your professional profile for admin verification</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          {steps.map((step) => (
            <div key={step.num} className="flex-1">
              <button
                onClick={() => currentStep >= step.num && setCurrentStep(step.num)}
                disabled={currentStep < step.num}
                className={`w-full text-center py-3 rounded-lg font-medium transition-all ${
                  currentStep === step.num
                    ? 'bg-blue-600 text-white'
                    : currentStep > step.num
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="text-xs">Step {step.num}</div>
                <div className="text-sm font-semibold">{step.title}</div>
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Step 1: Experience */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Professional Experience</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Experience Level <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'novice', label: 'Novice', desc: '0-2 years' },
                    { value: 'intermediate', label: 'Intermediate', desc: '2-5 years' },
                    { value: 'advanced', label: 'Advanced', desc: '5-10 years' },
                    { value: 'expert', label: 'Expert', desc: '10+ years' },
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Years of Experience <span className="text-red-400">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.current_location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, current_location: e.target.value }))
                  }
                  placeholder="e.g., Addis Ababa, Dire Dawa, etc."
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate('/auth/register', { replace: true })}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={() => validateStep(1) && setCurrentStep(2)}
                  disabled={!validateStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Education & Certifications */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Education & Certifications</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Educational Status <span className="text-red-400">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Driving License Status <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.driving_license}
                  onChange={(e) => setFormData((prev) => ({ ...prev, driving_license: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select driving license type</option>
                  <option value="none">No License</option>
                  <option value="category_a">Category A (Motorcycle)</option>
                  <option value="category_b">Category B (Car)</option>
                  <option value="category_c">Category C (Truck)</option>
                  <option value="category_d">Category D (Heavy Vehicle)</option>
                  <option value="multiple">Multiple Categories</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hands-on Experience Details <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.hands_on_experience}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hands_on_experience: e.target.value }))
                  }
                  placeholder="Describe your hands-on experience with machinery repairs, major projects completed, certifications, training courses, etc."
                  rows={5}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => validateStep(2) && setCurrentStep(3)}
                  disabled={!validateStep(2)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Expertise & Tools */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Areas of Expertise</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Your Areas of Expertise <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {expertiseOptions.map((expertise) => (
                    <button
                      key={expertise}
                      onClick={() => handleExpertiseToggle(expertise)}
                      className={`p-3 rounded-lg border-2 transition-all text-left font-medium ${
                        formData.expertise_areas.includes(expertise)
                          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {expertise}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Diagnostic Tools <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {diagnosticToolsOptions.map((tool) => (
                    <label key={tool} className="flex items-center gap-3 p-3 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.diagnostic_tools.includes(tool)}
                        onChange={() => handleToolToggle(tool)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-white font-medium">{tool}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition">
                <input
                  type="checkbox"
                  checked={formData.owns_service_truck}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, owns_service_truck: e.target.checked }))
                  }
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-white font-medium">I own a service truck</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => validateStep(3) && setCurrentStep(4)}
                  disabled={!validateStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Employment */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Employment Status</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Employment Status <span className="text-red-400">*</span>
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
                      onClick={() => setFormData((prev) => ({ ...prev, employment_status: opt.value }))}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        formData.employment_status === opt.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium text-white">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {formData.employment_status === 'employed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                    }
                    placeholder="Enter company name"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition">
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload CV (PDF or DOC) <span className="text-gray-500">(Optional)</span>
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => validateStep(4) && setCurrentStep(5)}
                  disabled={!validateStep(4)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Contact Information */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
                <p className="text-gray-400 text-sm mb-6">
                  This information will be used by admins to verify and contact you regarding job opportunities
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contact_email: e.target.value }))
                  }
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))
                  }
                  placeholder="+251 9 XX XXX XXXX"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Address <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.contact_address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contact_address: e.target.value }))
                  }
                  placeholder="Street address, district, city, etc."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Important</p>
                    <p>
                      Your profile will be thoroughly reviewed by our admin team. We verify all information including education, experience, certifications, and diagnostic tools expertise. Once verified, you'll be eligible to receive job requests.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
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
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
