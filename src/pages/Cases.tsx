import "@/styles/landing-theme.css";
import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "@/components/landing/BeforeAfterSliderNew";
import { LandingFooter } from "@/components/landing/LandingFooter";

// Кейсы с изображениями до/после
const cases = [
  {
    id: 1,
    before: "/lovable-uploads/57f9f37f-ed50-4951-8b39-46348cdcd204.jpg",
    after: "/lovable-uploads/1-1.png",
    category: "Электроника",
    title: "Беспроводные наушники",
    conversionGrowth: "+183%",
    ordersChange: "3 → 8",
    designerCost: "3 000₽",
    wbgenCost: "от 59₽",
    savings: "2 941₽",
    description: "Карточка с инфографикой для беспроводных наушников. Добавлены ключевые характеристики и преимущества.",
  },
  {
    id: 2,
    before: "/lovable-uploads/2-2.png",
    after: "/lovable-uploads/2-1.jpg",
    category: "Одежда",
    title: "Женская блузка",
    conversionGrowth: "+250%",
    ordersChange: "2 → 7",
    designerCost: "5 000₽",
    wbgenCost: "от 59₽",
    savings: "4 941₽",
    description: "Стильная карточка с размерной сеткой и описанием материала для женской одежды.",
  },
  {
    id: 3,
    before: "/lovable-uploads/yoga-mat-main.png",
    after: "/lovable-uploads/3-1.webp",
    category: "Спорт",
    title: "Коврик для йоги",
    conversionGrowth: "+153%",
    ordersChange: "4 → 10",
    designerCost: "6 000₽",
    wbgenCost: "от 59₽",
    savings: "5 941₽",
    description: "Карточка с инфографикой о характеристиках и преимуществах коврика для йоги.",
  },
  {
    id: 4,
    before: "/lovable-uploads/4-2.png",
    after: "/lovable-uploads/4-1.webp",
    category: "Дом",
    title: "Товары для дома",
    conversionGrowth: "+197%",
    ordersChange: "5 → 15",
    designerCost: "8 000₽",
    wbgenCost: "от 59₽",
    savings: "7 941₽",
    description: "Детальная карточка товара для дома с указанием особенностей и применения.",
  },
  {
    id: 5,
    before: "/lovable-uploads/clarins-before.jpeg",
    after: "/lovable-uploads/clarins-after.png",
    category: "Косметика",
    title: "Уходовая косметика",
    conversionGrowth: "+210%",
    ordersChange: "6 → 18",
    designerCost: "7 000₽",
    wbgenCost: "от 59₽",
    savings: "6 941₽",
    description: "Премиальная карточка для косметики с акцентом на состав и эффект.",
  },
  {
    id: 6,
    before: "/lovable-uploads/5b5d4b79-6091-48ff-a998-27342d80f69d.jpg",
    after: "/lovable-uploads/headphones-after.png",
    category: "Электроника",
    title: "Наушники премиум",
    conversionGrowth: "+175%",
    ordersChange: "4 → 11",
    designerCost: "5 500₽",
    wbgenCost: "от 59₽",
    savings: "5 441₽",
    description: "Карточка премиум-наушников с детализацией технических характеристик.",
  },
];

const stats = [
  { value: "500+", label: "Созданных карточек" },
  { value: "200%", label: "Средний рост конверсии" },
  { value: "5 000₽", label: "Средняя экономия" },
];

const Cases = () => {
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-50px" });
  const isGridInView = useInView(gridRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // Force dark mode for cases page
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "hsl(240, 10%, 4%)";
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(240,10%,4%)] text-white landing-dark">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[hsl(240,10%,4%)]/80 backdrop-blur-xl border-b border-white/5" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              to="/"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Назад</span>
            </Link>
            
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">WBGen</span>
            </Link>

            <Link to="/auth?tab=signup">
              <Button className="btn-premium text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold">
                Попробовать
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-32">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[hsl(268,83%,58%)]/15 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/10 rounded-full blur-[120px]" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              ref={headerRef}
              initial={{ opacity: 0, y: 30 }}
              animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Реальные результаты клиентов
              </span>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Кейсы и примеры
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)]">
                  наших работ
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10">
                Посмотрите, как WBGen помогает селлерам создавать продающие карточки товаров
                и увеличивать конверсию на Wildberries
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Cases Grid */}
        <section className="relative py-12 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              {cases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isGridInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col">
                    {/* Before/After Slider */}
                    <div className="p-3 sm:p-4">
                      <BeforeAfterSliderNew
                        beforeImage={caseItem.before}
                        afterImage={caseItem.after}
                        alt={caseItem.title}
                      />
                    </div>

                    {/* Content */}
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-1 flex flex-col">
                      {/* Category & Conversion */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                          {caseItem.category}
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                          {caseItem.conversionGrowth}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-lg font-bold text-white mb-2">{caseItem.title}</h3>
                      <p className="text-sm text-white/50 mb-4 flex-1">{caseItem.description}</p>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-white/40 mb-0.5">Заказы</div>
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {caseItem.ordersChange}
                          </div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-red-400/70 mb-0.5">Дизайнер</div>
                          <div className="text-xs sm:text-sm font-bold text-red-400 line-through">
                            {caseItem.designerCost}
                          </div>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-emerald-400/70 mb-0.5">WBGen</div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-400">
                            {caseItem.wbgenCost}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(268,50%,10%)] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(268,83%,50%)]/20 rounded-full blur-[150px]" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[hsl(268,83%,58%)]/20 to-[hsl(280,83%,58%)]/20 border border-[hsl(268,83%,58%)]/30 mb-6">
                <Zap className="w-4 h-4 text-[hsl(268,83%,58%)]" />
                <span className="text-sm font-medium text-white">Начните прямо сейчас</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Создайте такие же результаты
              </h2>
              <p className="text-base sm:text-lg text-white/50 mb-8">
                Зарегистрируйтесь и получите первые карточки уже сегодня
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth?tab=signup">
                  <Button className="btn-premium text-base px-8 py-6 rounded-xl font-semibold group w-full sm:w-auto">
                    Начать бесплатно
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/">
                  <Button 
                    variant="outline" 
                    className="text-base px-8 py-6 rounded-xl font-semibold border-white/20 text-white hover:bg-white/10 w-full sm:w-auto"
                  >
                    На главную
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Cases;
