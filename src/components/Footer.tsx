import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { MessageSquare, Mail, Heart, Plane, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => {
  const { t, language } = useLanguage();

  const whatsappHref = 'https://wa.me/9647885663748';
  const emailHref = 'mailto:bcgmoc@gmail.com';

  return (
    <footer className="bg-[#00172e] text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand & Slogan Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="inline-block p-2 rounded-xl bg-white/5 border border-white/10">
              <Logo size="md" showTagline={true} light={true} />
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-sm leading-relaxed">
              {t.footer.brandDesc}
            </p>

            {/* Slogans */}
            <div className="pt-2">
              <div className="text-sm font-bold text-white tracking-wide">
                "{t.footer.slogan}"
              </div>
              <div className="text-xs text-red-400 font-semibold mt-1">
                {t.footer.subSlogan}
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'روابط المنصة' : 'Platform Links'}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {t.nav.home}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('portals')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {t.nav.portals}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('services')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {t.nav.services}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {t.nav.about}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition-colors cursor-pointer text-start text-slate-400 hover:text-slate-200"
                >
                  {t.footer.links.terms}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition-colors cursor-pointer text-start text-slate-400 hover:text-slate-200"
                >
                  {t.footer.links.privacy}
                </button>
              </li>
            </ul>
          </div>

          {/* Official Support Channels Column */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.footer.supportTitle}
            </h4>
            
            <div className="space-y-3 text-xs sm:text-sm">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t.contact.whatsappTitle}</div>
                  <div className="font-bold text-white font-mono">{t.contact.whatsappNumber}</div>
                </div>
              </a>

              <a
                href={emailHref}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t.contact.emailTitle}</div>
                  <div className="font-semibold text-white font-mono break-all">{t.contact.emailAddress}</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Medical-Aviation Motif */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>{t.footer.copyright}</div>

          {/* ECG Pulse & Airplane Motif Icon */}
          <div className="flex items-center gap-2 text-slate-400">
            <span>{t.footer.subSlogan}</span>
            <svg
              viewBox="0 0 80 20"
              className="w-16 h-4 text-red-500 stroke-current fill-none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 0 10 L 20 10 L 26 4 L 32 16 L 38 2 L 44 18 L 48 10 L 60 10" />
            </svg>
            <Plane size={14} className="text-sky-400 -rotate-12" />
          </div>
        </div>
      </div>
    </footer>
  );
};
