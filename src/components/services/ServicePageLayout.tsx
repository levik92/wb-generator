import { useEffect, ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import "@/styles/landing-theme.css";

interface ServicePageLayoutProps {
  children: ReactNode;
}

export const ServicePageLayout = ({ children }: ServicePageLayoutProps) => {
  useEffect(() => {
    // Force dark mode for service pages
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "hsl(240, 10%, 4%)";
    
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(240,10%,4%)] text-white landing-dark">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />
      
      <LandingHeader />
      <main>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
};
