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
    document.body.style.backgroundColor = "#111111";
    
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />
      
      {/* Subtle animated gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div 
          className="absolute w-[800px] h-[800px] -top-1/4 -left-1/4 rounded-full animate-[pulse_15s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(circle, hsl(268, 50%, 25%) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] top-1/2 -right-1/4 rounded-full animate-[pulse_20s_ease-in-out_infinite_2s]"
          style={{
            background: 'radial-gradient(circle, hsl(280, 50%, 20%) 0%, transparent 70%)',
          }}
        />
      </div>
      
      <LandingHeader />
      <main className="relative z-10">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
};
