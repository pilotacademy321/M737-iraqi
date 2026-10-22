/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { PortalCardsSection } from './components/PortalCardsSection';
import { PortalShellView } from './components/PortalShellView';
import { ServicesSection } from './components/ServicesSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModals';
import { OnboardingModal } from './components/OnboardingModal';
import { PortalId } from './types';

const MainAppContent: React.FC = () => {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('home');
  const [selectedPortalId, setSelectedPortalId] = useState<PortalId | null>(null);
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    type: 'privacy' | 'terms' | null;
  }>({
    isOpen: false,
    type: null,
  });

  // Handle Hash Navigation on Initial Load & Browser History
  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash.replace('#', '');
      if (hash === 'radiology_center') hash = 'radiology';

      const validPortals: PortalId[] = [
        'doctor',
        'radiology',
        'laboratory',
        'pharmacy',
        'patient',
        'super_admin',
        'secretary',
      ];

      if (validPortals.includes(hash as PortalId)) {
        setSelectedPortalId(hash as PortalId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (['home', 'portals', 'services', 'about', 'support', 'contact'].includes(hash)) {
        setSelectedPortalId(null);
        setActiveSection(hash);
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (!hash) {
        setSelectedPortalId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (sectionId: string) => {
    const validPortals: PortalId[] = [
      'doctor',
      'radiology',
      'laboratory',
      'pharmacy',
      'patient',
      'super_admin',
      'secretary',
    ];

    if (validPortals.includes(sectionId as PortalId)) {
      handleSelectPortal(sectionId as PortalId);
      return;
    }

    setSelectedPortalId(null);
    setActiveSection(sectionId);
    window.location.hash = sectionId;

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPortal = (portalId: PortalId) => {
    setSelectedPortalId(portalId);
    window.location.hash = portalId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetToHome = () => {
    setSelectedPortalId(null);
    window.location.hash = 'home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegal = (type: 'privacy' | 'terms') => {
    setLegalModal({ isOpen: true, type });
  };

  const handleCloseLegal = () => {
    setLegalModal({ isOpen: false, type: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-colors duration-200">
      {/* Global Responsive Navigation Header */}
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        selectedPortalId={selectedPortalId}
        onResetToHome={handleResetToHome}
      />

      {/* Conditional View: Either Dedicated Portal Shell or Full Landing Page */}
      <main className="flex-1">
        {selectedPortalId ? (
          <PortalShellView
            portalId={selectedPortalId}
            onBackToHome={handleResetToHome}
            onSelectPortal={handleSelectPortal}
          />
        ) : (
          <>
            {/* Hero Section */}
            <HeroSection
              onExplorePortals={() => handleNavigate('portals')}
              onNavigate={handleNavigate}
            />

            {/* Seven Independent Portals Showcase */}
            <PortalCardsSection onSelectPortal={handleSelectPortal} />

            {/* Services Section */}
            <ServicesSection onSelectPortal={handleSelectPortal} />

            {/* About Us Section */}
            <AboutSection />

            {/* Support and Contact Section */}
            <ContactSection />
          </>
        )}
      </main>

      {/* Comprehensive Footer */}
      <Footer onNavigate={handleNavigate} onOpenLegal={handleOpenLegal} />

      {/* Legal Terms & Privacy Modal */}
      <LegalModal
        isOpen={legalModal.isOpen}
        type={legalModal.type}
        onClose={handleCloseLegal}
      />

      {/* New User Role Setup & Accreditation Modal */}
      <OnboardingModal />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
