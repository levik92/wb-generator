import { Check, X, Minus } from "lucide-react";

const comparisonData = [
  { feature: "Время на 1 карточку", wbgen: "3 минуты", designer: "1-3 дня", constructor: "1-2 часа" },
  { feature: "Стоимость карточки", wbgen: "от 59₽", designer: "5 000-15 000₽", constructor: "от 990₽*" },
  { feature: "Профессиональный дизайн", wbgen: true, designer: true, constructor: false },
  { feature: "Уникальность", wbgen: true, designer: true, constructor: false },
  { feature: "Инфографика", wbgen: true, designer: true, constructor: "partial" },
  { feature: "SEO-описания", wbgen: true, designer: false, constructor: false },
  { feature: "Правки бесплатно", wbgen: true, designer: false, constructor: true },
  { feature: "Не нужен опыт", wbgen: true, designer: true, constructor: false },
];

const renderValue = (value: boolean | string) => {
  if (value === true)
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[hsl(160,90%,45%)]/15 border border-[hsl(160,90%,45%)]/25 flex items-center justify-center mx-auto">
        <Check className="w-3.5 h-3.5 text-[hsl(160,90%,65%)]" />
      </div>
    );
  if (value === false)
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center mx-auto">
        <X className="w-3.5 h-3.5 text-rose-300" />
      </div>
    );
  if (value === "partial")
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto">
        <Minus className="w-3.5 h-3.5 text-amber-300" />
      </div>
    );
  return <span className="text-xs sm:text-sm text-white/75 text-center block">{value}</span>;
};

export const ComparisonSection = () => {
  return (
    <section className="section-shell">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="section-header">
          <span className="section-eyebrow">Сравнение</span>
          <h2 className="section-title">
            WBGen vs <span className="text-aurora">альтернативы</span>
          </h2>
          <p className="section-subtitle">
            Объективное сравнение способов создания карточек для маркетплейсов.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-3xl overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 p-4 sm:p-6 border-b border-white/10 min-w-[480px] items-center">
              <div className="text-xs sm:text-sm text-white/45 font-medium uppercase tracking-wider">
                Критерий
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[hsl(263,90%,55%)] to-[hsl(280,85%,55%)] shadow-md shadow-[hsl(263,90%,40%)]/30">
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight">WBGen</span>
                </div>
              </div>
              <div className="text-center text-xs sm:text-sm text-white/60 font-medium">Дизайнер</div>
              <div className="text-center text-xs sm:text-sm text-white/60 font-medium">Конструктор</div>
            </div>

            <div className="divide-y divide-white/5 min-w-[480px]">
              {comparisonData.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-4 gap-2 sm:gap-4 p-3.5 sm:p-5 items-center"
                >
                  <div className="text-xs sm:text-sm text-white/75">{row.feature}</div>
                  <div className="flex justify-center">
                    <div className="comparison-highlight rounded-xl px-2.5 py-1.5">
                      {renderValue(row.wbgen)}
                    </div>
                  </div>
                  <div className="flex justify-center">{renderValue(row.designer)}</div>
                  <div className="flex justify-center">{renderValue(row.constructor)}</div>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[11px] sm:text-xs text-white/45 text-center">
                * Подписка в месяц. Бесплатные конструкторы ограничены в функционале и не дают профессионального результата.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
