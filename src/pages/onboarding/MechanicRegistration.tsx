import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertCircle, Loader, Upload, ChevronRight, ChevronLeft,
  Wrench, GraduationCap, Briefcase, Phone, ShieldCheck, Award, Truck as TruckIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const EQUIPMENT_BRANDS = [
  'CAT', 'Komatsu', 'Hyundai', 'Doosan', 'JCB', 'Hitachi',
  'Develon', 'XCMG', 'SDLG', 'Liugong', 'Volvo', 'Sany',
];

const EXPERTISE_OPTIONS = [
  'Engine Repair', 'Transmission', 'Hydraulic Systems', 'Electric Systems',
  'ECM Programming', 'CRC Diagnostics', 'Field Technology',
  'Undercarriage Rebuild', 'Welding / Fabrication', 'Preventive Maintenance',
];

const DIAGNOSTIC_TOOLS = [
  'CAT ET (Caterpillar)', 'Doosan Diagnostic Tool', 'Komatsu KOMTRAX',
  'Volvo Diagnostic Tool', 'JCB Service Master', 'Hyundai Diagnostic Tool',
  'XCMG Diagnostic Tool', 'Sany Diagnostic Tool', 'Generic OBD-II Scanner',
  'Heavy Equipment Scanner', 'Multimeter', 'Pressure Gauge Kit',
];

const LICENSE_TYPES = [
  'Automobile (Cat 1)', 'Light Vehicle (Cat 2)', 'Public Service (Cat 3)',
  'Heavy Truck (Cat 4)', 'Heavy Equipment Operator', 'Multiple',
];

export default function MechanicRegistration() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [certFiles, setCertFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    full_name: profile?.name || '',
    contact_phone: profile?.phone || profile?.contact_phone || '',
    contact_email: profile?.email || profile?.contact_email || '',
    contact_address: profile?.contact_address || '',
    years_experience: 0,
    field_service_years: 0,
    experience_level: '',
    current_location: '',
    brand_experience: [] as string[],
    expertise_areas: [] as string[],
    diagnostic_tools: [] as string[],
    professional_certificates: [] as string[],
    hands_on_experience: '',
    driving_license: '',
    license_type: '',
    owns_service_truck: false,
    employment_status: '',
    company_name: '',
    employment_duration: '',
    willing_travel: false,
    educational_status: '',
  });

  const toggleArrayField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const arr = (prev[field] as string[]) || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const addCertificate = (name: string) => {
    if (!name.trim()) return;
    setFormData((prev) => ({
      ...prev,
      professional_certificates: [...prev.professional_certificates, name.trim()],
    }));
  };

  const removeCertificate = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      professional_certificates: prev.professional_certificates.filter((_, i) => i !== idx),
    }));
  };

  const uploadCv = async (): Promise<string | null> => {
    if (!cvFile || !user) return null;
    const ext = cvFile.name.split('.').pop();
    const path = `${user.id}/cv-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('mechanic-cvs').upload(path, cvFile, { upsert: true });
    if (error) {
      toast.error('CV upload failed');
      return null;
    }
    const { data } = supabase.storage.from('mechanic-cvs').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cvUrl = cvFile ? await uploadCv() : null;

      const { error } = await supabase
        .from('mechanic_verification_profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.full_name,
          experience_level: formData.experience_level,
          years_experience: formData.years_experience,
          field_service_years: formData.field_service_years,
          educational_status: formData.educational_status,
          driving_license: formData.driving_license,
          license_type: formData.license_type,
          hands_on_experience: formData.hands_on_experience,
          current_location: formData.current_location,
          expertise_areas: formData.expertise_areas,
          brand_experience: formData.brand_experience,
          diagnostic_tools: formData.diagnostic_tools,
          professional_certificates: formData.professional_certificates,
          owns_service_truck: formData.owns_service_truck,
          employment_status: formData.employment_status,
          company_name: formData.company_name,
          employment_duration: formData.employment_duration,
          willing_travel: formData.willing_travel,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          contact_address: formData.contact_address,
          verification_status: 'pending_verification',
          verified_by_admin: false,
          ...(cvUrl ? { cv_file_url: cvUrl } : {}),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({
          name: formData.full_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          contact_address: formData.contact_address,
          location: formData.current_location,
        })
        .eq('id', user.id);

      toast.success('Registration submitted! Your account is now Pending Verification.');
      navigate('/dashboard');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Personal', icon: Phone },
    { n: 2, label: 'Experience', icon: Wrench },
    { n: 3, label: 'Brands & Tools', icon: TruckIcon },
    { n: 4, label: 'Certifications', icon: Award },
    { n: 5, label: 'Employment', icon: Briefcase },
    { n: 6, label: 'Review', icon: CheckCircle },
  ];

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.full_name && formData.contact_phone && formData.contact_email && formData.contact_address);
      case 2:
        return !!(formData.years_experience >= 0 && formData.experience_level && formData.current_location);
      case 3:
        return formData.brand_experience.length > 0;
      case 4:
        return true;
      case 5:
        return !!formData.employment_status;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white">Mechanic Verification</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Complete all sections to submit for admin verification. Your account will be marked <span className="text-amber-400 font-semibold">Pending Verification</span> until approved.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = s.n === currentStep;
            const done = s.n < currentStep;
            return (
              <div key={s.n} className="flex items-center flex-shrink-0">
                <div className={`flex items-center gap-2 ${i > 0 ? 'ml-2' : ''}`}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                      done
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : active
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-gray-900 border-gray-700 text-gray-500'
                    }`}
                  >
                    {done ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`hidden md:block text-xs font-medium ${active ? 'text-white' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`hidden md:block w-8 h-0.5 mx-2 ${done ? 'bg-emerald-500/50' : 'bg-gray-800'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Phone Number" required>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Address" required>
                  <input
                    type="text"
                    value={formData.contact_address}
                    onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                    className="input"
                    placeholder="City, Sub-city, Woreda"
                  />
                </Field>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg">Professional Experience</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Total Professional Experience (Years)" required>
                  <input
                    type="number"
                    min={0}
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value || '0') })}
                    className="input"
                  />
                </Field>
                <Field label="Field Service Experience (Years)" required>
                  <input
                    type="number"
                    min={0}
                    value={formData.field_service_years}
                    onChange={(e) => setFormData({ ...formData, field_service_years: parseInt(e.target.value || '0') })}
                    className="input"
                  />
                </Field>
                <Field label="Experience Level" required>
                  <select
                    value={formData.experience_level}
                    onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                    className="input"
                  >
                    <option value="">Select level</option>
                    <option value="novice">Novice (0-2 yrs)</option>
                    <option value="intermediate">Intermediate (3-5 yrs)</option>
                    <option value="advanced">Advanced (6-10 yrs)</option>
                    <option value="expert">Expert (10+ yrs)</option>
                  </select>
                </Field>
                <Field label="Current Location" required>
                  <input
                    type="text"
                    value={formData.current_location}
                    onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                    className="input"
                    placeholder="City / Region"
                  />
                </Field>
                <Field label="Educational Status">
                  <select
                    value={formData.educational_status}
                    onChange={(e) => setFormData({ ...formData, educational_status: e.target.value })}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="high_school">High School / TVET</option>
                    <option value="diploma">Diploma</option>
                    <option value="bachelor">Bachelor's Degree</option>
                    <option value="master">Master's Degree</option>
                  </select>
                </Field>
              </div>
              <Field label="Hands-on Experience (Brief description)">
                <textarea
                  rows={3}
                  value={formData.hands_on_experience}
                  onChange={(e) => setFormData({ ...formData, hands_on_experience: e.target.value })}
                  className="input"
                  placeholder="Describe machines you've worked on, projects, etc."
                />
              </Field>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg mb-1">Brand-Specific Experience</h2>
                <p className="text-gray-500 text-sm mb-3">Select all brands you have hands-on experience with.</p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_BRANDS.map((b) => {
                    const selected = formData.brand_experience.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleArrayField('brand_experience', b)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">Expertise Areas</h3>
                <p className="text-gray-500 text-sm mb-3">Select your core repair specialties.</p>
                <div className="flex flex-wrap gap-2">
                  {EXPERTISE_OPTIONS.map((e) => {
                    const selected = formData.expertise_areas.includes(e);
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => toggleArrayField('expertise_areas', e)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">Diagnostic Tools Experience</h3>
                <p className="text-gray-500 text-sm mb-3">Tools you are proficient in.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DIAGNOSTIC_TOOLS.map((t) => {
                    const selected = formData.diagnostic_tools.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selected ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleArrayField('diagnostic_tools', t)}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-gray-200">{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <h2 className="text-white font-bold text-lg">Certifications & Documents</h2>

              <Field label="Professional Certificates">
                <CertificateInput onAdd={addCertificate} />
                {formData.professional_certificates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.professional_certificates.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-sm"
                      >
                        <Award className="w-3.5 h-3.5" />
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCertificate(i)}
                          className="text-amber-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="CV / Resume (PDF or DOC)">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-400 text-sm">
                    {cvFile ? cvFile.name : 'Click to upload CV (max 5MB)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 5 * 1024 * 1024) {
                        toast.error('Max 5MB');
                        return;
                      }
                      setCvFile(f || null);
                    }}
                    className="hidden"
                  />
                </label>
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Driving License Status">
                  <select
                    value={formData.driving_license}
                    onChange={(e) => setFormData({ ...formData, driving_license: e.target.value })}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes, I have a license</option>
                    <option value="no">No</option>
                    <option value="learner">Learner's Permit</option>
                  </select>
                </Field>
                <Field label="License Type">
                  <select
                    value={formData.license_type}
                    onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                    className="input"
                    disabled={formData.driving_license !== 'yes'}
                  >
                    <option value="">Select type</option>
                    {LICENSE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-5">
              <h2 className="text-white font-bold text-lg">Employment & Service Vehicle</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Current Employment Status" required>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="employed">Employed (Full-time)</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="looking">Seeking Work</option>
                    <option value="not-available">Not Available</option>
                  </select>
                </Field>
                {formData.employment_status === 'employed' && (
                  <>
                    <Field label="Company Name">
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Duration of Employment">
                      <input
                        type="text"
                        value={formData.employment_duration}
                        onChange={(e) => setFormData({ ...formData, employment_duration: e.target.value })}
                        className="input"
                        placeholder="e.g. 3 years"
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.owns_service_truck}
                    onChange={(e) => setFormData({ ...formData, owns_service_truck: e.target.checked })}
                    className="mt-1 accent-amber-500"
                  />
                  <div>
                    <p className="text-white font-medium text-sm flex items-center gap-2">
                      <TruckIcon className="w-4 h-4 text-amber-400" /> I own a service truck / pickup
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Owners often prefer mechanics with their own service vehicle.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.willing_travel}
                    onChange={(e) => setFormData({ ...formData, willing_travel: e.target.checked })}
                    className="mt-1 accent-amber-500"
                  />
                  <div>
                    <p className="text-white font-medium text-sm">Willing to travel to job sites</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Field service jobs may require travel outside your city.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg">Review Your Submission</h2>
              <p className="text-gray-400 text-sm">
                Confirm your details before submitting. Your account will enter Pending Verification status.
              </p>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-3 text-sm">
                <SummaryRow label="Full Name" value={formData.full_name} />
                <SummaryRow label="Phone" value={formData.contact_phone} />
                <SummaryRow label="Email" value={formData.contact_email} />
                <SummaryRow label="Address" value={formData.contact_address} />
                <SummaryRow label="Experience" value={`${formData.years_experience} yrs total / ${formData.field_service_years} yrs field`} />
                <SummaryRow label="Brands" value={formData.brand_experience.join(', ') || '—'} />
                <SummaryRow label="Expertise" value={formData.expertise_areas.join(', ') || '—'} />
                <SummaryRow label="Diagnostic Tools" value={formData.diagnostic_tools.join(', ') || '—'} />
                <SummaryRow label="Certificates" value={formData.professional_certificates.join(', ') || '—'} />
                <SummaryRow label="Service Truck" value={formData.owns_service_truck ? 'Yes' : 'No'} />
                <SummaryRow
                  label="Employment"
                  value={
                    formData.employment_status === 'employed'
                      ? `${formData.company_name || '—'} (${formData.employment_duration || '—'})`
                      : formData.employment_status
                  }
                />
                <SummaryRow label="License" value={formData.driving_license === 'yes' ? formData.license_type || 'Yes' : formData.driving_license || '—'} />
                <SummaryRow label="CV File" value={cvFile?.name || 'Not uploaded'} />
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs leading-relaxed">
                  Once submitted, an admin will review your profile. You will be notified as soon as you are verified.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-1 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => canProceed() && setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 disabled:bg-gray-800 disabled:text-gray-500 text-gray-950 font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Submit for Verification
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #030712;
          border: 1px solid #1f2937;
          color: #f3f4f6;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color .15s;
        }
        .input:focus { border-color: #f59e0b; }
        .input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-300 text-xs font-semibold mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-900 last:border-0">
      <span className="text-gray-500 text-xs w-32 flex-shrink-0 uppercase tracking-wide">{label}</span>
      <span className="text-gray-200 text-sm flex-1 break-words">{value || '—'}</span>
    </div>
  );
}

function CertificateInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd(val);
            setVal('');
          }
        }}
        placeholder="e.g. Caterpillar Service Technician Level 2"
        className="input flex-1"
      />
      <button
        type="button"
        onClick={() => {
          onAdd(val);
          setVal('');
        }}
        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold px-4 rounded-lg text-sm transition-colors"
      >
        Add
      </button>
    </div>
  );
}
