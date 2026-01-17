import "@/styles/landing-theme.css";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ExamplesSection } from "@/components/landing/ExamplesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingTeaser } from "@/components/services/PricingTeaser";
import YandexMetrika from "@/components/YandexMetrika";

const Landing = () => {
  useEffect(() => {
    // Force dark mode for landing page
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "hsl(240, 10%, 4%)";
    
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
      
      <div className="min-h-screen bg-[hsl(240,10%,4%)] text-white landing-dark">
        {/* Noise overlay for texture */}
        <div className="noise-overlay" />
        
        <LandingHeader />
        <main>
          <HeroSection />
          <FeaturesSection />
          <ExamplesSection />
          <HowItWorksSection />
          <ComparisonSection />
          <section id="pricing">
            <PricingTeaser />
          </section>
          <FAQSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Landing;
