import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Mail, Lock, User, Eye, EyeOff, AlertCircle, HardHat, Truck, Package, Phone, MapPin, ChevronDown, Gift, Check, X as XIcon, Upload, FileText, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react';
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
