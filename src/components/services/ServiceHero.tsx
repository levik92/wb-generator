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
}

export const ServiceHero = ({
  title,
  subtitle,
  description,
  stats,
  ctaText = "Попробовать бесплатно",
  ctaLink = "/auth",
  secondaryCtaText,
  secondaryCtaLink,
  badge,
  breadcrumbs,
  isComingSoon = false,
  heroImage,
}: ServiceHeroProps) => {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(268,83%,15%)/30] via-transparent to-transparent" />
        
        {/* Animated mesh gradient */}
        <div className="absolute inset-0">
          <div 
            className="absolute w-[800px] h-[800px] -top-40 -left-40 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, hsl(268, 83%, 50%) 0%, transparent 70%)',
              animation: 'pulse-glow 8s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] top-20 right-0 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, hsl(280, 90%, 55%) 0%, transparent 70%)',
              animation: 'pulse-glow 10s ease-in-out infinite reverse',
            }}
          />
          <div 
            className="absolute w-[500px] h-[500px] bottom-0 left-1/3 rounded-full opacity-25"
            style={{
              background: 'radial-gradient(circle, hsl(250, 80%, 50%) 0%, transparent 70%)',
              animation: 'pulse-glow 12s ease-in-out infinite',
            }}
          />
        </div>
        
        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, hsl(268, 83%, 60%) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 8s linear infinite',
          }}
        />
      </div>
      
      {/* Animated orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[hsl(268,83%,60%)/15] rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[hsl(280,90%,50%)/10] rounded-full blur-3xl animate-float-reverse" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            {badge && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
                {badge}
              </span>
            )}

            {isComingSoon && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-sm text-amber-400 mb-6">
                🚧 В разработке
              </span>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {title}
              <br />
              <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] to-[hsl(280,90%,70%)] bg-clip-text text-transparent">
                {subtitle}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-2xl">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
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
                        className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg"
                      >
                        {secondaryCtaText}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="glass-card rounded-xl p-6 max-w-md">
                  <p className="text-white/70 mb-4">
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
              <div className="flex flex-wrap gap-8 sm:gap-12">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-white/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Hero Image */}
          {heroImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20">
                <img 
                  src={heroImage} 
                  alt={title}
                  className="w-full h-auto rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,10%,4%)/50] to-transparent" />
              </div>
              {/* Glow effect behind image */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[hsl(268,83%,50%)/30] to-[hsl(280,90%,50%)/30] rounded-3xl blur-2xl -z-10" />
            </motion.div>
          )}
        </div>
      </div>
      
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
};
