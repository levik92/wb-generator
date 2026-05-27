import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, X, Zap, TrendingUp, Clock } from "lucide-react";

const VideoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
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

const trustStats = [
  { icon: Clock, value: "3 мин", label: "до готовой карточки" },
  { icon: TrendingUp, value: "от 59₽", label: "вместо 5000₽ дизайнеру" },
  { icon: Sparkles, value: "120 000+", label: "карточек уже создано" },
  { icon: Zap, value: "10+", label: "стилей и форматов" },
];

export const HeroSection = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <>
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-28 sm:pt-36 pb-16 sm:pb-24">
        {/* Layered noir background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(263_70%_14%)_0%,hsl(0_0%_5%)_55%,hsl(0_0%_4%)_100%)]" />
        <div className="absolute inset-0 grid-pattern opacity-[0.12]" />
        {/* Soft violet orbs (no animation for perf) */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] max-w-[120vw] bg-[hsl(263,90%,50%)] rounded-full blur-[160px] opacity-[0.18]" />
        <div className="absolute bottom-0 right-[5%] w-64 sm:w-96 h-64 sm:h-96 bg-[hsl(290,90%,55%)] rounded-full blur-[140px] opacity-[0.12]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#0d0d0d]" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="flex justify-center mb-6 sm:mb-7 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(263,90%,65%)] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(263,90%,65%)]" />
                </span>
                <span className="text-[12px] sm:text-[13px] text-white/80 tracking-wide">
                  AI-генератор карточек для Wildberries, Ozon, Авито
                </span>
              </div>
            </div>

            {/* Headline (4U: ultra-specific + unique) */}
            <h1
              className="text-[2.1rem] xs:text-[2.4rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-white mb-5 sm:mb-7 animate-fade-in"
              style={{ animationDelay: "80ms" }}
            >
              Карточки, которые
              <br className="hidden sm:block" />{" "}
              <span className="text-aurora">работают на клики и продажи</span>
            </h1>

            {/* Subhead (4U: useful + urgent) */}
            <p
              className="text-base sm:text-lg md:text-xl text-white/65 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed animate-fade-in"
              style={{ animationDelay: "160ms" }}
            >
              AI собирает дизайн карточки за 3 минуты — с фокусом на CTR, рекламу
              и ранжирование. Можно тестировать варианты пачками,{" "}
              <span className="text-white/85">без дизайнера и опыта</span>.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-10 sm:mb-14 animate-fade-in"
              style={{ animationDelay: "240ms" }}
            >
              <Link to="/auth?tab=signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="btn-premium w-full sm:w-auto text-[15px] sm:text-base px-7 sm:px-9 py-6 sm:py-7 rounded-xl font-semibold group"
                >
                  Создать карточку
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#examples" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-[15px] sm:text-base px-7 sm:px-9 py-6 sm:py-7 rounded-xl font-semibold bg-white/[0.03] border-white/15 text-white hover:bg-white/[0.07] hover:border-white/25"
                >
                  Посмотреть примеры
                </Button>
              </a>
            </div>

            {/* Watch demo (small, secondary) */}
            <button
              onClick={() => setIsVideoOpen(true)}
              className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors group mb-12 sm:mb-16 animate-fade-in"
              style={{ animationDelay: "300ms" }}
            >
              <span className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/[0.06] transition-all">
                <Play className="w-3.5 h-3.5 ml-0.5" />
              </span>
              <span className="text-sm">Демо за 60 секунд</span>
            </button>

            {/* Trust stats bento strip */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-4xl mx-auto animate-fade-in"
              style={{ animationDelay: "360ms" }}
            >
              {trustStats.map((s) => (
                <div
                  key={s.label}
                  className="glass-card rounded-2xl p-4 sm:p-5 text-left"
                >
                  <s.icon className="w-4 h-4 text-[hsl(263,90%,75%)] mb-2.5" />
                  <div className="text-xl sm:text-2xl md:text-[28px] font-bold text-white tracking-tight leading-none mb-1.5">
                    {s.value}
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/50 leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Before/After visual proof */}
            <div
              className="mt-14 sm:mt-20 max-w-3xl mx-auto animate-fade-in"
              style={{ animationDelay: "440ms" }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-rose-500/20 to-amber-500/20 rounded-2xl blur-lg opacity-50" />
                  <div className="relative transform -rotate-2 sm:-rotate-3 hover:rotate-0 hover:scale-[1.03] transition-transform duration-300">
                    <img
                      src="/lovable-uploads/before-hero.jpg"
                      alt="Карточка товара до обработки AI"
                      className="w-44 sm:w-56 md:w-72 h-auto rounded-2xl border border-white/10 shadow-2xl"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      width="288"
                      height="384"
                    />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white/85 font-medium">
                      До
                    </div>
                  </div>
                </div>

                <div className="text-[hsl(263,90%,75%)]">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="rotate-90 sm:rotate-0">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[hsl(263,90%,55%)]/40 to-[hsl(290,90%,65%)]/40 rounded-2xl blur-xl opacity-70" />
                  <div className="relative transform rotate-2 sm:rotate-3 hover:rotate-0 hover:scale-[1.03] transition-transform duration-300">
                    <img
                      src="/lovable-uploads/after-hero.jpg"
                      alt="Карточка товара после генерации AI"
                      className="w-44 sm:w-56 md:w-72 h-auto rounded-2xl border-2 border-[hsl(263,90%,55%)]/40 shadow-2xl"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      width="288"
                      height="384"
                    />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-[hsl(263,80%,55%)]/70 backdrop-blur-sm rounded-md text-xs text-white font-medium">
                      После
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </>
  );
};
