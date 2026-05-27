import { Link } from "react-router-dom";
import { ArrowRight, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  "От 59₽ за карточку",
  "Безлимитные этикетки",
  "10 токенов при регистрации",
  "Без подписки — платите когда нужно",
];

export const PricingTeaser = () => {
  return (
    <section className="section-shell">
      <div className="spotlight-violet opacity-60" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="section-header">
          <span className="section-eyebrow">Простое ценообразование</span>
          <h2 className="section-title">
            Тарифы для <span className="text-aurora">любых задач</span>
          </h2>
          <p className="section-subtitle">
            Платите только за то, что используете. Без скрытых комиссий и обязательных подписок.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto text-center relative z-10">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <Zap className="w-7 h-7 text-[hsl(263,90%,75%)] self-center" />
            <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight">от 990₽</span>
          </div>
          <p className="text-white/55 text-sm sm:text-base mb-8">за пакет токенов</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-9 text-left max-w-md mx-auto">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[hsl(263,90%,55%)] to-[hsl(280,90%,55%)] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/75 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <Link to="/pricing">
            <Button className="btn-premium text-[15px] sm:text-base px-8 py-6 rounded-xl font-semibold group">
              Смотреть все тарифы
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
