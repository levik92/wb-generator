import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "./BeforeAfterSliderNew";

// SWAPPED: before and after images are now switched
const examples = [
  {
    before: "/lovable-uploads/57f9f37f-ed50-4951-8b39-46348cdcd204.jpg",
    after: "/lovable-uploads/1-1.png",
    category: "Электроника",
    conversionGrowth: "+183%",
    ordersChange: "3 → 8",
    designerCost: "3 000₽",
    wbgenCost: "от 59₽",
    savings: "2 941₽",
  },
  {
    before: "/lovable-uploads/2-2.png",
    after: "/lovable-uploads/2-1.jpg",
    category: "Одежда",
    conversionGrowth: "+250%",
    ordersChange: "2 → 7",
    designerCost: "5 000₽",
    wbgenCost: "от 59₽",
    savings: "4 941₽",
  },
  {
    before: "/lovable-uploads/yoga-mat-main.png",
    after: "/lovable-uploads/3-1.webp",
    category: "Спорт",
    conversionGrowth: "+153%",
    ordersChange: "4 → 10",
    designerCost: "6 000₽",
    wbgenCost: "от 59₽",
    savings: "5 941₽",
  },
  {
    before: "/lovable-uploads/4-2.png",
    after: "/lovable-uploads/4-1.webp",
    category: "Дом",
    conversionGrowth: "+197%",
    ordersChange: "5 → 15",
    designerCost: "8 000₽",
    wbgenCost: "от 59₽",
    savings: "7 941₽",
  },
];

export const ExamplesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -340 : 340;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section id="examples" className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,10%,4%)] via-[hsl(240,8%,6%)] to-[hsl(240,10%,4%)]" />
      
      {/* Accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(268,83%,40%)] rounded-full blur-[200px] opacity-10" />

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
            Реальные результаты
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            До и после генерации
          </h2>
          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto">
            Примеры карточек товаров Wildberries, созданных с помощью WBGen
          </p>
        </motion.div>

        {/* Navigation arrows - visible on all screens */}
        <div className="flex justify-center sm:justify-end gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => scrollTo("left")}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollTo("right")}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile scroll hint */}
        <div className="flex items-center justify-center gap-2 mb-4 sm:hidden">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <span className="text-xs text-white/40">Листайте для просмотра</span>
        </div>

        {/* Examples carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-6 sm:pb-8 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {examples.map((example, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-center"
            >
              <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden">
                {/* Before/After Slider */}
                <div className="p-3 sm:p-4">
                  <BeforeAfterSliderNew
                    beforeImage={example.before}
                    afterImage={example.after}
                    alt={`Пример ${example.category}`}
                  />
                </div>

                {/* Stats */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 sm:px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs text-white/70">
                      {example.category}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                      {example.conversionGrowth}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-[9px] sm:text-[10px] text-white/40 mb-0.5">Заказы</div>
                      <div className="text-xs sm:text-sm font-bold text-white">
                        {example.ordersChange}
                      </div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-2">
                      <div className="text-[9px] sm:text-[10px] text-red-400/70 mb-0.5">Дизайнер</div>
                      <div className="text-xs sm:text-sm font-bold text-red-400 line-through">
                        {example.designerCost}
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-2">
                      <div className="text-[9px] sm:text-[10px] text-emerald-400/70 mb-0.5">WBGen</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-400">
                        {example.wbgenCost}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => window.open("/cases", "_blank")}
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base border border-white/20 text-white hover:bg-white/10 transition-all"
          >
            Посмотреть ещё примеры
          </button>
          <Link to="/auth?tab=signup">
            <Button className="btn-premium text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 rounded-xl font-semibold group">
              Получить такие же результаты
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
