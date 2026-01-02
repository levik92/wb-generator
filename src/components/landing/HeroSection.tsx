import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { BeforeAfterSliderNew } from "./BeforeAfterSliderNew";

// Animated counter component
const AnimatedCounter = ({ target, duration = 2000 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const steps = 60;
    const increment = target / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count.toLocaleString("ru-RU")}</span>;
};

export const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const stats = [
    { value: 12500, label: "карточек создано", suffix: "+" },
    { value: 3, label: "минуты до результата", suffix: " мин" },
    { value: 98, label: "довольны результатом", suffix: "%" },
    { value: 0, label: "стоимость старта", prefix: "₽" },
  ];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-animated" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Floating orbs */}
      <motion.div
        style={{ y }}
        className="absolute top-1/4 left-[10%] w-64 h-64 bg-[hsl(268,83%,50%)] rounded-full blur-[120px] opacity-20"
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
        className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-[hsl(220,100%,50%)] rounded-full blur-[150px] opacity-15"
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[hsl(268,83%,40%)] rounded-full blur-[200px] opacity-10"
      />

      <motion.div style={{ opacity }} className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-[hsl(268,83%,65%)]" />
              <span className="text-sm text-white/80">
                20 бесплатных токенов при регистрации
              </span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="text-white">Карточки для</span>
              <br />
              <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] via-[hsl(280,90%,70%)] to-[hsl(268,83%,65%)] bg-clip-text text-transparent">
                Wildberries
              </span>
              <br />
              <span className="text-white">за 3 минуты</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-white/60 text-center max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Генерируйте продающие карточки, инфографику, SEO-описания и этикетки.
            <span className="text-white/80"> Без дизайнера и опыта.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link to="/auth?tab=signup">
              <Button
                size="lg"
                className="btn-premium text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-semibold group"
              >
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <button
              onClick={() => document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
            >
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/5 transition-all">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              <span className="text-base">Смотреть примеры</span>
            </button>
          </motion.div>

          {/* Before/After Hero */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="max-w-2xl mx-auto mb-16"
          >
            <BeforeAfterSliderNew
              beforeImage="/lovable-uploads/5b5d4b79-6091-48ff-a998-27342d80f69d.jpg"
              afterImage="/lovable-uploads/4f805d4a-42df-4fcd-b504-90b42e93f85f.jpg"
              alt="Пример генерации карточки"
            />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                className="glass-card rounded-2xl p-4 sm:p-6 text-center"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.prefix}
                  {stat.value > 0 ? <AnimatedCounter target={stat.value} /> : "0"}
                  {stat.suffix}
                </div>
                <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
        >
          <div className="w-1.5 h-3 bg-white/40 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};
