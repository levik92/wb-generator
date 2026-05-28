import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./Breadcrumbs";
import { AuroraBackground } from "@/components/landing/effects/AuroraBackground";
import { SpotlightCard } from "@/components/landing/effects/SpotlightCard";

interface Stat {
  value: string;
  label: string;
}

// Kept for backward compatibility — accent prop is now ignored, all pages use the unified violet aurora system.
export type AccentTheme = "violet" | "emerald" | "blue" | "amber";

interface ServiceHeroProps {
  title: string;
  subtitle: string;
  description: string;
  stats?: Stat[];
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badge?: string;
  breadcrumbs: { label: string; href?: string }[];
  isComingSoon?: boolean;
  heroImage?: string;
  heroImages?: string[];
  accent?: AccentTheme;
  signature?: ReactNode;
}

export const ServiceHero = ({
  title,
  subtitle,
  description,
  stats,
  ctaText = "Попробовать",
  ctaLink = "/auth?tab=signup",
  secondaryCtaText,
  secondaryCtaLink,
  badge,
  breadcrumbs,
  isComingSoon = false,
  heroImage,
  heroImages,
  signature,
}: ServiceHeroProps) => {
  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
      {/* Landing-style aurora background */}
      <AuroraBackground />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl lg:pr-4"
          >
            {badge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md mb-7">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(263,90%,65%)] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(263,90%,65%)]" />
                </span>
                <span className="text-[12px] sm:text-[13px] text-white/80 tracking-wide">
                  {badge}
                </span>
              </div>
            )}

            {isComingSoon && (
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[12px] text-amber-300 mb-7">
                Скоро в WBGen
              </span>
            )}

            <h1 className="font-[Outfit] text-[2.1rem] sm:text-5xl md:text-6xl lg:text-[3.75rem] font-bold leading-[1.02] tracking-tight text-white mb-5 sm:mb-7">
              {title}
              <br className="hidden sm:block" />{" "}
              <span className="text-aurora">{subtitle}</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/65 mb-9 sm:mb-10 max-w-xl leading-relaxed">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-12">
              <Link to={ctaLink} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="btn-premium w-full sm:w-auto text-[15px] sm:text-base px-7 sm:px-9 py-6 sm:py-7 rounded-xl font-semibold group"
                >
                  {ctaText}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              {secondaryCtaText && secondaryCtaLink && (
                <Link to={secondaryCtaLink} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] text-[15px] sm:text-base px-7 sm:px-9 py-6 sm:py-7 rounded-xl font-semibold"
                  >
                    {secondaryCtaText}
                  </Button>
                </Link>
              )}
            </div>

            {signature && <div className="mb-10">{signature}</div>}

            {stats && stats.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-xl">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                  >
                    <SpotlightCard className="glass-card rounded-2xl p-3.5 sm:p-5 h-full">
                      <div className="text-lg sm:text-2xl md:text-[26px] font-bold text-white tracking-tight leading-none mb-1.5">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/55 leading-tight">
                        {stat.label}
                      </div>
                    </SpotlightCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Hero visuals */}
          {heroImages && heroImages.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="relative h-[500px] sm:h-[650px] lg:h-[700px] mt-6 lg:mt-0 -mr-[20%] lg:-mr-[30%] xl:-mr-[35%] overflow-visible"
            >
              <motion.div
                initial={{ opacity: 0, x: -50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: -8 }}
                whileHover={{ rotate: -5, scale: 1.05, y: -10 }}
                transition={{ duration: 0.8, delay: 0.35 }}
                className="absolute right-[36%] lg:right-[40%] top-[5%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-30"
                style={{ boxShadow: "0 40px 80px -20px hsl(263 90% 50% / 0.45), 0 30px 60px -15px rgba(0,0,0,0.5)" }}
              >
                <img src={heroImages[0]} alt="" className="w-full h-full object-cover" loading="eager" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30, rotate: -5 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                whileHover={{ rotate: 1, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.45 }}
                className="absolute right-[18%] lg:right-[20%] top-[10%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-20"
                style={{ boxShadow: "0 30px 60px -15px rgba(0,0,0,0.5)" }}
              >
                <img src={heroImages[1]} alt="" className="w-full h-full object-cover opacity-90" loading="lazy" />
                <div className="absolute inset-0 bg-black/15" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 10 }}
                animate={{ opacity: 1, x: 0, rotate: 5 }}
                whileHover={{ rotate: 8, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.55 }}
                className="absolute right-0 top-[15%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-10"
                style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
              >
                <img src={heroImages[2]} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" />
                <div className="absolute inset-0 bg-black/25" />
              </motion.div>

              <div className="absolute -bottom-16 right-1/4 w-80 h-80 rounded-full blur-3xl -z-10" style={{ background: "hsl(263 90% 55% / 0.30)" }} />
            </motion.div>
          )}

          {heroImage && !heroImages && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="relative -mr-[15%] xl:-mr-[20%] 2xl:-mr-[25%] mt-6 lg:mt-0"
            >
              <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/20" />
                    <div className="w-3 h-3 rounded-full bg-white/15" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-white/30 font-mono">
                      wbgen.ru
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <img src={heroImage} alt={title} className="w-full h-auto" loading="eager" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/50 via-transparent to-transparent" />
                </div>
              </div>
              <div className="absolute -inset-12 rounded-3xl blur-3xl -z-10" style={{ background: "radial-gradient(circle, hsl(263 90% 50% / 0.22), hsl(290 90% 55% / 0.10))" }} />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
