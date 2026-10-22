import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare, Mail, Headphones, Send, CheckCircle2, ArrowUpRight, Phone } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const whatsappHref = 'https://wa.me/9647885663748';
  const emailHref = 'mailto:bcgmoc@gmail.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى ملء الحقول الأساسية (الاسم، البريد الإلكتروني، تفاصيل الاستفسار).'
          : 'Please complete all required fields (Name, Email, Inquiry details).'
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#003366] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#c4152e]" />
            <span>{t.contact.kicker}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.contact.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed text-balance">
            {t.contact.subtitle}
          </p>
        </div>

        {/* 2-Column Grid: Contact Channels & Direct Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Official Direct Contact Channels Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* WhatsApp Card */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/90 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide block">
                      {t.contact.whatsappTitle}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-wider mt-0.5 block">
                      {t.contact.whatsappNumber}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-700 shadow-xs group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <p className="mt-3 text-xs text-emerald-900 leading-relaxed">
                {language === 'ar'
                  ? 'تواصل مباشر وسريع مع فريق الدعم الفني لـ M737 عبر تطبيق واتساب.'
                  : 'Fast direct chat with the M737 technical coordination desk via WhatsApp.'}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span>{t.contact.whatsappAction}</span>
              </div>
            </a>

            {/* Email Card */}
            <a
              href={emailHref}
              className="block bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/90 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#003366] text-white flex items-center justify-center shadow-md shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#003366] uppercase tracking-wide block">
                      {t.contact.emailTitle}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 block break-all">
                      {t.contact.emailAddress}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#003366] shadow-xs group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'للمراسلات الرسمية واستفسارات انضمام المراكز الصحية والكوادر الطبية.'
                  : 'For official inquiries, facility onboarding proposals, and technical support.'}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#003366]">
                <span>{t.contact.emailAction}</span>
              </div>
            </a>

            {/* Support Desk Status Box */}
            <div id="support" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Headphones size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {t.contact.supportBadge}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {language === 'ar'
                    ? 'فريق الدعم الفني جاهز لمساندة الأطباء والمختبرات والمراجعين لضمان استمرارية الخدمات وسلاسة الاستخدام على مدار الساعة.'
                    : 'Our technical support desk is dedicated to assisting clinicians, labs, and patients around the clock.'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
              {t.contact.formTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              {t.contact.formDesc}
            </p>

            {submitted ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-emerald-200 shadow-xs animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">
                  {t.contact.successTitle}
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {t.contact.successMessage}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', phone: '', role: '', message: '' });
                  }}
                  className="mt-6 px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {language === 'ar' ? 'إرسال استفسار آخر' : 'Send Another Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'الاسم / المركز *' : 'Name / Facility *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.contact.namePlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t.contact.emailPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'رقم الهاتف (واتساب)' : 'Phone Number (WhatsApp)'}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="07XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'الصفة / القطاع' : 'Healthcare Role'}
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
                    >
                      <option value="">{language === 'ar' ? '-- اختر الصفة --' : '-- Select Role --'}</option>
                      <option value="doctor">{language === 'ar' ? 'طبيب / عيادة' : 'Physician / Clinic'}</option>
                      <option value="lab">{language === 'ar' ? 'مختبر تحاليل' : 'Clinical Laboratory'}</option>
                      <option value="radiology">{language === 'ar' ? 'مركز أشعة وسونار' : 'Radiology Center'}</option>
                      <option value="pharmacy">{language === 'ar' ? 'صيدلية' : 'Pharmacy'}</option>
                      <option value="patient">{language === 'ar' ? 'مراجع / مريض' : 'Patient / Public'}</option>
                      <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'تفاصيل الاستفسار *' : 'Inquiry Message *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.messagePlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white brand-gradient-btn shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Send size={16} />
                  <span>{loading ? t.contact.submittingBtn : t.contact.submitBtn}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
