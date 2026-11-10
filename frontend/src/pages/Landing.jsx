import React from 'react';

import PublicNavbar from '../components/layout/PublicNavbar';

import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function Landing({
  onLogin,
  onRegister,
  onNavigateSection,
}) {
  return (
    <main className="flex min-h-screen flex-col bg-white text-navy-900 selection:bg-brand-500 selection:text-white">

      <PublicNavbar
        variant="landing"
        onHome={() =>
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }
        onLogin={onLogin}
        onRegister={onRegister}
        onNavigateSection={onNavigateSection}
      />

      <Hero
        onRegister={onRegister}
      />

      <HowItWorks />

      <Features />

      <PricingSection
        onRegister={onRegister}
      />

      <FAQSection />

      <FinalCTA
        onLogin={onLogin}
        onRegister={onRegister}
      />

      <Footer />

    </main>
  );
}