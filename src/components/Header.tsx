import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Menu, X, Globe, ArrowLeft, ArrowRight, LogIn, LogOut } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  selectedPortalId: string | null;
  onResetToHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  selectedPortalId,
  onResetToHome,
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { user, userProfile, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: t.nav.home },
    { id: 'portals', label: t.nav.portals },
    { id: 'services', label: t.nav.services },
    { id: 'about', label: t.nav.about },
    { id: 'support', label: t.nav.support },
    { id: 'contact', label: t.nav.contact },
  ];

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-2.5'
          : 'bg-white/90 backdrop-blur-sm border-b border-slate-100 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">
          {/* Zone 1: Brand Logo */}
          <button
            onClick={() => {
              onResetToHome();
              onNavigate('home');
            }}
            className="flex items-center gap-2 group text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] rounded-lg p-1"
            aria-label={t.brandName}
          >
            <Logo size="sm" showTagline={true} />
          </button>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav
            className="hidden md:flex items-center gap-1 lg:gap-2"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id && !selectedPortalId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleLinkClick(item.id)}
                  className={`px-3 py-1.5 text-sm font-semibold transition-all rounded-md relative whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#003366] font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#c4152e] rounded-full transition-all" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Language Switcher, Auth Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Button Group */}
            <div
              className="flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5"
              role="group"
              aria-label="Language Selector"
            >
              <button
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  language === 'ar'
                    ? 'bg-[#003366] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'ar'}
              >
                AR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#003366] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
            </div>

            {/* User Account / Sign In State */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => {
                    const roleToPortalMap: Record<string, string> = {
                      doctor: 'doctor',
                      radiology_center: 'radiology',
                      laboratory: 'laboratory',
                      pharmacy: 'pharmacy',
                      patient: 'patient',
                      super_admin: 'super_admin',
                      secretary: 'secretary',
                    };
                    const portalTarget = (userProfile?.role && roleToPortalMap[userProfile.role]) || 'portals';
                    handleLinkClick(portalTarget);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-[#003366] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[110px] truncate">{userProfile?.displayName || user.displayName || user.email?.split('@')[0]}</span>
                </button>
                <button
                  onClick={signOut}
                  title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                <LogIn size={14} className="text-[#003366]" />
                <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
            )}

            {/* Quick Portals CTA Button (Desktop) */}
            <button
              onClick={() => handleLinkClick('portals')}
              className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white brand-gradient-btn shadow-sm hover:shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{t.nav.getStarted}</span>
              {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeSection === item.id && !selectedPortalId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleLinkClick(item.id)}
                  className={`text-start px-3 py-2.5 text-base font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-[#003366] font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100">
                  <span className="text-xs font-bold text-slate-800">{userProfile?.displayName || user.email}</span>
                  <button
                    onClick={signOut}
                    className="text-xs font-bold text-red-600 px-2 py-1"
                  >
                    {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 text-center"
                >
                  {language === 'ar' ? 'تسجيل الدخول عبر Google' : 'Sign In with Google'}
                </button>
              )}
              <button
                onClick={() => handleLinkClick('portals')}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white brand-gradient-btn text-center shadow-sm"
              >
                {t.nav.getStarted}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
