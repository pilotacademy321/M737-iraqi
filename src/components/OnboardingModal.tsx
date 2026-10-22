import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import { 
  User, 
  Stethoscope, 
  Scan, 
  FlaskConical, 
  Pill, 
  Users, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  CheckCircle2,
  FileCheck2,
  Lock
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { user, needsOnboarding, registerAsPatient, applyForProfessionalRole, signOut, loading, authError } = useAuth();
  const { language, isRTL } = useLanguage();

  const [selectedType, setSelectedType] = useState<'patient' | 'professional'>('patient');
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [governorate, setGovernorate] = useState('بغداد (Baghdad)');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!needsOnboarding || !user) return null;

  const governoratesList = [
    'بغداد (Baghdad)',
    'البصرة (Basra)',
    'أربيل (Erbil)',
    'النجف الأشرف (Najaf)',
    'كربلاء المقدسة (Karbala)',
    'نينوى / الموصل (Nineveh)',
    'السليمانية (Sulaymaniyah)',
    'بابل / الحلة (Babylon)',
    'الأنبار (Anbar)',
    'ديالى (Diyala)',
    'كركوك (Kirkuk)',
    'ذي قار / الناصرية (Dhi Qar)',
    'ميسان / العمارة (Maysan)',
    'المثنى / السماوة (Muthanna)',
    'القادسية / الديوانية (Qadisiyyah)',
    'واسط / الكوت (Wasit)',
    'صلاح الدين (Saladin)',
    'دهوك (Duhok)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!displayName.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please provide full name');
      return;
    }

    if (selectedType === 'patient') {
      await registerAsPatient(displayName, phone);
    } else {
      if (!licenseNumber.trim() || !facilityName.trim() || !phone.trim()) {
        setFormError(
          language === 'ar'
            ? 'يرجى إكمال بيانات الترخيص المهني واسم المنشأة ورقم الهاتف'
            : 'Please complete license number, facility name, and phone'
        );
        return;
      }

      await applyForProfessionalRole({
        role: selectedRole,
        displayName,
        licenseNumber,
        facilityName,
        governorate,
        phone,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 text-start">
        {/* Header */}
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#003366] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 size={24} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {language === 'ar' ? 'تهيئة وتحديد صفة الحساب' : 'Account Setup & Role Selection'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {language === 'ar'
              ? 'مرحباً بك في منصة M737 الطبية. يرجى اختيار نوع حسابك لاستكمال تفعيل واجهتك المخصصة.'
              : 'Welcome to M737 Medical Platform. Select your profile type to configure your dedicated workspace.'}
          </p>
        </div>

        {/* Security Invariant Callout */}
        <div className="mt-4 p-3 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-2">
          <Lock size={14} className="text-[#003366] shrink-0" />
          <span>
            {language === 'ar'
              ? 'هوية موثقة عبر Firebase Authentication UID. وصول المرضى مجاني ومباشر، والمهن الطبية تتطلب تدقيق الترخيص.'
              : 'Secured via Firebase UID. Patient access is free & instant; healthcare providers require accreditation review.'}
          </span>
        </div>

        {/* Error notification */}
        {(formError || authError) && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Step 1: Type Selection: Patient vs Healthcare Professional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {language === 'ar' ? 'نوع الحساب المطلوب:' : 'Account Category:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedType('patient')}
                className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex items-start gap-3 ${
                  selectedType === 'patient'
                    ? 'border-[#0284c7] bg-sky-50/60 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{language === 'ar' ? 'حساب مريض / مراجع' : 'Patient / Public'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {language === 'ar' ? 'مجاني ومباشر' : 'Free Instant'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'ar'
                      ? 'للمواطنين لحجز المواعيد واستعراض نتائج التحاليل والبحث عن الأدوية.'
                      : 'For individuals booking doctor appointments and tracking health records.'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('professional')}
                className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex items-start gap-3 ${
                  selectedType === 'professional'
                    ? 'border-[#003366] bg-slate-50 ring-2 ring-[#003366]/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{language === 'ar' ? 'منشأة أو كادر صحي' : 'Healthcare Professional'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {language === 'ar' ? 'يتطلب اعتماد' : 'Verification'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'ar'
                      ? 'للأطباء والمختبرات ومراكز الأشعة والصيدليات والكوادر الإدارية.'
                      : 'For doctors, clinical labs, imaging centers, pharmacies, and desk coordinators.'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Sub-roles for Healthcare Professional */}
          {selectedType === 'professional' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {language === 'ar' ? 'اختر التخصص / القطاع الصحي:' : 'Select Healthcare Specialization:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { role: 'doctor' as UserRole, labelAr: 'طبيب اختصاص', labelEn: 'Medical Doctor', icon: Stethoscope, color: 'text-red-600' },
                  { role: 'radiology_center' as UserRole, labelAr: 'مركز أشعة وسونار', labelEn: 'Radiology Center', icon: Scan, color: 'text-cyan-600' },
                  { role: 'laboratory' as UserRole, labelAr: 'مختبر تحاليل', labelEn: 'Clinical Laboratory', icon: FlaskConical, color: 'text-orange-600' },
                  { role: 'pharmacy' as UserRole, labelAr: 'صيدلية أهلية', labelEn: 'Pharmacy', icon: Pill, color: 'text-emerald-600' },
                  { role: 'secretary' as UserRole, labelAr: 'سكرتير / استقبال', labelEn: 'Clinic Secretary', icon: Users, color: 'text-blue-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isChosen = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setSelectedRole(item.role)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isChosen
                          ? 'border-[#003366] bg-slate-100 font-bold text-slate-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={20} className={item.color} />
                      <span className="text-xs">{language === 'ar' ? item.labelAr : item.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Fields */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم الكامل أو الاسم التجاري *' : 'Full Name or Organization Name *'}
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={language === 'ar' ? 'د. أحمد علي / م. النور' : 'Dr. Ahmed Ali / Al-Noor Center'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الهاتف (واتساب للتواصل)' : 'Phone / WhatsApp'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            {selectedType === 'professional' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'رقم ترخيص النقابة / الإجازة *' : 'Syndicate / Practice License *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="IQ-MED-XXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'اسم العيادة / المركز / الصيدلية *' : 'Facility / Practice Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder={language === 'ar' ? 'عيادة بغداد التخصصية' : 'Baghdad Specialty Clinic'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
                  >
                    {governoratesList.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white brand-gradient-btn shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading
                ? language === 'ar'
                  ? 'جاري الحفظ والتهيئة...'
                  : 'Saving...'
                : selectedType === 'patient'
                ? language === 'ar'
                  ? 'تفعيل حساب المريض والدخول'
                  : 'Activate & Enter'
                : language === 'ar'
                ? 'إرسال طلب الاعتماد المهني'
                : 'Submit Verification Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
