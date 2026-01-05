import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const comparisonData = [
  {
    feature: "Время на 1 карточку",
    wbgen: "3 минуты",
    designer: "1-3 дня",
    constructor: "1-2 часа",
  },
  {
    feature: "Стоимость карточки",
    wbgen: "от 59₽",
    designer: "5 000-15 000₽",
    constructor: "от 990₽*",
  },
  {
    feature: "Проф. дизайн",
    wbgen: true,
    designer: true,
    constructor: false,
  },
  {
    feature: "Уникальность",
    wbgen: true,
    designer: true,
    constructor: false,
  },
  {
    feature: "Инфографика",
    wbgen: true,
    designer: true,
    constructor: "partial",
  },
  {
    feature: "SEO-описания",
    wbgen: true,
    designer: false,
    constructor: false,
  },
  {
    feature: "Правки бесплатно",
    wbgen: true,
    designer: false,
    constructor: true,
  },
  {
    feature: "Не нужен опыт",
    wbgen: true,
    designer: true,
    constructor: false,
  },
];

const renderValue = (value: boolean | string) => {
  if (value === true) {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-500/20 flex items-center justify-center">
        <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
      </div>
    );
  }
  return <span className="text-xs sm:text-sm text-white/70 text-center">{value}</span>;
};

export const ComparisonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,10%,4%)] via-[hsl(240,8%,6%)] to-[hsl(240,10%,4%)]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-4 sm:mb-6">
            Сравнение
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            WBGen vs альтернативы
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto">
            Объективное сравнение способов создания карточек для Wildberries
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-6 border-b border-white/10 min-w-[400px]">
              <div className="text-xs sm:text-sm text-white/40 font-medium">Критерий</div>
              <div className="text-center">
                <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)]">
                  <span className="text-xs sm:text-sm font-bold text-white">WBGen</span>
                </div>
              </div>
              <div className="text-center text-xs sm:text-sm text-white/60 font-medium">
                Дизайнер
              </div>
              <div className="text-center text-xs sm:text-sm text-white/60 font-medium">
                Конструктор
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5 min-w-[400px]">
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                  className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-6 items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="text-xs sm:text-sm text-white/70">{row.feature}</div>
                  <div className="flex justify-center">
                    <div className="comparison-highlight rounded-lg px-2 sm:px-3 py-1 sm:py-2">
                      {renderValue(row.wbgen)}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {renderValue(row.designer)}
                  </div>
                  <div className="flex justify-center">
                    {renderValue(row.constructor)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer note */}
            <div className="p-3 sm:p-6 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[10px] sm:text-xs text-white/40 text-center">
                * Подписка в месяц. Бесплатные конструкторы ограничены в функционале и не дают профессионального результата.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
