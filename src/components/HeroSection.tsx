import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { ArrowLeft, ArrowRight, ShieldCheck, Activity, Plane, Users } from 'lucide-react';

interface HeroSectionProps {
  onExplorePortals: () => void;
  onNavigate: (sectionId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExplorePortals,
  onNavigate,
}) => {
  const { t, isRTL, language } = useLanguage();

  return (
    <section
      id="home"
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden min-h-[85vh] flex items-center justify-center bg-slate-900"
    >
      {/* Background Layer: High-resolution visual from reference image + rich gradient scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/aistudio/file_00000000e02881f491ce61d40dce3857_6ade987b.png"
          alt="M737 Iraqi Medical Platform Background"
          className="w-full h-full object-cover object-center opacity-65 scale-100 transition-transform duration-1000"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Elegant gradient fallback if image path is unavailable
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {/* Soft daylight and sunset atmospheric scrims to preserve 4.5:1 text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/70" />
      </div>

      {/* Decorative Iraqi River & Aviation Glow Elements */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Subtle Brand Slogan Pill (Clean unboxed metadata) */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-semibold mb-6 shadow-sm">
          <Plane size={15} className="text-sky-300" />
          <span>{t.hero.badge}</span>
          <span className="opacity-40">|</span>
          <span className="text-red-300 font-bold">{t.hero.slogan}</span>
        </div>

        {/* Central Prominent Brand Mark */}
        <div className="mb-6 p-4 rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl border border-white/80 inline-flex items-center justify-center">
          <Logo size="lg" showTagline={true} />
        </div>

        {/* Primary Arabic Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight md:leading-snug max-w-4xl drop-shadow-md text-balance">
          {t.hero.headline}
        </h1>

        {/* Primary Subtitle */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-slate-100 font-medium max-w-3xl leading-relaxed drop-shadow text-balance">
          {t.hero.subtitle}
        </p>

        {/* Secondary Bilingual Parallel Subtitle for Immediate Dual-Readability */}
        <p className="mt-2 text-xs sm:text-sm md:text-base text-slate-300 font-normal max-w-2xl text-balance">
          {language === 'ar' ? t.hero.secondarySubtitle : t.hero.secondarySubtitle}
        </p>

        {/* Primary CTA Button: Get Started */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button
            onClick={onExplorePortals}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base sm:text-lg font-bold text-white brand-gradient-btn shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <span>{t.hero.getStartedBtn}</span>
            <span className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              {isRTL ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
            </span>
          </button>

          <button
            onClick={() => onNavigate('services')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.hero.learnMoreBtn}</span>
          </button>
        </div>

        {/* Trust Metrics / Micro-Indicators Strip */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 w-full max-w-3xl text-start">
          <div className="p-3.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.hero.stats.portalsCount}</div>
              <div className="text-xs text-slate-300">{t.hero.stats.portalsDesc}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.hero.stats.iraqCoverage}</div>
              <div className="text-xs text-slate-300">{t.hero.stats.iraqCoverageDesc}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.hero.stats.precision}</div>
              <div className="text-xs text-slate-300">{t.hero.stats.precisionDesc}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
