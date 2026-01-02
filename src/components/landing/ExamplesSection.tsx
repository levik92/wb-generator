import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "./BeforeAfterSliderNew";

const examples = [
  {
    before: "/lovable-uploads/1-1.png",
    after: "/lovable-uploads/57f9f37f-ed50-4951-8b39-46348cdcd204.jpg",
    category: "Электроника",
    conversionGrowth: "+183%",
    ordersChange: "3 → 8",
    savings: "2 941₽",
  },
  {
    before: "/lovable-uploads/2-1.jpg",
    after: "/lovable-uploads/2-2.png",
    category: "Одежда",
    conversionGrowth: "+250%",
    ordersChange: "2 → 7",
    savings: "4 941₽",
  },
  {
    before: "/lovable-uploads/3-1.webp",
    after: "/lovable-uploads/yoga-mat-main.png",
    category: "Спорт",
    conversionGrowth: "+153%",
    ordersChange: "4 → 10",
    savings: "5 941₽",
  },
  {
    before: "/lovable-uploads/4-1.webp",
    after: "/lovable-uploads/4-2.png",
    category: "Дом",
    conversionGrowth: "+197%",
    ordersChange: "5 → 15",
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
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section id="examples" className="relative py-24 sm:py-32 overflow-hidden">
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
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            Реальные результаты
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            До и после генерации
          </h2>
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto">
            Примеры карточек товаров Wildberries, созданных с помощью WBGen
          </p>
        </motion.div>

        {/* Navigation arrows for desktop */}
        <div className="hidden md:flex justify-end gap-2 mb-6">
          <button
            onClick={() => scrollTo("left")}
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollTo("right")}
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Examples carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {examples.map((example, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="flex-shrink-0 w-[320px] sm:w-[380px] snap-center"
            >
              <div className="glass-card rounded-3xl overflow-hidden">
                {/* Before/After Slider */}
                <div className="p-4">
                  <BeforeAfterSliderNew
                    beforeImage={example.before}
                    afterImage={example.after}
                    alt={`Пример ${example.category}`}
                  />
                </div>

                {/* Stats */}
                <div className="px-6 pb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                      {example.category}
                    </span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {example.conversionGrowth}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-white/40 mb-1">Заказов/день</div>
                      <div className="text-lg font-bold text-white">
                        {example.ordersChange}
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-xl p-3">
                      <div className="text-xs text-emerald-400/70 mb-1">Экономия</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {example.savings}
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
          className="text-center mt-12"
        >
          <Link to="/auth?tab=signup">
            <Button className="btn-premium text-base sm:text-lg px-8 py-6 rounded-xl font-semibold group">
              Получить такие же результаты
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
