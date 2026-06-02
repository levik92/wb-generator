import { ShoppingBag, Briefcase, Paintbrush, GraduationCap } from "lucide-react";
import { SpotlightCard } from "./effects/SpotlightCard";

const audiences = [
  {
    icon: ShoppingBag,
    title: "Селлерам",
    text: "Быстрее запускать товары, больше вариантов для тестов, сильнее визуальная упаковка — выше шанс улучшить рекламу и продажи.",
    accents: ["Меньше затрат на дизайн", "Быстрый старт новых товаров", "Готово к загрузке на WB и Ozon"],
  },
  {
    icon: Briefcase,
    title: "Менеджерам МП",
    text: "Готовьте карточки для клиентов и товаров без зависимости от дизайнеров — закрывайте задачи за вечер, а не за неделю.",
    accents: ["Карточка за 3 минуты", "Несколько проектов параллельно", "Единый стандарт качества"],
  },
  {
    icon: Paintbrush,
    title: "Дизайнерам",
    text: "Используйте AI как генератор идей и основ. Делайте больше заказов, ускоряйте сборку и оставляйте время на финальную полировку.",
    accents: ["Генерация концептов", "Готовые исходники", "Больше клиентов в работе"],
  },
  {
    icon: GraduationCap,
    title: "Новичкам",
    text: "Войдите в профессию дизайнера карточек без портфолио и многолетнего опыта — собирайте сильные работы с первого дня.",
    accents: ["Без опыта в графике", "Подсказки и шаблоны", "Понятный интерфейс"],
  },
];

export const AudienceSection = () => {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0d0d0d]" />
      <div className="spotlight-violet opacity-60" />
      <div className="absolute top-0 left-0 right-0 hairline" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[12px] text-white/70 mb-5">
            Для кого
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.05]">
            WBGen — для тех, кто{" "}
            <span className="text-aurora">отвечает за визуал товара</span>
          </h2>
          <p className="text-base sm:text-lg text-white/55">
            Селлеры, менеджеры маркетплейсов, дизайнеры карточек и новички в
            профессии — каждый получает свою выгоду.
          </p>
        </div>



        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {audiences.map((a) => (
            <SpotlightCard
              key={a.title}
              className="glass-card rounded-2xl p-5 sm:p-7"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/25">
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {a.title}
                </h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                {a.text}
              </p>
              <ul className="flex flex-wrap gap-2">
                {a.accents.map((t) => (
                  <li
                    key={t}
                    className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] text-white/70"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
};
