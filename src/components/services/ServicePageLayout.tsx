import { useEffect, ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import "@/styles/landing-theme.css";

interface ServicePageLayoutProps {
  children: ReactNode;
}

export const ServicePageLayout = ({ children }: ServicePageLayoutProps) => {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.style.backgroundColor = "#ffffff";
    window.scrollTo(0, 0);
    
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 landing-light">
      <LandingHeader />
      <main className="relative z-10">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
};
