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
      {/* Light gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50/30" />
        
        {/* Soft ambient glow */}
        <div 
          className="absolute w-[1200px] h-[1200px] -top-1/2 -left-1/4 rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, hsl(268, 70%, 70%) 0%, transparent 60%)',
          }}
        />
        <div 
          className="absolute w-[900px] h-[900px] top-1/4 -right-1/4 rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, hsl(280, 60%, 65%) 0%, transparent 60%)',
          }}
        />
        
        {/* Subtle gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-200/30 to-transparent" />
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
              <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-sm text-purple-600 mb-8">
                {badge}
              </span>
            )}

            {isComingSoon && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm text-amber-600 mb-8">
                🚧 В разработке
              </span>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
              {title}
              <br />
              <span className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,60%)] bg-clip-text text-transparent">
                {subtitle}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-500 mb-10 max-w-xl leading-relaxed">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              {!isComingSoon ? (
                <>
                  <Link to={ctaLink}>
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] hover:from-[hsl(268,83%,50%)] hover:to-[hsl(280,90%,50%)] text-white border-0 px-8 py-6 text-lg font-semibold shadow-lg shadow-purple-500/20"
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
                        className="w-full sm:w-auto border-gray-200 text-gray-700 hover:bg-gray-50 transition-all px-8 py-6 text-lg"
                      >
                        {secondaryCtaText}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="rounded-2xl p-6 max-w-md bg-gray-50 border border-gray-200">
                  <p className="text-gray-500 mb-4">
                    Оставьте email и мы сообщим о запуске первыми
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400"
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
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1.5">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Hero Images - stacked cards showcase */}
          {heroImages && heroImages.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-[500px] sm:h-[650px] lg:h-[700px] mt-10 lg:mt-0 -mr-[20%] lg:-mr-[30%] xl:-mr-[35%] overflow-visible"
            >
              {/* Front card */}
              <motion.div
                initial={{ opacity: 0, x: -50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: -8 }}
                whileHover={{ rotate: -5, scale: 1.05, y: -10 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="absolute right-[36%] lg:right-[40%] top-[5%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-30"
                style={{ boxShadow: "0 40px 80px -20px rgba(139, 92, 246, 0.2), 0 30px 60px -15px rgba(0, 0, 0, 0.15)" }}
              >
                <img src={heroImages[0]} alt="Card 1" className="w-full h-full object-cover" />
              </motion.div>

              {/* Middle card */}
              <motion.div
                initial={{ opacity: 0, x: 30, rotate: -5 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                whileHover={{ rotate: 1, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute right-[18%] lg:right-[20%] top-[10%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-20"
                style={{ boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.15)" }}
              >
                <img src={heroImages[1]} alt="Card 2" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-black/5" />
              </motion.div>

              {/* Back card */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 10 }}
                animate={{ opacity: 1, x: 0, rotate: 5 }}
                whileHover={{ rotate: 8, scale: 1.02, y: -5 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute right-0 top-[15%] w-[280px] sm:w-[360px] lg:w-[400px] h-[380px] sm:h-[500px] lg:h-[560px] rounded-3xl overflow-hidden shadow-2xl z-10"
                style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
              >
                <img src={heroImages[2]} alt="Card 3" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-black/10" />
              </motion.div>

              {/* Decorative glow */}
              <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-[hsl(268,83%,70%)]/10 rounded-full blur-3xl -z-10" />
            </motion.div>
          )}

          {/* Hero Image - browser frame */}
          {heroImage && !heroImages && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative -mr-[15%] xl:-mr-[20%] 2xl:-mr-[25%] mt-10 lg:mt-0"
            >
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xl shadow-gray-200/50">
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-gray-100 text-xs text-gray-400 font-mono">
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
                </div>
              </div>
              
              {/* Subtle glow behind */}
              <div className="absolute -inset-12 bg-gradient-to-br from-purple-100/30 to-blue-100/20 rounded-3xl blur-3xl -z-10" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
