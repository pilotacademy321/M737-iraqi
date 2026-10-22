import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, HeartPulse, Plane, CheckCircle2, Award, Building2 } from 'lucide-react';

export const AboutSection: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <section id="about" className="py-20 md:py-28 bg-white relative overflow-hidden">
      {/* Subtle decorative background watermarks/patterns */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-sky-50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Text Column */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#003366] uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#c4152e]" />
              <span>{t.about.kicker}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.about.title}
            </h2>

            <p className="mt-4 text-base sm:text-lg font-semibold text-[#003366] leading-relaxed">
              {t.about.lead}
            </p>

            <div className="mt-6 space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
            </div>

            {/* Core Values Strip */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {t.about.values.map((val, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#c4152e] shrink-0" />
                    <span>{val.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Iraqi Healthcare Heritage & Aviation Precision Graphic Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-gradient-to-br from-[#002244] via-[#003366] to-[#0a192f] p-8 text-white">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-6">
                  <Plane size={24} className="text-sky-300" />
                </div>

                <span className="text-xs font-bold text-sky-300 uppercase tracking-widest block mb-2">
                  {language === 'ar' ? 'معايير الطيران في خدمة الصحة' : 'Aviation Discipline in Health'}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold mb-4 leading-snug">
                  {language === 'ar'
                    ? 'لماذا اخترنا طراز M737 رمزاً لمشروعنا الطبي؟'
                    : 'Why M737 as our Healthcare Symbol?'}
                </h3>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6">
                  {language === 'ar'
                    ? 'في الطيران، لا مجال للخطأ، فكل إجراء مدقق بقائمة فحص محكمة. هذا بالضبط ما يحتاجه القطاع الصحي في العراق: دقة بالغة في نتائج التحاليل، سرعة في استلام صور الأشعة، وصرف دقيق للوصفات الطبية.'
                    : 'In aviation, safety is governed by rigorous checklists and zero-compromise coordination. We bring that exact standard to Iraqi healthcare: exact diagnostic results, zero delay in imaging transfers, and error-free prescription dispensing.'}
                </p>

                <div className="pt-6 border-t border-white/15 space-y-3">
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-100">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <span>{language === 'ar' ? 'اعتماد أعلى معايير أمان البيانات والخصوصية' : 'Highest medical data security & confidentiality'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-100">
                    <Building2 size={18} className="text-sky-400 shrink-0" />
                    <span>{language === 'ar' ? 'تغطية للمستشفيات والعيادات والمراكز الأهلية' : 'Connecting private clinics, labs, and hospitals'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-100">
                    <HeartPulse size={18} className="text-red-400 shrink-0" />
                    <span>{language === 'ar' ? 'التركيز على راحة المريض وسلامته كأولوية قصوى' : 'Patient comfort and well-being as the ultimate compass'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
