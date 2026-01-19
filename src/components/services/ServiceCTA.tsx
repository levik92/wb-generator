import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceCTAProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export const ServiceCTA = ({
  title = "Готовы начать?",
  subtitle = "Попробуйте WBGen и создайте первые карточки уже сегодня",
  ctaText = "Попробовать",
  ctaLink = "/auth",
  secondaryCtaText,
  secondaryCtaLink,
}: ServiceCTAProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 sm:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(268,83%,15%)/20] to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="glass-card rounded-3xl p-8 sm:p-12 lg:p-16 text-center max-w-4xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
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
          </div>
        </motion.div>
      </div>
    </section>
  );
};
