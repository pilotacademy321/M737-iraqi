import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PORTALS_DATA } from '../data/portalsData';
import { PortalId, PortalInfo } from '../types';
import { 
  Stethoscope, 
  Scan, 
  FlaskConical, 
  Pill, 
  User, 
  ShieldCheck, 
  Users, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface PortalCardsSectionProps {
  onSelectPortal: (portalId: PortalId) => void;
}

export const PortalCardsSection: React.FC<PortalCardsSectionProps> = ({
  onSelectPortal,
}) => {
  const { t, isRTL, language } = useLanguage();

  const getPortalIcon = (iconName: string, size = 24) => {
    switch (iconName) {
      case 'doctor':
        return <Stethoscope size={size} />;
      case 'radiology':
        return <Scan size={size} />;
      case 'laboratory':
        return <FlaskConical size={size} />;
      case 'pharmacy':
        return <Pill size={size} />;
      case 'patient':
        return <User size={size} />;
      case 'super_admin':
        return <ShieldCheck size={size} />;
      case 'secretary':
        return <Users size={size} />;
      default:
        return <Stethoscope size={size} />;
    }
  };

  return (
    <section id="portals" className="relative py-16 md:py-24 bg-slate-50">
      {/* Floating Horizontal Strip Inspired by the Design Mockup */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20 mb-12 sm:mb-16">
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/80 bg-white/95">
          <div className="text-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.portalsSection.kicker}
            </span>
          </div>

          {/* Quick-Access Row (Scrollable on small mobile, flex grid on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {PORTALS_DATA.map((portal) => (
              <button
                key={portal.id}
                onClick={() => onSelectPortal(portal.id)}
                className="group flex flex-col items-center text-center p-3 rounded-xl hover:bg-slate-100/80 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#003366] text-balance"
              >
                {/* Circular Icon with Portal-specific Accent Color */}
                <div
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-200 group-hover:scale-110 mb-2.5"
                  style={{ backgroundColor: portal.accentColor }}
                >
                  {getPortalIcon(portal.iconName, 26)}
                </div>

                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#003366] transition-colors leading-tight">
                  {language === 'ar' ? portal.titleAr.replace('بوابة ', '') : portal.titleEn.replace(' Portal', '')}
                </span>

                <span className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                  {language === 'ar' ? portal.subtitleAr : portal.subtitleEn}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003366] mb-2 uppercase tracking-wider">
            <Sparkles size={14} className="text-[#c4152e]" />
            <span>{t.portalsSection.kicker}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.portalsSection.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed text-balance">
            {t.portalsSection.description}
          </p>
        </div>

        {/* 7 Distinct Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {PORTALS_DATA.map((portal) => (
            <div
              key={portal.id}
              className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border ${portal.borderColor} transition-all duration-300 flex flex-col justify-between group relative overflow-hidden`}
            >
              {/* Subtle colored accent top border */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
                style={{ backgroundColor: portal.accentColor }}
              />

              <div>
                {/* Header Row: Icon and Bilingual Titles */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: portal.accentColor }}
                  >
                    {getPortalIcon(portal.iconName, 28)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#003366] transition-colors">
                        {language === 'ar' ? portal.titleAr : portal.titleEn}
                      </h3>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      {language === 'ar' ? portal.titleEn : portal.titleAr}
                    </div>
                  </div>
                </div>

                {/* Subtitle / Focus */}
                <div className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-700 mb-3">
                  {language === 'ar' ? portal.subtitleAr : portal.subtitleEn}
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {language === 'ar' ? portal.descAr : portal.descEn}
                </p>

                {/* Planned Feature Chips */}
                <div className="space-y-1.5 mb-6 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    {language === 'ar' ? 'الوحدات الميدانية المعتمدة:' : 'Core Operational Modules:'}
                  </span>
                  {(language === 'ar' ? portal.plannedModulesAr : portal.plannedModulesEn)
                    .slice(0, 3)
                    .map((module, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: portal.accentColor }} />
                        <span className="truncate">{module}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Button: Opens dedicated portal shell */}
              <button
                onClick={() => onSelectPortal(portal.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:shadow hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: portal.accentColor }}
              >
                <span>{t.portalsSection.openPortal}</span>
                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
