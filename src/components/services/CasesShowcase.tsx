import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "@/components/landing/BeforeAfterSliderNew";

const cases = [
  {
    before: "/lovable-uploads/case-after-01.jpg",
    after: "/lovable-uploads/case-before-01.webp",
    category: "Продукты",
    title: "Чипсы Lay's",
    conversionGrowth: "+195%",
    ordersChange: "4 → 12",
    description: "Яркая карточка с инфографикой",
  },
  {
    before: "/lovable-uploads/case-after-05.jpg",
    after: "/lovable-uploads/case-before-05.webp",
    category: "Обувь",
    title: "Nike Air Force",
    conversionGrowth: "+210%",
    ordersChange: "5 → 16",
    description: "Акцент на материалы и амортизацию",
  },
  {
    before: "/lovable-uploads/case-after-09.jpg",
    after: "/lovable-uploads/case-before-09.jpg",
    category: "Смартфоны",
    title: "iPhone 17 Pro",
    conversionGrowth: "+260%",
    ordersChange: "4 → 15",
    description: "Революционная карточка с чипом A18",
  },
  {
    before: "/lovable-uploads/case-after-11.jpg",
    after: "/lovable-uploads/case-before-11.jpg",
    category: "Техника",
    title: "Фен Dyson",
    conversionGrowth: "+235%",
    ordersChange: "3 → 12",
    description: "Премиальный дизайн с акцентом на технологии",
  },
];

interface CasesShowcaseProps {
  title?: string;
  subtitle?: string;
}

export const CasesShowcase = ({
  title = "Реальные результаты",
  subtitle = "Кейсы роста конверсии на карточках, созданных с WBGen"
}: CasesShowcaseProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -340 : 340;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(268,30%,8%)] to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(268,83%,40%)] rounded-full blur-[200px] opacity-[0.08]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10"
        >
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4" />
              Кейсы
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {title}
            </h2>
            <p className="text-white/60 text-lg max-w-xl">
              {subtitle}
            </p>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => scrollTo("left")}
              className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollTo("right")}
              className="w-12 h-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Cases carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cases.map((caseItem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[300px] sm:w-[340px] snap-center"
            >
              <div className="glass-card rounded-2xl overflow-hidden h-full border border-white/5 hover:border-white/10 transition-colors">
                <div className="p-4">
                  <BeforeAfterSliderNew
                    beforeImage={caseItem.before}
                    afterImage={caseItem.after}
                    alt={caseItem.title}
                    priority={index === 0}
                  />
                </div>

                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                      {caseItem.category}
                    </span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {caseItem.conversionGrowth}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{caseItem.title}</h3>
                  <p className="text-sm text-white/50 mb-3">{caseItem.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/40">Заказы:</span>
                    <span className="font-semibold text-white">{caseItem.ordersChange}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <Link to="/cases">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-black transition-all">
              Смотреть все кейсы
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};