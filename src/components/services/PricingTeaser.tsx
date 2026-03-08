import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PricingTeaser = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const highlights = [
    "От 59₽ за карточку",
    "Безлимитные этикетки",
    "10 токенов при регистрации",
    "Без подписки — платите когда нужно"
  ];

  return (
    <section ref={ref} className="py-16 sm:py-24 relative overflow-hidden">
      {/* Background glow only - no static gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[hsl(268,83%,50%)]/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            Простое ценообразование
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Тарифы для любых задач
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Платите только за то, что используете. Без скрытых комиссий и обязательных подписок.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass-card rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="w-8 h-8 text-[hsl(268,83%,65%)]" />
            <span className="text-4xl sm:text-5xl font-bold text-white">от 990₽</span>
          </div>
          <p className="text-white/60 mb-8">за пакет токенов</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left max-w-md mx-auto">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <Link to="/pricing">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] hover:from-[hsl(268,83%,50%)] hover:to-[hsl(280,90%,50%)] text-white border-0 px-8 py-6 text-lg font-semibold"
            >
              Смотреть все тарифы
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
