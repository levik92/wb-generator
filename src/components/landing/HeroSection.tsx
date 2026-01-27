import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, X } from "lucide-react";

// Animated counter component
const AnimatedCounter = ({
  target,
  duration = 2000
}: {
  target: number;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, {
      threshold: 0.1
    });
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

// Video Modal Component
const VideoModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{
      scale: 0.9,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} exit={{
      scale: 0.9,
      opacity: 0
    }} className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        {/* Kinescope video embed */}
        <iframe src="https://kinescope.io/embed/8hkzrTcYzVKzQoR1GVvof7" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameBorder="0" allowFullScreen className="absolute w-full h-full top-0 left-0" />
      </motion.div>
    </motion.div>;
};
export const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const stats = [{
    value: 12500,
    label: "карточек создано",
    suffix: "+"
  }, {
    value: 3,
    label: "минуты до результата",
    suffix: " мин"
  }, {
    value: 98,
    label: "довольны результатом",
    suffix: "%"
  }, {
    value: 10,
    label: "дешевле дизайнера",
    suffix: "",
    prefix: "х"
  }];
  return <>
      <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 sm:pt-36 md:pt-44">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-animated" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Floating orbs - simplified, no scroll-based animation */}
        <div className="absolute top-1/4 left-[10%] w-64 h-64 bg-[hsl(268,83%,50%)] rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-[hsl(220,100%,50%)] rounded-full blur-[150px] opacity-15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[hsl(268,83%,40%)] rounded-full blur-[200px] opacity-10" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            {/* Badge */}
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} className="flex justify-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-[hsl(268,83%,65%)]" />
                <span className="text-sm text-white/80 text-center">
                  Нейрокарточки ТОП-дизайнеров "под ключ"   
                </span>
              </div>
            </motion.div>

            {/* Main heading - wider and 2 lines */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.1
          }} className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-4 max-w-5xl mx-auto">
                <span className="text-white">Дизайнерские карточки для </span>
                <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] via-[hsl(280,90%,70%)] to-[hsl(268,83%,65%)] bg-clip-text text-transparent">
                  маркетплейсов
                </span>
                <span className="text-white"> за 3 минуты</span>
              </h1>
            </motion.div>

            {/* Subtitle - smaller font */}
            <motion.p initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.2
           }} className="text-sm sm:text-base md:text-lg text-white/60 text-center max-w-3xl mx-auto mb-8 leading-relaxed">
              Генерируйте продающие карточки, инфографику и SEO-описания для Wildberries, Ozon и Яндекс Маркет.
              <span className="text-white/80"> Без дизайнера и опыта.</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.3
          }} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 sm:mb-12">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="btn-premium text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-semibold group">
                  Создать карточку сейчас
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <button onClick={() => setIsVideoOpen(true)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/5 transition-all">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
                <span className="text-base">Посмотреть демо-видео</span>
              </button>
            </motion.div>

            {/* Stats - MOVED ABOVE Before/After */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.4
          }} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12 sm:mb-16">
              {stats.map((stat, index) => <motion.div key={stat.label} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6,
              delay: 0.5 + index * 0.1
            }} className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.prefix}
                    {stat.value > 0 ? <AnimatedCounter target={stat.value} /> : "0"}
                    {stat.suffix}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/50">{stat.label}</div>
                </motion.div>)}
            </motion.div>

            {/* Before/After Hero - separate images with arrow and rotation */}
            <motion.div initial={{
            opacity: 0,
            y: 40
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 1,
            delay: 0.6
          }} className="max-w-3xl mx-auto mb-16 sm:mb-24">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
                {/* Before Image - слева, iPhone на белом фоне, с красным свечением */}
                <motion.div className="relative group" initial={{
                rotate: -4
              }} whileHover={{
                rotate: 0,
                scale: 1.05
              }} transition={{
                duration: 0.3
              }}>
                  <div className="absolute -inset-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="relative">
                    <img src="/lovable-uploads/5b5d4b79-6091-48ff-a998-27342d80f69d.jpg" alt="До обработки" className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border border-white/10 shadow-2xl" loading="eager" decoding="async" />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-sm text-white/80 font-medium">
                      До
                    </div>
                  </div>
                </motion.div>

                {/* Arrow - указывает вправо */}
                <motion.div animate={{
                x: [0, 10, 0]
              }} transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }} className="text-purple-400">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" className="rotate-90 sm:rotate-0">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>

                {/* After Image - справа, iPhone на тёмном фоне, с фиолетовым свечением */}
                <motion.div className="relative group" initial={{
                rotate: 4
              }} whileHover={{
                rotate: 0,
                scale: 1.05
              }} transition={{
                duration: 0.3
              }}>
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-2xl blur-xl opacity-70 group-hover:opacity-90 transition-opacity" />
                  <div className="relative">
                    <img src="/lovable-uploads/4f805d4a-42df-4fcd-b504-90b42e93f85f.jpg" alt="После обработки" className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border-2 border-purple-500/40 shadow-2xl" loading="eager" decoding="async" />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-purple-500/60 backdrop-blur-sm rounded-lg text-sm text-white font-medium">
                      После
                    </div>
                    {/* Glow effect - simplified, no animation */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-25 -z-10" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 1.5
      }} className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:block">
          <motion.div animate={{
          y: [0, 8, 0]
        }} transition={{
          duration: 2,
          repeat: Infinity
        }} className="w-5 h-8 rounded-full border-2 border-white/20 flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </>;
};