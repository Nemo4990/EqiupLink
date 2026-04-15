import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Mail, Lock, User, Eye, EyeOff, AlertCircle, HardHat, Truck, Package, Phone, MapPin, ChevronDown, Gift, Check, X as XIcon, Upload, FileText, Camera as CameraIcon, Image as ImageIcon, Award, Briefcase, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { validateReferralCode, processReferral } from '../../lib/referrals';
import { supabase } from '../../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import toast from 'react-hot-toast';

const ROLE_META = [
  { id: 'owner', icon: HardHat, color: 'text-yellow-400' },
  { id: 'mechanic', icon: Wrench, color: 'text-orange-400' },
  { id: 'supplier', icon: Package, color: 'text-blue-400' },
  { id: 'rental_provider', icon: Truck, color: 'text-green-400' },
] as const;

const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'South West Ethiopia',
  'Tigray',
];

export default function Register() {
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(searchParams.get('role') || 'owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState<string | null>(null);
  const [tradeLicenseName, setTradeLicenseName] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Mechanic registration fields
  const [mechanicData, setMechanicData] = useState({
    experience_level: '',
    years_experience: 0,
    educational_status: '',
    driving_license: '',
    expertise_areas: [] as string[],
    diagnostic_tools: [] as string[],
    owns_service_truck: false,
    employment_status: '',
    company_name: '',
    willing_travel: false,
    contact_address: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const code = searchParams.get('ref');
    if (code) {
      setReferralCode(code);
      checkReferral(code);
    }
  }, []);

  const checkReferral = async (code: string) => {
    if (!code || code.length < 4) { setReferralValid(null); setReferrerId(null); return; }
    setReferralChecking(true);
    const result = await validateReferralCode(code);
    setReferralValid(result.valid);
    setReferrerId(result.referrerId || null);
    setReferrerName(result.referrerName || null);
    setReferralChecking(false);
  };

  const uploadLicenseFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB.'); return; }
    setUploadingLicense(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `trade-license-temp/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
      setTradeLicenseUrl(data.publicUrl);
      toast.success('License photo uploaded');
    } catch {
      toast.error('Failed to upload. Try again.');
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLicenseFile(file);
    e.target.value = '';
  };

  const handleTakeLicensePhoto = async () => {
    if (!Capacitor.isNativePlatform()) { licenseInputRef.current?.click(); return; }
    try {
      const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
      if (photo.dataUrl) {
        const blob = await (await fetch(photo.dataUrl)).blob();
        await uploadLicenseFile(new File([blob], `license-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }
    } catch { /* user cancelled */ }
  };

  const uploadCVFile = async (file: File) => {
    const validExtensions = ['pdf', 'doc', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      toast.error('Please select a PDF or DOC file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('CV must be under 5MB');
      return;
    }
    setUploadingCv(true);
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2);
      const path = `mechanic-cvs/${timestamp}_${random}.${ext}`;

      const { error, data: uploadData } = await supabase.storage
        .from('mechanic-cvs')
        .upload(path, file);

      if (error) {
        console.error('Storage error:', error);
        throw error;
      }

      setCvFile(file);
      toast.success('CV uploaded successfully');
    } catch (err) {
      console.error('CV upload failed:', err);
      toast.error('Failed to upload CV. Please try again.');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleCVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCVFile(file);
    e.target.value = '';
  };

  const expertiseOptions = [
    'Engine Repair', 'Transmission', 'Hydraulic Systems', 'Electric Systems', 'ECM Programming',
    'CRC Diagnostics', 'Field Technology', 'Caterpillar Equipment', 'Hitachi Equipment',
    'Doosan Equipment', 'Volvo Equipment', 'JCB Equipment', 'Komatsu Equipment',
    'Hyundai Equipment', 'XCMG Equipment', 'Sany Equipment', 'Liugong Equipment', 'SDLG Equipment',
  ];

  const diagnosticToolsOptions = [
    'CAT ET (Caterpillar)', 'Doosan Diagnostic Tool', 'Komatsu KOMTRAX', 'Volvo Diagnostic Tool',
    'JCB Service Master', 'Hyundai Diagnostic Tool', 'XCMG Diagnostic Tool', 'Sany Diagnostic Tool',
    'Generic OBD-II Scanner', 'Heavy Equipment Scanner',
  ];

  const toggleExpertise = (expertise: string) => {
    setMechanicData(prev => ({
      ...prev,
      expertise_areas: prev.expertise_areas.includes(expertise)
        ? prev.expertise_areas.filter(e => e !== expertise)
        : [...prev.expertise_areas, expertise],
    }));
  };

  const toggleDiagnosticTool = (tool: string) => {
    setMechanicData(prev => ({
      ...prev,
      diagnostic_tools: prev.diagnostic_tools.includes(tool)
        ? prev.diagnostic_tools.filter(t => t !== tool)
        : [...prev.diagnostic_tools, tool],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }
    if (role === 'supplier') {
      if (!tradeLicenseUrl) { setError(t.auth.tradeLicenseRequired); return; }
      if (!tradeLicenseName.trim()) { setError(t.auth.businessNameRequired); return; }
      if (tradeLicenseName.trim().toLowerCase() !== name.trim().toLowerCase()) {
        setError(t.auth.nameMismatch);
        return;
      }
    }
    if (role === 'mechanic') {
      if (!mechanicData.experience_level) { setError('Please select experience level'); return; }
      if (!mechanicData.educational_status) { setError('Please select educational status'); return; }
      if (!mechanicData.driving_license) { setError('Please select driving license type'); return; }
      if (mechanicData.expertise_areas.length === 0) { setError('Please select at least one expertise area'); return; }
      if (mechanicData.diagnostic_tools.length === 0) { setError('Please select at least one diagnostic tool'); return; }
      if (!mechanicData.employment_status) { setError('Please select employment status'); return; }
      if (mechanicData.employment_status === 'employed' && !mechanicData.company_name.trim()) { setError('Please enter company name'); return; }
      if (!mechanicData.contact_address.trim()) { setError('Please enter contact address'); return; }
    }
    setLoading(true);
    const { error, needsVerification, userId } = await signUp(email, password, name, role, phone, location);
    setLoading(false);
    if (error) {
      setError(error.message || 'Registration failed. Please try again.');
    } else if (needsVerification) {
      if (userId && referrerId && referralValid) {
        await processReferral(referrerId, userId).catch(() => {});
      }
      if (userId && role === 'supplier' && tradeLicenseUrl) {
        await supabase.from('supplier_documents').insert({
          user_id: userId,
          document_type: 'trade_license',
          file_url: tradeLicenseUrl,
          registered_name: tradeLicenseName.trim(),
          license_number: tradeLicenseNumber.trim() || null,
          status: 'pending',
        }).then(() => {
          supabase.from('profiles').update({ trade_license_status: 'pending' }).eq('id', userId);
        });
      }
      if (userId && role === 'mechanic') {
        let cvUrl = null;
        if (cvFile) {
          const ext = cvFile.name.split('.').pop()?.toLowerCase() || 'pdf';
          const timestamp = Date.now();
          const random = Math.random().toString(36).slice(2);
          const path = `mechanic-cvs/${userId}-${timestamp}-${random}.${ext}`;

          try {
            const { error: uploadError } = await supabase.storage.from('mechanic-cvs').upload(path, cvFile);
            if (!uploadError) {
              const { data } = supabase.storage.from('mechanic-cvs').getPublicUrl(path);
              cvUrl = data.publicUrl;
            }
          } catch (err) {
            console.error('CV upload error:', err);
          }
        }

        await supabase.from('mechanic_verification_profiles').insert({
          user_id: userId,
          experience_level: mechanicData.experience_level,
          years_experience: mechanicData.years_experience,
          current_location: location,
          educational_status: mechanicData.educational_status,
          driving_license: mechanicData.driving_license,
          hands_on_experience: '',
          expertise_areas: mechanicData.expertise_areas,
          diagnostic_tools: mechanicData.diagnostic_tools,
          owns_service_truck: mechanicData.owns_service_truck,
          employment_status: mechanicData.employment_status,
          company_name: mechanicData.company_name || null,
          willing_travel: mechanicData.willing_travel,
          contact_email: email,
          contact_phone: phone,
          contact_address: mechanicData.contact_address,
          cv_file_url: cvUrl,
        }).catch(() => {});
      }
      navigate('/verify-email-sent', { state: { name, email, userId, referrerId: referralValid ? referrerId : null }, replace: true });
    } else {
      if (role === 'supplier' && tradeLicenseUrl) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.from('supplier_documents').insert({
            user_id: newUser.id,
            document_type: 'trade_license',
            file_url: tradeLicenseUrl,
            registered_name: tradeLicenseName.trim(),
            license_number: tradeLicenseNumber.trim() || null,
            status: 'pending',
          });
          await supabase.from('profiles').update({ trade_license_status: 'pending' }).eq('id', newUser.id);
        }
      }
      if (role === 'mechanic') {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          let cvUrl = null;
          if (cvFile) {
            const ext = cvFile.name.split('.').pop()?.toLowerCase() || 'pdf';
            const timestamp = Date.now();
            const random = Math.random().toString(36).slice(2);
            const path = `mechanic-cvs/${newUser.id}-${timestamp}-${random}.${ext}`;

            try {
              const { error: uploadError } = await supabase.storage.from('mechanic-cvs').upload(path, cvFile);
              if (!uploadError) {
                const { data } = supabase.storage.from('mechanic-cvs').getPublicUrl(path);
                cvUrl = data.publicUrl;
              }
            } catch (err) {
              console.error('CV upload error:', err);
            }
          }

          await supabase.from('mechanic_verification_profiles').insert({
            user_id: newUser.id,
            experience_level: mechanicData.experience_level,
            years_experience: mechanicData.years_experience,
            current_location: location,
            educational_status: mechanicData.educational_status,
            driving_license: mechanicData.driving_license,
            hands_on_experience: '',
            expertise_areas: mechanicData.expertise_areas,
            diagnostic_tools: mechanicData.diagnostic_tools,
            owns_service_truck: mechanicData.owns_service_truck,
            employment_status: mechanicData.employment_status,
            company_name: mechanicData.company_name || null,
            willing_travel: mechanicData.willing_travel,
            contact_email: email,
            contact_phone: phone,
            contact_address: mechanicData.contact_address,
            cv_file_url: cvUrl,
          }).catch(() => {});
        }
      }
      toast.success(t.auth.accountCreated);
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-gray-900" />
            </div>
            <span className="text-white font-bold text-2xl">Equip<span className="text-yellow-400">Link</span></span>
          </Link>
          <h1 className="text-3xl font-black text-white">{t.auth.createAccount}</h1>
          <p className="text-gray-400 mt-2">{t.auth.joinMarketplace}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-3">{t.auth.iAmA}</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_META.map((r) => {
                const labels: Record<string, { label: string; desc: string }> = {
                  owner: { label: t.auth.roleOwner, desc: t.auth.roleOwnerDesc },
                  mechanic: { label: t.auth.roleMechanic, desc: t.auth.roleMechanicDesc },
                  supplier: { label: t.auth.roleSupplier, desc: t.auth.roleSupplierDesc },
                  rental_provider: { label: t.auth.roleRental, desc: t.auth.roleRentalDesc },
                };
                const rl = labels[r.id];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      role === r.id
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <r.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${role === r.id ? r.color : 'text-gray-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${role === r.id ? 'text-white' : 'text-gray-400'}`}>{rl.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{rl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.fullName}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t.auth.fullNamePlaceholder}
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.emailAddress}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.auth.emailPlaceholder}
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.phoneNumber}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.auth.phonePlaceholder}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-4 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.region}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white rounded-lg py-3 pl-10 pr-8 outline-none transition-colors appearance-none"
                >
                  <option value="" className="text-gray-500">{t.auth.selectRegion}</option>
                  {ETHIOPIAN_REGIONS.map((r) => (
                    <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={t.auth.passwordMinChars}
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-10 outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.referralCode}</label>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setReferralCode(val);
                  if (val.length >= 4) checkReferral(val);
                  else { setReferralValid(null); setReferrerId(null); }
                }}
                placeholder={t.auth.referralPlaceholder}
                maxLength={12}
                className="w-full bg-gray-900 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 pl-10 pr-10 outline-none transition-colors font-mono tracking-wider"
              />
              {referralChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              )}
              {!referralChecking && referralValid === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              )}
              {!referralChecking && referralValid === false && (
                <XIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
              )}
            </div>
            {referralValid === true && referrerName && (
              <p className="text-green-400 text-xs mt-1">{t.auth.referredBy} {referrerName} - {t.auth.bothGetCredits}</p>
            )}
            {referralValid === false && referralCode.length >= 4 && (
              <p className="text-red-400 text-xs mt-1">{t.auth.invalidReferralCode}</p>
            )}
          </div>

          {role === 'mechanic' && (
            <div className="space-y-4 bg-gray-900 border border-orange-400/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Professional Mechanic Profile</p>
                  <p className="text-gray-400 text-xs">Complete your professional details for verification</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Experience Level <span className="text-red-400">*</span></label>
                <select
                  value={mechanicData.experience_level}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, experience_level: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                >
                  <option value="">Select experience level</option>
                  <option value="novice">Novice (0-2 years)</option>
                  <option value="intermediate">Intermediate (2-5 years)</option>
                  <option value="advanced">Advanced (5-10 years)</option>
                  <option value="expert">Expert (10+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Years of Experience <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={mechanicData.years_experience}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Educational Status <span className="text-red-400">*</span></label>
                <select
                  value={mechanicData.educational_status}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, educational_status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                >
                  <option value="">Select educational status</option>
                  <option value="high_school">High School</option>
                  <option value="diploma">Diploma/Certificate</option>
                  <option value="bachelors">Bachelor's Degree</option>
                  <option value="masters">Master's Degree</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Driving License <span className="text-red-400">*</span></label>
                <select
                  value={mechanicData.driving_license}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, driving_license: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                >
                  <option value="">Select driving license</option>
                  <option value="none">No License</option>
                  <option value="category_a">Category A (Motorcycle)</option>
                  <option value="category_b">Category B (Car)</option>
                  <option value="category_c">Category C (Truck)</option>
                  <option value="category_d">Category D (Heavy Vehicle)</option>
                  <option value="multiple">Multiple Categories</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Areas of Expertise <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {expertiseOptions.map((expertise) => (
                    <label key={expertise} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mechanicData.expertise_areas.includes(expertise)}
                        onChange={() => toggleExpertise(expertise)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-gray-300 text-xs">{expertise}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Diagnostic Tools <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {diagnosticToolsOptions.map((tool) => (
                    <label key={tool} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mechanicData.diagnostic_tools.includes(tool)}
                        onChange={() => toggleDiagnosticTool(tool)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-gray-300 text-xs">{tool}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition">
                <input
                  type="checkbox"
                  checked={mechanicData.owns_service_truck}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, owns_service_truck: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white font-medium text-sm">I own a service truck</span>
              </label>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Employment Status <span className="text-red-400">*</span></label>
                <select
                  value={mechanicData.employment_status}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, employment_status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white rounded-lg py-2.5 px-3 outline-none transition-colors"
                >
                  <option value="">Select employment status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="looking">Looking for Work</option>
                  <option value="not-available">Not Available</option>
                </select>
              </div>

              {mechanicData.employment_status === 'employed' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">Company Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={mechanicData.company_name}
                    onChange={(e) => setMechanicData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Enter company name"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition">
                <input
                  type="checkbox"
                  checked={mechanicData.willing_travel}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, willing_travel: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white font-medium text-sm">Willing to travel for jobs</span>
              </label>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Contact Address <span className="text-red-400">*</span></label>
                <textarea
                  value={mechanicData.contact_address}
                  onChange={(e) => setMechanicData(prev => ({ ...prev, contact_address: e.target.value }))}
                  placeholder="Street address, district, city..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-orange-400 text-white placeholder-gray-600 rounded-lg py-2.5 px-3 outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">CV/Resume (Optional)</label>
                {cvFile ? (
                  <div className="flex items-center justify-between bg-gray-800 border border-green-600 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">{cvFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-700 bg-gray-800/50 rounded-lg p-4 flex flex-col items-center gap-2">
                    <FileText className="w-6 h-6 text-gray-500" />
                    <p className="text-gray-300 text-sm font-medium">Click to upload CV (PDF/DOC)</p>
                    <button
                      type="button"
                      onClick={() => cvInputRef.current?.click()}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded transition"
                    >
                      Choose File
                    </button>
                  </div>
                )}
                <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCVFileChange} className="hidden" />
              </div>
            </div>
          )}

          {role === 'supplier' && (
            <div className="space-y-4 bg-gray-900 border border-yellow-400/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-semibold text-sm">{t.auth.tradeLicenseTitle}</p>
                  <p className="text-gray-400 text-xs">{t.auth.tradeLicenseDesc}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.registeredBusinessName} <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={tradeLicenseName}
                  onChange={(e) => setTradeLicenseName(e.target.value)}
                  placeholder={t.auth.registeredNamePlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 px-4 outline-none transition-colors"
                />
                {tradeLicenseName && name && tradeLicenseName.trim().toLowerCase() !== name.trim().toLowerCase() && (
                  <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {t.auth.mustMatchName}
                  </p>
                )}
                {tradeLicenseName && name && tradeLicenseName.trim().toLowerCase() === name.trim().toLowerCase() && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {t.auth.nameMatches}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.licenseNumber}</label>
                <input
                  type="text"
                  value={tradeLicenseNumber}
                  onChange={(e) => setTradeLicenseNumber(e.target.value)}
                  placeholder={t.auth.licenseNumberPlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-400 text-white placeholder-gray-600 rounded-lg py-3 px-4 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">{t.auth.tradeLicensePhoto} <span className="text-red-400">*</span></label>
                {tradeLicenseUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
                    <img src={tradeLicenseUrl} alt="Trade License" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={() => setTradeLicenseUrl(null)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-lg"
                    >
                      <XIcon className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-green-400 text-xs">
                      <Check className="w-3.5 h-3.5" /> {t.auth.licenseUploaded}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-700 bg-gray-800/50 rounded-xl p-6 flex flex-col items-center gap-3">
                    {uploadingLicense ? (
                      <>
                        <div className="w-10 h-10 border-2 border-gray-600 border-t-yellow-400 rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm">{t.auth.uploading}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-300 text-sm font-medium text-center">{t.auth.tradeLicensePhotoDesc}</p>
                        <p className="text-gray-500 text-xs">{t.auth.photoFormats}</p>
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                          {Capacitor.isNativePlatform() && (
                            <button type="button" onClick={handleTakeLicensePhoto} className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
                              <CameraIcon className="w-4 h-4" /> {t.auth.takePhoto}
                            </button>
                          )}
                          <button type="button" onClick={() => licenseInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
                            <Upload className="w-4 h-4" /> {Capacitor.isNativePlatform() ? t.auth.chooseFromGallery : t.auth.choosePhoto}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <input ref={licenseInputRef} type="file" accept="image/*" onChange={handleLicenseFileChange} className="hidden" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-gray-900 font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? t.auth.creating : t.auth.createAccount}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          {t.auth.alreadyHaveAccount}{' '}
          <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-medium">{t.auth.signIn}</Link>
        </p>
      </motion.div>
    </div>
  );
}
