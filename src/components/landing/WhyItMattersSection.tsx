import { AlertTriangle, MousePointerClick, Wallet, Repeat } from "lucide-react";
import { SpotlightCard } from "./effects/SpotlightCard";
import illuGrowth from "@/assets/landing/illu-growth.png";

const problems = [
  {
    icon: MousePointerClick,
    title: "Слабая обложка = меньше кликов",
    text: "Первый экран карточки решает, нажмёт ли покупатель. Любительский визуал съедает CTR и эффективность рекламы.",
  },
  {
    icon: Wallet,
    title: "Дизайнер — это дорого и долго",
    text: "5 000–15 000₽ за карточку и 1–3 дня ожидания. На большом каталоге расходы и сроки умножаются.",
  },
  {
    icon: Repeat,
    title: "Тесты вариантов почти не делаются",
    text: "Чтобы найти сильный визуал, нужно собирать варианты. Вручную — лень, дорого и медленно.",
  },
  {
    icon: AlertTriangle,
    title: "Деньги теряются на упаковке, а не на товаре",
    text: "Хороший товар плохо продаётся, потому что визуал не передаёт ценность и не выделяет на полке.",
  },
];

export const WhyItMattersSection = () => {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0d0d0d]" />
      <div className="absolute top-0 left-0 right-0 hairline" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center max-w-6xl mx-auto mb-12 sm:mb-14">
          <div className="text-center lg:text-left max-w-3xl mx-auto lg:mx-0">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[12px] text-white/70 mb-5">
              Почему это важно
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.05]">
              Карточка решает,{" "}
              <span className="text-aurora">купят товар или пройдут мимо</span>
            </h2>
            <p className="text-base sm:text-lg text-white/55">
              На маркетплейсах визуал — это первый продавец. От него зависят клик,
              цена рекламы и место в выдаче.
            </p>
          </div>
          <img
            src={illuGrowth}
            alt="Рост конверсий и продаж"
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
            className="hidden lg:block w-[280px] h-[280px] object-contain animate-[float_6s_ease-in-out_infinite] drop-shadow-[0_20px_50px_hsl(263,90%,40%,0.35)]"
          />
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {problems.map((p) => (
            <SpotlightCard
              key={p.title}
              className="glass-card rounded-2xl p-5 sm:p-6 flex gap-4 sm:gap-5"
            >
              <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                <p.icon className="w-5 h-5 text-[hsl(263,90%,75%)]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                  {p.title}
                </h3>
                <p className="text-sm text-white/55 leading-relaxed">{p.text}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
};
