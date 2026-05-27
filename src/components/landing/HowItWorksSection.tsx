import { Image, FileText, Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Image,
    title: "Загрузите фото",
    description: "До 3 фотографий товара. Подойдут даже простые снимки на телефон.",
  },
  {
    number: "02",
    icon: FileText,
    title: "Опишите товар",
    description: "Расскажите о преимуществах и добавьте пожелания по дизайну.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "AI собирает карточки",
    description: "Нейросеть генерирует до 6 профессиональных карточек за 3 минуты.",
  },
  {
    number: "04",
    icon: Check,
    title: "Скачайте результат",
    description: "Получите готовые PNG и сразу загрузите в кабинет Wildberries.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="section-shell">
      <div className="absolute inset-0 grid-pattern opacity-[0.08]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="section-header">
          <span className="section-eyebrow">Простой процесс</span>
          <h2 className="section-title">
            Как собрать карточку{" "}
            <span className="text-aurora">за 3 минуты</span>
          </h2>
          <p className="section-subtitle">
            Четыре шага от фото на телефон до готовой PNG в кабинете Wildberries.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="glass-card rounded-3xl p-6 sm:p-7 relative overflow-hidden"
            >
              <div className="absolute top-5 right-5 text-[2.75rem] font-bold leading-none bg-gradient-to-br from-white/15 to-white/[0.02] bg-clip-text text-transparent tracking-tight">
                {step.number}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/25 mb-5">
                <step.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">
                {step.title}
              </h3>
              <p className="text-sm text-white/55 leading-relaxed">
                {step.description}
              </p>
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2.5 w-5 h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12 relative z-10">
          <Link to="/auth?tab=signup">
            <Button className="btn-premium text-[15px] sm:text-base px-8 py-6 rounded-xl font-semibold group">
              Попробовать
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
