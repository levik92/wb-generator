import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "./BeforeAfterSliderNew";
import { CaseStudyDialog } from "@/components/cases/CaseStudyDialog";
import { SpotlightCard } from "./effects/SpotlightCard";

const examples = [
  {
    caseId: 2,
    before: "/lovable-uploads/case-after-02.jpg",
    after: "/lovable-uploads/case-before-02.jpg",
    category: "Игрушки",
    conversionGrowth: "+210%",
    ordersChange: "3 → 10",
    designerCost: "1 800₽",
    wbgenCost: "от 59₽",
  },
  {
    caseId: 11,
    before: "/lovable-uploads/case-after-11.jpg",
    after: "/lovable-uploads/case-before-11.jpg",
    category: "Техника",
    conversionGrowth: "+235%",
    ordersChange: "4 → 14",
    designerCost: "2 200₽",
    wbgenCost: "от 59₽",
  },
  {
    caseId: 18,
    before: "/lovable-uploads/case-after-18.jpg",
    after: "/lovable-uploads/case-before-18.jpg",
    category: "Зоотовары",
    conversionGrowth: "+175%",
    ordersChange: "5 → 14",
    designerCost: "1 400₽",
    wbgenCost: "от 59₽",
  },
  {
    caseId: 12,
    before: "/lovable-uploads/case-after-12.jpg",
    after: "/lovable-uploads/case-before-12.jpg",
    category: "Одежда",
    conversionGrowth: "+250%",
    ordersChange: "3 → 11",
    designerCost: "2 100₽",
    wbgenCost: "от 59₽",
  },
];

export const ExamplesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -340 : 340, behavior: "smooth" });
  };

  return (
    <section id="examples" className="section-shell">
      <div className="spotlight-violet opacity-50" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="section-header">
          <span className="section-eyebrow">Реальные результаты</span>
          <h2 className="section-title">
            До и после <span className="text-aurora">генерации</span>
          </h2>
          <p className="section-subtitle">
            Примеры карточек товаров Wildberries, созданных с помощью WBGen
          </p>
        </div>

        {/* Navigation arrows */}
        <div className="flex justify-center sm:justify-end gap-2 mb-5 sm:mb-6 relative z-10">
          <button
            onClick={() => scrollTo("left")}
            className="w-10 h-10 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 hover:bg-white/[0.08] transition-all active:scale-95"
            aria-label="Предыдущий пример"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollTo("right")}
            className="w-10 h-10 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 hover:bg-white/[0.08] transition-all active:scale-95"
            aria-label="Следующий пример"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 relative z-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {examples.map((example, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[340px] snap-center"
            >
              <SpotlightCard className="glass-card rounded-3xl overflow-hidden">
                <div className="p-3 sm:p-4">
                  <BeforeAfterSliderNew
                    beforeImage={example.before}
                    afterImage={example.after}
                    alt={`Пример ${example.category}`}
                    priority={index === 0}
                  />
                </div>

                <div className="px-4 sm:px-5 pb-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] text-white/70">
                      {example.category}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[hsl(160,90%,55%)] tracking-tight">
                      {example.conversionGrowth}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2">
                      <div className="text-[10px] text-white/45 mb-0.5">Заказы</div>
                      <div className="text-xs sm:text-sm font-bold text-white">{example.ordersChange}</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/15 rounded-lg p-2">
                      <div className="text-[10px] text-rose-300/70 mb-0.5">Дизайнер</div>
                      <div className="text-xs sm:text-sm font-bold text-rose-300 line-through">{example.designerCost}</div>
                    </div>
                    <div className="bg-[hsl(160,90%,45%)]/10 border border-[hsl(160,90%,45%)]/15 rounded-lg p-2">
                      <div className="text-[10px] text-[hsl(160,90%,75%)]/80 mb-0.5">WBGen</div>
                      <div className="text-xs sm:text-sm font-bold text-[hsl(160,90%,75%)]">{example.wbgenCost}</div>
                    </div>
                  </div>

                  <CaseStudyDialog caseId={example.caseId}>
                    <button className="w-full text-center text-xs text-[hsl(263,90%,78%)] hover:text-white font-medium flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[hsl(263,80%,58%)]/10 hover:bg-[hsl(263,80%,58%)]/20 border border-[hsl(263,80%,58%)]/20 transition-all">
                      Изучить кейс
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </CaseStudyDialog>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
          <button
            onClick={() => window.open("/cases", "_blank")}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-[15px] border border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.07] hover:border-white/25 transition-all"
          >
            Посмотреть ещё примеры
          </button>
          <Link to="/auth?tab=signup" className="w-full sm:w-auto">
            <Button className="btn-premium w-full sm:w-auto text-[15px] px-7 py-6 rounded-xl font-semibold group">
              Получить такие же результаты
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
