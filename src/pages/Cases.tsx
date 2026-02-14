import "@/styles/landing-theme.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, TrendingUp, Zap, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeforeAfterSliderNew } from "@/components/landing/BeforeAfterSliderNew";
import { LandingFooter } from "@/components/landing/LandingFooter";

// Все кейсы с изображениями до/после
const allCases = [
  {
    id: 1,
    before: "/lovable-uploads/case-after-01.jpg",
    after: "/lovable-uploads/case-before-01.jpg",
    category: "Продукты",
    title: "Чипсы Lay's",
    conversionGrowth: "+195%",
    ordersChange: "4 → 12",
    designerCost: "1 500₽",
    wbgenCost: "от 59₽",
    savings: "1 441₽",
    description: "Яркая карточка с аппетитной инфографикой и акцентом на вкус и объём упаковки.",
  },
  {
    id: 2,
    before: "/lovable-uploads/case-after-02.jpg",
    after: "/lovable-uploads/case-before-02.jpg",
    category: "Игрушки",
    title: "LEGO Technic Porsche",
    conversionGrowth: "+230%",
    ordersChange: "2 → 9",
    designerCost: "2 200₽",
    wbgenCost: "от 59₽",
    savings: "2 141₽",
    description: "Премиальная карточка с деталями о масштабе, количестве деталей и лицензии.",
  },
  {
    id: 3,
    before: "/lovable-uploads/case-after-03.jpg",
    after: "/lovable-uploads/case-before-03.jpg",
    category: "Электроника",
    title: "Игровые наушники HyperX",
    conversionGrowth: "+183%",
    ordersChange: "3 → 10",
    designerCost: "1 800₽",
    wbgenCost: "от 59₽",
    savings: "1 741₽",
    description: "Динамичная карточка с характеристиками звука и комфорта для геймеров.",
  },
  {
    id: 4,
    before: "/lovable-uploads/case-after-04.jpg",
    after: "/lovable-uploads/case-before-04.jpg",
    category: "Электроника",
    title: "Игровая клавиатура HyperX",
    conversionGrowth: "+175%",
    ordersChange: "4 → 11",
    designerCost: "2 000₽",
    wbgenCost: "от 59₽",
    savings: "1 941₽",
    description: "Карточка с RGB-подсветкой и характеристиками механических клавиш.",
  },
  {
    id: 5,
    before: "/lovable-uploads/case-after-05.jpg",
    after: "/lovable-uploads/case-before-05.jpg",
    category: "Обувь",
    title: "Кроссовки Nike Air Force",
    conversionGrowth: "+210%",
    ordersChange: "5 → 16",
    designerCost: "2 500₽",
    wbgenCost: "от 59₽",
    savings: "2 441₽",
    description: "Стильная карточка с акцентом на материалы, амортизацию и легендарный дизайн.",
  },
  {
    id: 6,
    before: "/lovable-uploads/case-after-06.jpg",
    after: "/lovable-uploads/case-before-06.jpg",
    category: "Дом и сад",
    title: "Искусственная ёлка",
    conversionGrowth: "+245%",
    ordersChange: "3 → 11",
    designerCost: "1 200₽",
    wbgenCost: "от 59₽",
    savings: "1 141₽",
    description: "Праздничная карточка с гирляндой в подарок и акцентом на пышность и размер.",
  },
  {
    id: 7,
    before: "/lovable-uploads/case-after-07.jpg",
    after: "/lovable-uploads/case-before-07.jpg",
    category: "Электроника",
    title: "Игровой ноутбук Lenovo",
    conversionGrowth: "+198%",
    ordersChange: "2 → 8",
    designerCost: "2 300₽",
    wbgenCost: "от 59₽",
    savings: "2 241₽",
    description: "Мощная карточка с характеристиками Intel Core i5, RTX и эффективным охлаждением.",
  },
  {
    id: 8,
    before: "/lovable-uploads/case-after-08.jpg",
    after: "/lovable-uploads/case-before-08.jpg",
    category: "Электроника",
    title: "Apple AirPods",
    conversionGrowth: "+220%",
    ordersChange: "6 → 18",
    designerCost: "1 700₽",
    wbgenCost: "от 59₽",
    savings: "1 641₽",
    description: "Премиальная карточка с акцентом на шумоподавление, MagSafe и 24ч работы.",
  },
  {
    id: 9,
    before: "/lovable-uploads/case-after-09.jpg",
    after: "/lovable-uploads/case-before-09.jpg",
    category: "Смартфоны",
    title: "iPhone 17 Pro",
    conversionGrowth: "+260%",
    ordersChange: "4 → 15",
    designerCost: "2 400₽",
    wbgenCost: "от 59₽",
    savings: "2 341₽",
    description: "Революционная карточка с новым чипом A18, Pro камерами и оригинальным дизайном.",
  },
  {
    id: 10,
    before: "/lovable-uploads/case-after-10.jpg",
    after: "/lovable-uploads/case-before-10.jpg",
    category: "Смартфоны",
    title: "OPPO A5 Pro",
    conversionGrowth: "+185%",
    ordersChange: "5 → 14",
    designerCost: "1 300₽",
    wbgenCost: "от 59₽",
    savings: "1 241₽",
    description: "Стильная карточка с супербыстрой зарядкой 67Вт и премиальным дизайном.",
  },
  {
    id: 11,
    before: "/lovable-uploads/case-after-11.jpg",
    after: "/lovable-uploads/case-before-11.jpg",
    category: "Красота и здоровье",
    title: "Фен Dyson Supersonic",
    conversionGrowth: "+230%",
    ordersChange: "4 → 13",
    designerCost: "2 100₽",
    wbgenCost: "от 59₽",
    savings: "2 041₽",
    description: "Премиальная карточка с акцентом на ионизацию, быструю сушку и 5 насадок.",
  },
  {
    id: 12,
    before: "/lovable-uploads/case-after-12.jpg",
    after: "/lovable-uploads/case-before-12.jpg",
    category: "Одежда",
    title: "Спортивные леггинсы",
    conversionGrowth: "+175%",
    ordersChange: "8 → 22",
    designerCost: "1 600₽",
    wbgenCost: "от 59₽",
    savings: "1 541₽",
    description: "Стильная карточка с акцентом на высокую посадку, пуш-ап и свободу движений.",
  },
  {
    id: 13,
    before: "/lovable-uploads/case-after-13.jpg",
    after: "/lovable-uploads/case-before-13.jpg",
    category: "Одежда",
    title: "Платье женское",
    conversionGrowth: "+190%",
    ordersChange: "6 → 17",
    designerCost: "1 900₽",
    wbgenCost: "от 59₽",
    savings: "1 841₽",
    description: "Яркая карточка с акцентом на 100% хлопок, тренд 2026 и размеры XS-XL.",
  },
  {
    id: 14,
    before: "/lovable-uploads/case-after-14.jpg",
    after: "/lovable-uploads/case-before-14.jpg",
    category: "Бытовая техника",
    title: "Кофемашина BORK",
    conversionGrowth: "+255%",
    ordersChange: "2 → 9",
    designerCost: "2 500₽",
    wbgenCost: "от 59₽",
    savings: "2 441₽",
    description: "Премиальная карточка с акцентом на быстрый нагрев, давление 19 бар и сенсорное управление.",
  },
  {
    id: 15,
    before: "/lovable-uploads/case-after-15.jpg",
    after: "/lovable-uploads/case-before-15.jpg",
    category: "Электроника",
    title: "Apple AirPods Max",
    conversionGrowth: "+240%",
    ordersChange: "3 → 12",
    designerCost: "1 400₽",
    wbgenCost: "от 59₽",
    savings: "1 341₽",
    description: "Премиум карточка с шумоподавлением, пространственным аудио и 20ч работы.",
  },
  {
    id: 16,
    before: "/lovable-uploads/case-after-16.jpg",
    after: "/lovable-uploads/case-before-16.jpg",
    category: "Красота и здоровье",
    title: "Шампунь The Act Everyday",
    conversionGrowth: "+195%",
    ordersChange: "5 → 15",
    designerCost: "2 000₽",
    wbgenCost: "от 59₽",
    savings: "1 941₽",
    description: "Стильная карточка с акцентом на натуральные ингредиенты и ежедневное восстановление.",
  },
  {
    id: 17,
    before: "/lovable-uploads/case-after-17.jpg",
    after: "/lovable-uploads/case-before-17.jpg",
    category: "Красота и здоровье",
    title: "Гель для бровей PÚSY",
    conversionGrowth: "+210%",
    ordersChange: "7 → 20",
    designerCost: "1 100₽",
    wbgenCost: "от 59₽",
    savings: "1 041₽",
    description: "Яркая карточка с суперфиксацией 24/7 и акцентом на все типы бровей.",
  },
  {
    id: 18,
    before: "/lovable-uploads/case-after-18.jpg",
    after: "/lovable-uploads/case-before-18.jpg",
    category: "Зоотовары",
    title: "Dreamies Mix лакомство",
    conversionGrowth: "+180%",
    ordersChange: "10 → 28",
    designerCost: "1 800₽",
    wbgenCost: "от 59₽",
    savings: "1 741₽",
    description: "Аппетитная карточка с хрустящими подушечками, витаминами и менее 2 ккал.",
  },
  {
    id: 19,
    before: "/lovable-uploads/case-after-19.jpg",
    after: "/lovable-uploads/case-before-19.jpg",
    category: "Инструменты",
    title: "Отвёртка SL3x75мм",
    conversionGrowth: "+165%",
    ordersChange: "12 → 32",
    designerCost: "2 200₽",
    wbgenCost: "от 59₽",
    savings: "2 141₽",
    description: "Мощная карточка с CR-V сталью, эргономичной ручкой и точным размером.",
  },
  {
    id: 20,
    before: "/lovable-uploads/case-after-20.jpg",
    after: "/lovable-uploads/case-before-20.jpg",
    category: "Красота и здоровье",
    title: "Выпрямитель Evoque",
    conversionGrowth: "+225%",
    ordersChange: "4 → 14",
    designerCost: "1 500₽",
    wbgenCost: "от 59₽",
    savings: "1 441₽",
    description: "Премиальная карточка с мгновенным нагревом, защитой волос и температурой до 250°C.",
  },
];

const stats = [
  { value: "12500+", label: "Созданных карточек" },
  { value: "208%", label: "Средний рост конверсии" },
  { value: "1 741₽", label: "Средняя экономия" },
];

const ITEMS_PER_PAGE = 6;

const Cases = () => {
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-50px" });
  
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);

  const visibleCases = allCases.slice(0, visibleCount);
  const hasMore = visibleCount < allCases.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, allCases.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  useEffect(() => {
    // Force dark mode for cases page
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  const scrollToContent = () => {
    const gridElement = document.getElementById('cases-grid');
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[#111111]/80 backdrop-blur-xl border-b border-white/5" />
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

            <Link to="/dashboard?tab=pricing">
              <Button className="btn-premium text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold">
                Попробовать
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-32">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-visible min-h-[70vh] flex flex-col justify-center">
          <div className="absolute -top-[200px] left-1/4 w-[600px] h-[600px] bg-[hsl(268,83%,58%)]/15 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/10 rounded-full blur-[120px]" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              ref={headerRef}
              initial={{ opacity: 0, y: 30 }}
              animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto mb-16 sm:mb-20"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Реальные результаты для селлеров
              </span>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Примеры генерации
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)]">
                  на сервисе WBGen
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10">
                Карточки для Wildberries, Ozon и Яндекс Маркет — смотрите результаты наших клиентов
              </p>

              {/* Stats - simplified, no individual animations */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator - simplified */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
            onClick={scrollToContent}
          >
            <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </div>
          </div>
        </section>

        {/* Cases Grid */}
        <section id="cases-grid" className="relative py-12 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              {visibleCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="group"
                >
                  <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col">
                    {/* Before/After Slider */}
                    <div className="p-3 sm:p-4">
                      <BeforeAfterSliderNew
                        beforeImage={caseItem.before}
                        afterImage={caseItem.after}
                        alt={caseItem.title}
                        priority={visibleCases.indexOf(caseItem) < 4}
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
                </div>
              ))}
            </div>

            {/* Load more trigger */}
            {hasMore && (
              <div 
                ref={loadMoreRef} 
                className="flex justify-center py-12"
              >
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-white/50"
                  >
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span>Загрузка...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex flex-col items-center gap-2 text-white/40"
                  >
                    <ChevronDown className="w-6 h-6" />
                    <span className="text-sm">Листайте для загрузки</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* All loaded message */}
            {!hasMore && visibleCount > ITEMS_PER_PAGE && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/40"
              >
                Вы просмотрели все {allCases.length} кейсов
              </motion.div>
            )}
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
                Профессиональный дизайн от 59₽ вместо 5000₽ у дизайнера
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/dashboard?tab=pricing">
                  <Button className="btn-premium text-base px-8 py-6 rounded-xl font-semibold group w-full sm:w-auto">
                    Создать карточку
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/">
                  <Button 
                    variant="outline" 
                    className="text-base px-8 py-6 rounded-xl font-semibold border-white/20 bg-white/5 text-white hover:bg-white/10 w-full sm:w-auto"
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
