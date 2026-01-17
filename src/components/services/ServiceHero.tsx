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
}: ServiceHeroProps) => {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(268,83%,15%)/20] to-transparent" />
      
      {/* Animated orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[hsl(268,83%,60%)/15] rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[hsl(280,90%,50%)/10] rounded-full blur-3xl animate-float-reverse" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <Breadcrumbs items={breadcrumbs} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
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
      </div>
    </section>
  );
};
