import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, X } from "lucide-react";

// Video Modal Component - lightweight
const VideoModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe 
          src="https://kinescope.io/embed/8hkzrTcYzVKzQoR1GVvof7" 
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" 
          frameBorder="0" 
          allowFullScreen 
          className="absolute w-full h-full top-0 left-0" 
        />
      </div>
    </div>
  );
};

// Static stats - no counter animation on mobile for performance
const stats = [
  { value: "12 500+", label: "карточек создано" },
  { value: "3 мин", label: "до результата" },
  { value: "98%", label: "довольны результатом" },
  { value: "х10", label: "дешевле дизайнера" },
];

export const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <>
      <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 sm:pt-36 md:pt-44">
        {/* Simplified gradient background - no animation on mobile */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,15%)] via-[hsl(240,10%,6%)] to-[hsl(240,10%,4%)]" />
        
        {/* Grid pattern - reduced opacity on mobile */}
        <div className="absolute inset-0 grid-pattern opacity-20 sm:opacity-30" />
        
        {/* Static orbs - simplified for mobile */}
        <div className="absolute top-1/4 left-[10%] w-48 sm:w-64 h-48 sm:h-64 bg-[hsl(268,83%,50%)] rounded-full blur-[100px] sm:blur-[120px] opacity-15 sm:opacity-20" />
        <div className="absolute bottom-1/4 right-[10%] w-64 sm:w-96 h-64 sm:h-96 bg-[hsl(220,100%,50%)] rounded-full blur-[120px] sm:blur-[150px] opacity-10 sm:opacity-15" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            {/* Badge - CSS animation */}
            <div className="flex justify-center mb-6 sm:mb-8 animate-fade-in">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-[hsl(268,83%,65%)]" />
                <span className="text-sm text-white/80 text-center">
                  Нейрокарточки ТОП-дизайнеров "под ключ"   
                </span>
              </div>
            </div>

            {/* Main heading - CSS animation with stagger */}
            <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-4 max-w-5xl mx-auto">
                <span className="text-white">Дизайнерские карточки для </span>
                <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] via-[hsl(280,90%,70%)] to-[hsl(268,83%,65%)] bg-clip-text text-transparent">
                  маркетплейсов
                </span>
                <span className="text-white"> за 3 минуты</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-white/60 text-center max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
              Генерируйте продающие карточки, инфографику и SEO-описания для Wildberries, Ozon и Яндекс Маркет.
              <span className="text-white/80"> Без дизайнера и опыта.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: '300ms' }}>
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
            </div>

            {/* Stats - Static values, no animation for mobile performance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12 sm:mb-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
              {stats.map((stat) => (
                <div 
                  key={stat.label}
                  className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center"
                >
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Before/After Hero - Optimized images with priority loading */}
            <div className="max-w-3xl mx-auto mb-16 sm:mb-24 animate-fade-in" style={{ animationDelay: '500ms' }}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
                {/* Before Image */}
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur-lg opacity-50" />
                  <div className="relative transform -rotate-2 sm:-rotate-4 hover:rotate-0 hover:scale-105 transition-transform duration-300">
                    <img 
                      src="/lovable-uploads/before-hero.jpg" 
                      alt="До обработки" 
                      className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border border-white/10 shadow-2xl" 
                      loading="eager" 
                      decoding="async"
                      fetchPriority="high"
                      width="320"
                      height="427"
                    />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-sm text-white/80 font-medium">
                      До
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-purple-400 animate-pulse-slow">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" className="rotate-90 sm:rotate-0">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* After Image */}
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-2xl blur-xl opacity-70" />
                  <div className="relative transform rotate-2 sm:rotate-4 hover:rotate-0 hover:scale-105 transition-transform duration-300">
                    <img 
                      src="/lovable-uploads/after-hero.jpg" 
                      alt="После обработки" 
                      className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border-2 border-purple-500/40 shadow-2xl" 
                      loading="eager" 
                      decoding="async"
                      fetchPriority="high"
                      width="320"
                      height="427"
                    />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-purple-500/60 backdrop-blur-sm rounded-lg text-sm text-white font-medium">
                      После
                    </div>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-25 -z-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator - hidden on mobile for cleaner look */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block animate-fade-in" style={{ animationDelay: '1500ms' }}>
          <div className="w-5 h-8 rounded-full border-2 border-white/20 flex justify-center pt-1.5 animate-bounce-slow">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </>
  );
};
