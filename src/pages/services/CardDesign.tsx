import { Helmet } from "react-helmet-async";
import {
  ServicePageLayout,
  ServiceHero,
  ServiceFeatures,
  ServiceFAQ,
  ServiceCTA,
  RelatedServices,
  BenefitsSection,
  StepsSection,
  TestimonialsSection,
  StatsSection,
  StackedCardsShowcase,
  CasesShowcase,
} from "@/components/services";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Clock,
  TrendingUp,
  Palette,
  Image,
  Zap,
  FileText,
  Video,
  Barcode,
  Upload,
  Wand2,
  Download,
  Users,
  ShoppingCart,
  Award,
  Target,
  CheckCircle,
  ArrowRight,
  Star,
  Layers,
  Shield,
  MousePointer,
} from "lucide-react";
import heroImage from "@/assets/service-cards-hero.jpg";

const features = [
  {
    icon: Sparkles,
    title: "Нейросеть WBGEN AI Vision",
    description: "Продвинутый ИИ анализирует ваш товар и создаёт дизайн, который продаёт. Учитывает нишу, конкурентов и тренды маркетплейса",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Clock,
    title: "Готово за 3 минуты",
    description: "Полный комплект из 6 карточек создаётся за время, которое вы потратите на заваривание кофе. Без ожидания дизайнера",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Palette,
    title: "1000+ стилей дизайна",
    description: "Нейросеть сама подберёт подходящий стиль для вашей категории товара — от минимализма до премиум-оформления",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Layers,
    title: "Инфографика и иконки",
    description: "ИИ добавляет продающие элементы: иконки преимуществ, инфографику, акценты на УТП товара",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Target,
    title: "A/B-тестирование",
    description: "Генерируйте несколько вариантов и тестируйте, какой дизайн приносит больше продаж",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Shield,
    title: "Уникальность 100%",
    description: "Каждая карточка создаётся индивидуально. Никаких шаблонов — только уникальный дизайн для вашего товара",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Загрузите фото товара",
    description: "Добавьте качественную фотографию на белом или нейтральном фоне. Минимум 800x800 пикселей для лучшего результата",
    icon: Upload,
  },
  {
    number: "02",
    title: "Опишите товар и его преимущества",
    description: "Укажите название, категорию и ключевые УТП. Чем больше информации — тем точнее дизайн попадёт в цель",
    icon: FileText,
  },
  {
    number: "03",
    title: "Выберите стиль оформления",
    description: "Нейросеть автоматически подберёт визуальный стиль из 1000+ вариантов под вашу категорию товара",
    icon: Wand2,
  },
  {
    number: "04",
    title: "Скачайте готовые PNG",
    description: "Получите комплект из 6 карточек в высоком разрешении (900x1200 px), готовых для загрузки на WB и Ozon",
    icon: Download,
  },
];

const benefits = [
  {
    title: "Экономия 50 000₽+ в месяц на дизайне",
    description: "Один дизайнер берёт 3-5000₽ за карточку и работает неделю. С WBGen — от 59₽ за карточку и 3 минуты времени",
  },
  {
    title: "CTR выше на 40-60%",
    description: "Профессиональная инфографика выделяет вашу карточку в каталоге. Больше кликов = больше продаж",
  },
  {
    title: "Конверсия в покупку +25%",
    description: "Качественные карточки с УТП и инфографикой вызывают доверие и мотивируют к покупке",
  },
  {
    title: "Единый брендинг для всех товаров",
    description: "Создавайте узнаваемый стиль. Покупатели запоминают ваш магазин и возвращаются снова",
  },
  {
    title: "Запуск новых SKU за часы, не недели",
    description: "Выводите товары на маркетплейс быстрее конкурентов. Время — деньги в e-commerce",
  },
];

const stats = [
  { value: "120 000+", label: "карточек создано", icon: Image },
  { value: "22 000+", label: "активных селлеров", icon: Users },
  { value: "+47%", label: "средний рост CTR", icon: TrendingUp },
  { value: "4.9/5", label: "оценка сервиса", icon: Award },
];

const testimonials = [
  {
    name: "Анна Кузнецова",
    role: "Селлер косметики, 1500+ SKU",
    content: "Платила дизайнеру 3500₽ за карточку и ждала 5-7 дней. Теперь делаю сама за 5 минут, и честно — результат лучше! CTR вырос с 2.1% до 3.4% на главных позициях.",
    rating: 5,
  },
  {
    name: "Михаил Демидов",
    role: "Поставщик электроники",
    content: "Запустил 50 новых SKU за месяц благодаря WBGen. Раньше это заняло бы 3-4 месяца работы с дизайнером. Карточки выглядят профессионально, продажи пошли сразу.",
    rating: 5,
  },
  {
    name: "Елена Соколова",
    role: "Продавец одежды, бренд SOKOLOVA",
    content: "Удобно, что можно выбирать стили под разные категории. Для платьев — Luxury, для casual — Minimal. Покупатели замечают и лучше кликают. Выручка выросла на 28%.",
    rating: 5,
  },
];

const faqItems = [
  {
    question: "Как ИИ создаёт дизайн карточки?",
    answer: "Вы загружаете фото товара, указываете категорию и описываете преимущества. Нейросеть WBGEN AI Vision анализирует изображение, понимает тип товара и создаёт профессиональный дизайн с инфографикой, иконками и продающими элементами. Весь процесс занимает 2-3 минуты.",
  },
  {
    question: "Сколько стоит создание одной карточки?",
    answer: "Стоимость зависит от пакета токенов. Минимальная цена — от 59₽ за карточку при покупке большого пакета. При регистрации вы получаете токены для тестирования. Смотрите актуальные тарифы на странице цен.",
  },
  {
    question: "Какие форматы изображений поддерживаются?",
    answer: "Загружайте изображения в форматах JPG, PNG, WebP. Рекомендуемое разрешение — от 800x800 пикселей. Готовые карточки скачиваются в формате PNG 900x1200 пикселей — оптимальный размер для Wildberries.",
  },
  {
    question: "Можно ли редактировать готовые карточки?",
    answer: "Да! Вы можете перегенерировать отдельные карточки из набора, изменить стиль или описание. Также доступна функция редактирования — изменение отдельных элементов готовой карточки.",
  },
  {
    question: "Подходят ли карточки для Ozon и других маркетплейсов?",
    answer: "Да, созданные карточки универсальны. PNG-файлы 900x1200 пикселей подходят для Wildberries, Ozon, Яндекс.Маркет и других площадок. При необходимости размер легко изменить в любом редакторе.",
  },
  {
    question: "Что если результат не понравится?",
    answer: "Вы можете перегенерировать карточку с другими настройками неограниченное количество раз. Если генерация не удалась по техническим причинам — токены возвращаются автоматически.",
  },
  {
    question: "Как быстро я получу карточки?",
    answer: "Генерация одного комплекта из 6 карточек занимает 2-3 минуты. Вы можете запустить несколько генераций параллельно и получить десятки карточек за час.",
  },
  {
    question: "Нужны ли дизайнерские навыки?",
    answer: "Нет! WBGen создан для селлеров без опыта в дизайне. Просто загрузите фото, опишите товар и выберите стиль — всё остальное сделает ИИ.",
  },
];

const relatedServices = [
  {
    title: "SEO-описания",
    description: "Генерация продающих описаний с ключевыми словами для роста в поиске WB",
    href: "/seo-opisaniya",
    icon: FileText,
  },
  {
    title: "Генератор ШК",
    description: "Бесплатные штрихкоды и этикетки CODE-128 для Wildberries",
    href: "/generator-shk",
    icon: Barcode,
  },
  {
    title: "Видео-генерация",
    description: "ИИ-создание видеообложек для карточек товаров",
    href: "/video-generaciya",
    icon: Video,
  },
];

// Comparison section component
const ComparisonSection = () => (
  <section className="py-16 sm:py-24 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          WBGen vs Дизайнер-фрилансер
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto">
          Сравните и сделайте правильный выбор для вашего бизнеса
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 border-2 border-[hsl(268,83%,50%)]/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">WBGen</h3>
              <p className="text-[hsl(268,83%,65%)] text-sm">Рекомендуем</p>
            </div>
          </div>
          <ul className="space-y-4">
            {[
              "От 59₽ за карточку",
              "Готово за 3 минуты",
              "Работает 24/7",
              "Неограниченные правки",
              "1000+ стилей дизайна",
              "Гарантированный результат",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white/80">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 opacity-70"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-white/60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white/60">Дизайнер</h3>
              <p className="text-white/40 text-sm">Традиционный способ</p>
            </div>
          </div>
          <ul className="space-y-4">
            {[
              "3 000 – 5 000₽ за карточку",
              "5-7 дней ожидания",
              "Работает по расписанию",
              "Правки за доплату",
              "Зависит от навыков",
              "Результат непредсказуем",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white/50">
                <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  </section>
);

// Use cases section
const UseCasesSection = () => (
  <section className="py-16 sm:py-24 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Для каких товаров подходит
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto">
          WBGen создаёт карточки для любых категорий Wildberries и Ozon
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
        {[
          { name: "Одежда", emoji: "👕" },
          { name: "Косметика", emoji: "💄" },
          { name: "Электроника", emoji: "📱" },
          { name: "Товары для дома", emoji: "🏠" },
          { name: "Спорт", emoji: "⚽" },
          { name: "Детские товары", emoji: "🧸" },
          { name: "Аксессуары", emoji: "👜" },
          { name: "Продукты", emoji: "🍎" },
          { name: "Украшения", emoji: "💎" },
          { name: "Канцтовары", emoji: "✏️" },
          { name: "Автотовары", emoji: "🚗" },
          { name: "Зоотовары", emoji: "🐕" },
        ].map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4 text-center hover:bg-white/5 transition-colors"
          >
            <div className="text-3xl mb-2">{cat.emoji}</div>
            <p className="text-white/80 text-sm">{cat.name}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const CardDesign = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Создание карточек для Wildberries, Ozon, Яндекс Маркет с ИИ — дизайн за 3 минуты | WBGen</title>
        <meta
          name="description"
          content="Генерация дизайна карточек для Wildberries, Ozon и Яндекс Маркет с помощью нейросети. Профессиональная инфографика, 1000+ стилей, готовые PNG за 3 минуты. От 59₽ за карточку."
        />
        <meta name="keywords" content="карточки wildberries, карточки ozon, карточки яндекс маркет, дизайн карточек маркетплейс, инфографика, генерация карточек" />
        <meta property="og:title" content="Создание карточек для маркетплейсов с ИИ — WBGen" />
        <meta property="og:description" content="Генерация дизайна карточек для WB, Ozon, Яндекс Маркет с ИИ. Инфографика за 3 минуты от 59₽." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/sozdanie-kartochek" />
        <link rel="canonical" href="https://wbgen.ru/sozdanie-kartochek" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Создание карточек Wildberries с ИИ",
            "description": "Генерация профессионального дизайна карточек товаров для маркетплейсов с помощью искусственного интеллекта",
            "provider": {
              "@type": "Organization",
              "name": "WBGen",
              "url": "https://wbgen.ru"
            },
            "areaServed": "RU",
            "offers": {
              "@type": "Offer",
              "price": "59",
              "priceCurrency": "RUB"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "1247"
            }
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="Дизайн карточек для маркетплейсов"
        subtitle="за 3 минуты с ИИ"
        description="Загрузите фото товара — получите профессиональный комплект карточек с инфографикой для WB, Ozon и Яндекс Маркет. ИИ создаёт уникальный дизайн, увеличивающий CTR и продажи."
        badge="🚀 120 000+ карточек создано"
        stats={[
          { value: "от 59₽", label: "за карточку" },
          { value: "3 мин", label: "на комплект" },
          { value: "+47%", label: "рост CTR" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Создание карточек" },
        ]}
        ctaText="Создать карточку"
        secondaryCtaText="Смотреть примеры работ"
        secondaryCtaLink="/cases"
        heroImages={[
          "/lovable-uploads/hero-card-1.jpg",
          "/lovable-uploads/hero-card-2.jpg",
          "/lovable-uploads/hero-card-3.jpg",
        ]}
      />

      <StatsSection stats={stats} />

      <ServiceFeatures
        title="Почему 22 000+ селлеров выбрали WBGen"
        subtitle="Продвинутый ИИ для создания карточек, которые продают"
        features={features}
      />

      <ComparisonSection />

      <StepsSection
        title="Как создать карточки за 3 минуты"
        subtitle="Простой процесс из 4 шагов — справится каждый"
        steps={steps}
      />

      <UseCasesSection />

      <BenefitsSection
        title="Что вы получите"
        subtitle="Реальные результаты для вашего бизнеса на маркетплейсах"
        benefits={benefits}
      />

      <CasesShowcase 
        title="Реальные результаты"
        subtitle="Кейсы роста конверсии на карточках, созданных с WBGen"
      />

      <TestimonialsSection
        title="Отзывы селлеров"
        subtitle="Реальные результаты наших пользователей"
        testimonials={testimonials}
      />

      <ServiceFAQ 
        items={faqItems}
        title="Частые вопросы о создании карточек"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/sozdanie-kartochek"
        title="Другие инструменты для селлеров"
      />

      <ServiceCTA
        title="Создайте первую карточку уже сейчас"
        subtitle="Получите токены при регистрации и протестируйте качество ИИ-генерации"
        ctaText="Начать"
        secondaryCtaText="Смотреть тарифы"
        secondaryCtaLink="/pricing"
      />
    </ServicePageLayout>
  );
};

export default CardDesign;
