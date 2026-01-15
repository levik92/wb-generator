import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,25%)] via-[hsl(268,70%,20%)] to-[hsl(240,10%,6%)]" />
      
      {/* Animated orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(268,83%,50%)] rounded-full blur-[150px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[hsl(220,100%,50%)] rounded-full blur-[180px]"
      />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-10" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[hsl(268,83%,70%)]" />
            <span className="text-sm text-white/90">
              Присоединяйтесь к тысячам продавцов
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6"
          >
            Начните
            <span className="block bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              прямо сейчас
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto"
          >
            Замените дизайнера за 5000₽ на ИИ от 59₽. Профессиональные карточки за 3 минуты.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-12"
          >
            {[
              { value: "₽0", label: "Начало работы", icon: Gift },
              { value: "3 мин", label: "До результата", icon: Zap },
              { value: "+40%", label: "Рост продаж", icon: Sparkles },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="glass-card rounded-2xl p-4 sm:p-6"
              >
                <stat.icon className="w-5 h-5 text-[hsl(268,83%,70%)] mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs text-white/50 leading-tight">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Link to="/auth?tab=signup">
              <Button
                size="lg"
                className="bg-white text-[hsl(268,83%,40%)] hover:bg-white/90 text-sm sm:text-base md:text-lg px-8 sm:px-10 py-5 sm:py-7 rounded-xl font-bold shadow-2xl shadow-black/20 group max-w-full"
              >
                <span className="truncate">Создать первую карточку</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </Button>
            </Link>
            <p className="text-white/50 text-sm mt-6">
              Регистрация за 30 сек • Результат за 3 мин • От 59₽ за карточку
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
