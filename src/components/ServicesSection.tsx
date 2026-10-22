import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PortalId } from '../types';
import { 
  Stethoscope, 
  FlaskConical, 
  Scan, 
  Pill, 
  HeartHandshake, 
  ArrowLeft, 
  ArrowRight,
  Check
} from 'lucide-react';

interface ServicesSectionProps {
  onSelectPortal: (portalId: PortalId) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectPortal,
}) => {
  const { t, isRTL, language } = useLanguage();

  const servicesConfig = [
    {
      id: 'doctor',
      portalId: 'doctor' as PortalId,
      icon: Stethoscope,
      accent: '#dc2626',
      badge: language === 'ar' ? 'القطاع السريري' : 'Clinical Practice',
    },
    {
      id: 'laboratory',
      portalId: 'laboratory' as PortalId,
      icon: FlaskConical,
      accent: '#ea580c',
      badge: language === 'ar' ? 'التشخيص المخبري' : 'Diagnostics & Pathology',
    },
    {
      id: 'radiology',
      portalId: 'radiology' as PortalId,
      icon: Scan,
      accent: '#0891b2',
      badge: language === 'ar' ? 'التصوير الطبي' : 'Medical Imaging',
    },
    {
      id: 'pharmacy',
      portalId: 'pharmacy' as PortalId,
      icon: Pill,
      accent: '#059669',
      badge: language === 'ar' ? 'الدواء والصيدلة' : 'Pharmaceuticals',
    },
    {
      id: 'patient',
      portalId: 'patient' as PortalId,
      icon: HeartHandshake,
      accent: '#0284c7',
      badge: language === 'ar' ? 'خدمة المريض' : 'Patient Experience',
    },
  ];

  return (
    <section id="services" className="py-20 md:py-28 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#003366] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#c4152e]" />
            <span>{t.services.kicker}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.services.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed text-balance">
            {t.services.subtitle}
          </p>
        </div>

        {/* 5 Core Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {t.services.items.map((item, index) => {
            const config = servicesConfig.find((c) => c.portalId === item.portalId) || servicesConfig[0];
            const IconComponent = config.icon;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-lg border border-slate-200 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: config.accent }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {config.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#003366] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onSelectPortal(item.portalId)}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    style={{ color: config.accent }}
                  >
                    <span>
                      {language === 'ar' ? 'عرض البوابة التخصصية' : 'Access Dedicated Portal'}
                    </span>
                    {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                  </button>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Integration Synergy Card */}
          <div className="bg-gradient-to-br from-[#003366] to-[#002244] rounded-2xl p-6 sm:p-7 shadow-sm text-white flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-5 border border-white/20">
                <span className="text-base font-extrabold text-red-400">M737</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {language === 'ar' ? 'التكامل الفوري بين المراكز' : 'Real-time Inter-facility Synergy'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
                {language === 'ar'
                  ? 'منظومة واحدة تلغي الحاجة للأنظمة المتفرقة وتوفر تواصلاً سحابياً آمناً ومباشراً بين الأطباء ومراكز التحاليل والصيدليات في العراق.'
                  : 'A single unified platform eliminating disparate paper silos and enabling authenticated clinical data transfer across Iraqi healthcare providers.'}
              </p>
            </div>
            <div className="pt-4 border-t border-white/20 text-xs text-sky-200 font-semibold">
              {language === 'ar' ? 'موثوقية دقيقة · أمان صحي · فخر وطني' : 'Precision · Medical Integrity · Iraqi Pride'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
