import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withUtm } from "@/lib/utm";

interface ServiceCTAProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badge?: string;
}

export const ServiceCTA = ({
  title = "Готовы начать?",
  subtitle = "Попробуйте WBGen и создайте первые карточки уже сегодня",
  ctaText = "Попробовать",
  ctaLink = "/auth?tab=signup",
  secondaryCtaText,
  secondaryCtaLink,
  badge = "Тысячи селлеров уже собирают карточки в WBGen",
}: ServiceCTAProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section ref={ref} className="section-shell">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(263_70%_18%)_0%,hsl(0_0%_6%)_60%,hsl(0_0%_5%)_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] max-w-[100vw] bg-[hsl(263,90%,50%)] rounded-full blur-[160px] opacity-[0.22]" />
      <div className="absolute inset-0 grid-pattern opacity-[0.07]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/15 mb-7">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(263,90%,75%)]" />
            <span className="text-[12px] sm:text-sm text-white/85">{badge}</span>
          </div>

          <h2 className="font-[Outfit] font-bold text-[2.1rem] sm:text-5xl md:text-6xl text-white mb-5 sm:mb-6 leading-[1.02] tracking-tight">
            {head ? <>{head} <span className="block text-aurora mt-1">{tail}</span></> : <span className="text-aurora">{title}</span>}
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-white/65 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={withUtm(ctaLink)} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-[hsl(263,80%,30%)] hover:bg-white/90 text-base px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-bold shadow-2xl shadow-black/30 group"
              >
                {ctaText}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            {secondaryCtaText && secondaryCtaLink && (
              <Link to={withUtm(secondaryCtaLink)} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] text-base px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-semibold"
                >
                  {secondaryCtaText}
                </Button>
              </Link>
            )}
          </div>
          <p className="text-white/45 text-xs sm:text-sm mt-5">
            Регистрация за 30 сек · Результат сразу · Без скрытых платежей
          </p>
        </motion.div>
      </div>
    </section>
  );
};
