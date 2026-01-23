import "@/styles/landing-theme.css";
import { useEffect, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import YandexMetrika from "@/components/YandexMetrika";

// Lazy load below-the-fold sections for better performance
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection").then(m => ({ default: m.FeaturesSection })));
const ExamplesSection = lazy(() => import("@/components/landing/ExamplesSection").then(m => ({ default: m.ExamplesSection })));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const ComparisonSection = lazy(() => import("@/components/landing/ComparisonSection").then(m => ({ default: m.ComparisonSection })));
const FAQSection = lazy(() => import("@/components/landing/FAQSection").then(m => ({ default: m.FAQSection })));
const CTASection = lazy(() => import("@/components/landing/CTASection").then(m => ({ default: m.CTASection })));
const LandingFooter = lazy(() => import("@/components/landing/LandingFooter").then(m => ({ default: m.LandingFooter })));
const PricingTeaser = lazy(() => import("@/components/services/PricingTeaser").then(m => ({ default: m.PricingTeaser })));

// Simple loading placeholder
const SectionLoader = () => (
  <div className="py-20 flex justify-center">
    <div className="w-8 h-8 border-2 border-[hsl(268,83%,60%)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const Landing = () => {
  useEffect(() => {
    // Force dark mode for landing page
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Карточки Wildberries с ИИ — дизайн и инфографика за 3 минуты | WBGen</title>
        <meta
          name="description"
          content="Создавайте продающие карточки для Wildberries за 3 минуты. ИИ-дизайн, инфографика, описания и этикетки без дизайнера."
        />
        <meta property="og:title" content="Карточки Wildberries с ИИ — WBGen" />
        <meta property="og:description" content="Создавайте продающие карточки для Wildberries за 3 минуты. ИИ-дизайн без дизайнера." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <YandexMetrika />
      
      <div className="min-h-screen bg-[#111111] text-white landing-dark">
        {/* Noise overlay for texture */}
        <div className="noise-overlay" />
        
        <LandingHeader />
        <main>
          <HeroSection />
          <Suspense fallback={<SectionLoader />}>
            <FeaturesSection />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <ExamplesSection />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <HowItWorksSection />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <ComparisonSection />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <section id="pricing">
              <PricingTeaser />
            </section>
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <FAQSection />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <CTASection />
          </Suspense>
        </main>
        <Suspense fallback={<SectionLoader />}>
          <LandingFooter />
        </Suspense>
      </div>
    </>
  );
};

export default Landing;
