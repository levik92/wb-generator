import { useEffect, ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import "@/styles/landing-theme.css";

interface ServicePageLayoutProps {
  children: ReactNode;
}

export const ServicePageLayout = ({ children }: ServicePageLayoutProps) => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#0d0d0d";
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white landing-dark">
      <div className="noise-overlay" />
      <LandingHeader />
      <main className="relative z-10">{children}</main>
      <LandingFooter />
    </div>
  );
};
