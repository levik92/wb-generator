import { ArrowRight, Sparkles, Zap, Gift, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "./effects/SpotlightCard";
import illuRocket from "@/assets/landing/illu-rocket.png";

export const CTASection = () => {
  return (
    <section className="section-shell">
      {/* Noir + violet gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(263_70%_18%)_0%,hsl(0_0%_6%)_60%,hsl(0_0%_5%)_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] max-w-[100vw] bg-[hsl(263,90%,50%)] rounded-full blur-[160px] opacity-[0.22]" />
      <div className="absolute inset-0 grid-pattern opacity-[0.07]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/15 mb-7">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(263,90%,75%)]" />
            <span className="text-[12px] sm:text-sm text-white/85">
              Тысячи селлеров уже собирают карточки в WBGen
            </span>
          </div>

          <h2 className="font-[Outfit] font-bold text-[2.1rem] sm:text-5xl md:text-6xl lg:text-7xl text-white mb-5 sm:mb-6 leading-[1.02] tracking-tight">
            Соберите первую карточку
            <span className="block text-aurora mt-1">за 3 минуты</span>
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-white/65 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            Профессиональный визуал, инфографика и SEO-описание — без
            дизайнера, шаблонов и подписок на ПО.
          </p>


          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-2xl mx-auto mb-10 sm:mb-12">
            {[
              { value: "от 59₽", label: "за карточку", icon: Gift },
              { value: "3 мин", label: "до результата", icon: Zap },
              { value: "+87%", label: "рост CTR", icon: TrendingUp },
            ].map((stat) => (
              <SpotlightCard
                key={stat.label}
                className="glass-card rounded-2xl p-3.5 sm:p-5"
              >
                <stat.icon className="w-4 h-4 text-[hsl(263,90%,75%)] mx-auto mb-2" />
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-0.5 leading-tight">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55 leading-tight">
                  {stat.label}
                </div>
              </SpotlightCard>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?tab=signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-[hsl(263,80%,30%)] hover:bg-white/90 text-base px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-bold shadow-2xl shadow-black/30 group"
              >
                Попробовать WBGen
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#examples" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.1] text-base px-8 sm:px-10 py-6 sm:py-7 rounded-xl font-semibold"
              >
                Посмотреть примеры
              </Button>
            </a>
          </div>
          <p className="text-white/45 text-xs sm:text-sm mt-5">
            Регистрация за 30 сек · Результат сразу · Экономия в 12+ раз
          </p>
        </div>
      </div>
    </section>
  );
};

