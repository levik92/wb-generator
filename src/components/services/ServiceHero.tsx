import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./Breadcrumbs";

interface Stat {
  value: string;
  label: string;
}

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
}

export const ServiceHero = ({
  title,
  subtitle,
  description,
  stats,
  ctaText = "Попробовать",
  ctaLink = "/auth",
  secondaryCtaText,
  secondaryCtaLink,
  badge,
  breadcrumbs,
  isComingSoon = false,
  heroImage,
  heroImages,
}: ServiceHeroProps) => {
  return (
    <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-24 lg:pt-28 lg:pb-32 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,50%,8%)] via-[hsl(260,40%,6%)] to-[hsl(240,30%,4%)]" />
        
        {/* Soft ambient glow - very subtle */}
        <div 
          className="absolute w-[1200px] h-[1200px] -top-1/2 -left-1/4 rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, hsl(268, 70%, 50%) 0%, transparent 60%)',
          }}
        />
        <div 
          className="absolute w-[900px] h-[900px] top-1/4 -right-1/4 rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, hsl(280, 60%, 45%) 0%, transparent 60%)',
          }}
        />
        
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Very subtle gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(268,70%,50%)/15] to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl lg:pr-8"
          >
            {badge && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-8">
                {badge}
              </span>
            )}

            {isComingSoon && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-sm text-amber-400 mb-8">
                🚧 В разработке
              </span>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              {title}
              <br />
              <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] to-[hsl(280,90%,70%)] bg-clip-text text-transparent">
                {subtitle}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white/50 mb-10 max-w-xl leading-relaxed">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              {!isComingSoon ? (
                <>
                  <Link to={ctaLink}>
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] hover:from-[hsl(268,83%,50%)] hover:to-[hsl(280,90%,50%)] text-white border-0 px-8 py-6 text-lg font-semibold"
                    >
                      {ctaText}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  {secondaryCtaText && secondaryCtaLink && (
                    <Link to={secondaryCtaLink}>
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full sm:w-auto border-white/20 bg-white/5 text-white hover:bg-white hover:text-black transition-all px-8 py-6 text-lg"
                      >
                        {secondaryCtaText}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="rounded-2xl p-6 max-w-md bg-white/[0.03] border border-white/10">
                  <p className="text-white/60 mb-4">
                    Оставьте email и мы сообщим о запуске первыми
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                    />
                    <Button className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] text-white border-0">
                      Подписаться
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {stats && stats.length > 0 && (
              <div className="flex flex-wrap gap-10 sm:gap-14">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1.5">
                      {stat.value}
                    </div>
                    <div className="text-sm text-white/40">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Hero Images - stacked cards showcase - cascade from right to left */}
          {heroImages && heroImages.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-[500px] sm:h-[650px] lg:h-[700px] mt-10 lg:mt-0 -mr-[20%] lg:-mr-[30%] xl:-mr-[35%] overflow-visible"
            >
              {/* Front card (rightmost) */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: 8 }}
                whileHover={{ rotate: 5, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="absolute right-0 top-[5%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-30"
                style={{ boxShadow: "0 40px 80px -20px rgba(139, 92, 246, 0.35), 0 30px 60px -15px rgba(0, 0, 0, 0.5)" }}
              >
                <img src={heroImages[2]} alt="Card 3" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </motion.div>

              {/* Middle card */}
              <motion.div
                initial={{ opacity: 0, x: 30, rotate: -5 }}
                animate={{ opacity: 1, x: 0, rotate: 2 }}
                whileHover={{ rotate: -1, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute right-[18%] lg:right-[20%] top-[10%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-20"
                style={{ boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.5)" }}
              >
                <img src={heroImages[1]} alt="Card 2" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-black/15" />
              </motion.div>

              {/* Back card (leftmost) */}
              <motion.div
                initial={{ opacity: 0, x: 10, rotate: -10 }}
                animate={{ opacity: 1, x: 0, rotate: -5 }}
                whileHover={{ rotate: -8, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute right-[36%] lg:right-[40%] top-[15%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-10"
                style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
              >
                <img src={heroImages[0]} alt="Card 1" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-black/25" />
              </motion.div>

              {/* Decorative glow */}
              <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-[hsl(268,83%,55%)]/15 rounded-full blur-3xl -z-10" />
            </motion.div>
          )}

          {/* Hero Image - extending beyond the edge */}
          {heroImage && !heroImages && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative -mr-[15%] xl:-mr-[20%] 2xl:-mr-[25%] mt-10 lg:mt-0"
            >
              {/* Browser-like frame */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#111111] shadow-2xl shadow-black/40">
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/20" />
                    <div className="w-3 h-3 rounded-full bg-white/15" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-white/25 font-mono">
                      wbgen.ru
                    </div>
                  </div>
                </div>
                
                {/* Image content */}
                <div className="relative">
                  <img 
                    src={heroImage} 
                    alt={title}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/50 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#111111]/30" />
                </div>
              </div>
              
              {/* Subtle glow behind */}
              <div className="absolute -inset-12 bg-gradient-to-br from-[hsl(268,60%,35%)/10] to-[hsl(280,50%,30%)/8] rounded-3xl blur-3xl -z-10" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};