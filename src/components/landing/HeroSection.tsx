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

// Static stats
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
        {/* Light gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50/30" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-40" />
        
        {/* Soft orbs */}
        <div className="absolute top-1/4 left-[10%] w-48 sm:w-64 h-48 sm:h-64 bg-[hsl(268,83%,70%)] rounded-full blur-[100px] sm:blur-[120px] opacity-10 sm:opacity-15" />
        <div className="absolute bottom-1/4 right-[10%] w-64 sm:w-96 h-64 sm:h-96 bg-[hsl(220,100%,70%)] rounded-full blur-[120px] sm:blur-[150px] opacity-8 sm:opacity-10" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-6 sm:mb-8 animate-fade-in">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-200 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-[hsl(268,83%,55%)]" />
                <span className="text-sm text-gray-700 text-center">
                  Нейрокарточки ТОП-дизайнеров "под ключ"   
                </span>
              </div>
            </div>

            {/* Main heading */}
            <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-4 max-w-5xl mx-auto">
                <span className="text-gray-900">Дизайнерские карточки для </span>
                <span className="bg-gradient-to-r from-[hsl(268,83%,55%)] via-[hsl(280,90%,60%)] to-[hsl(268,83%,55%)] bg-clip-text text-transparent">
                  маркетплейсов
                </span>
                <span className="text-gray-900"> за 3 минуты</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-gray-500 text-center max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
              Генерируйте продающие карточки, инфографику и SEO-описания для Wildberries, Ozon и Яндекс Маркет.
              <span className="text-gray-700"> Без дизайнера и опыта.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Link to="/auth?tab=signup">
                <Button size="lg" className="btn-premium text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-semibold group">
                  Создать карточку сейчас
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <button onClick={() => setIsVideoOpen(true)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors group">
                <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-purple-400 group-hover:bg-purple-50 transition-all">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
                <span className="text-base">Посмотреть демо-видео</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12 sm:mb-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
              {stats.map((stat) => (
                <div 
                  key={stat.label}
                  className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center"
                >
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Before/After Hero */}
            <div className="max-w-3xl mx-auto mb-16 sm:mb-24 animate-fade-in" style={{ animationDelay: '500ms' }}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
                {/* Before Image */}
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-red-200/40 to-orange-200/40 rounded-2xl blur-lg opacity-50" />
                  <div className="relative transform -rotate-2 sm:-rotate-4 hover:rotate-0 hover:scale-105 transition-transform duration-300">
                    <img 
                      src="/lovable-uploads/before-hero.jpg" 
                      alt="До обработки" 
                      className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border border-gray-200 shadow-2xl shadow-gray-300/30" 
                      loading="eager" 
                      decoding="async"
                      fetchPriority="high"
                      width="320"
                      height="427"
                    />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-sm text-gray-600 font-medium shadow-sm">
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
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-300/30 to-pink-300/30 rounded-2xl blur-xl opacity-70" />
                  <div className="relative transform rotate-2 sm:rotate-4 hover:rotate-0 hover:scale-105 transition-transform duration-300">
                    <img 
                      src="/lovable-uploads/after-hero.jpg" 
                      alt="После обработки" 
                      className="w-52 sm:w-64 md:w-80 h-auto rounded-2xl border-2 border-purple-300/50 shadow-2xl shadow-purple-200/30" 
                      loading="eager" 
                      decoding="async"
                      fetchPriority="high"
                      width="320"
                      height="427"
                    />
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-[hsl(268,83%,55%)]/90 backdrop-blur-sm rounded-lg text-sm text-white font-medium">
                      После
                    </div>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-15 -z-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block animate-fade-in" style={{ animationDelay: '1500ms' }}>
          <div className="w-5 h-8 rounded-full border-2 border-gray-300 flex justify-center pt-1.5 animate-bounce-slow">
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </>
  );
};
