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
} from "@/components/services";
import {
  FileText,
  Search,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Image,
  Video,
  Barcode,
  PenTool,
  Sparkles,
  Copy,
  CheckCircle,
  Users,
  Award,
} from "lucide-react";
import heroImage from "@/assets/service-seo-hero.jpg";

const features = [
  {
    icon: Search,
    title: "SEO-оптимизация",
    description: "Автоматический подбор ключевых слов для продвижения в поиске Wildberries",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: TrendingUp,
    title: "+35% к конверсии",
    description: "Продающие описания увеличивают переход из просмотра в покупку",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: FileText,
    title: "До 1800 символов",
    description: "Оптимальная длина для алгоритмов маркетплейса и читабельности",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Target,
    title: "Анализ конкурентов",
    description: "ИИ анализирует топовые карточки в нише и адаптирует описание",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Zap,
    title: "30 секунд",
    description: "Генерация готового описания занимает меньше минуты",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: BarChart3,
    title: "Структура продаж",
    description: "Описание строится по формуле AIDA для максимальной конверсии",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Введите данные",
    description: "Укажите название товара, категорию и основные характеристики продукта",
    icon: PenTool,
  },
  {
    number: "02",
    title: "ИИ анализирует",
    description: "Нейросеть изучает конкурентов и подбирает релевантные ключевые слова",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Генерация текста",
    description: "Создаётся уникальное продающее описание по формуле AIDA",
    icon: FileText,
  },
  {
    number: "04",
    title: "Скопируйте и используйте",
    description: "Готовое описание можно сразу вставить в карточку товара",
    icon: Copy,
  },
];

const benefits = [
  {
    title: "Рост позиций в поиске",
    description: "Ключевые слова помогают товару попадать в топ выдачи Wildberries",
  },
  {
    title: "Увеличение конверсии на 35%",
    description: "Продающая структура текста мотивирует покупателей к заказу",
  },
  {
    title: "Экономия времени",
    description: "Вместо часов работы копирайтера — готовый текст за 30 секунд",
  },
  {
    title: "Уникальность контента",
    description: "Каждое описание генерируется индивидуально, без шаблонов",
  },
  {
    title: "Соответствие требованиям WB",
    description: "Оптимальная длина и структура для алгоритмов маркетплейса",
  },
];

const stats = [
  { value: "50 000+", label: "описаний создано", icon: FileText },
  { value: "3 000+", label: "селлеров", icon: Users },
  { value: "+35%", label: "средний рост CTR", icon: TrendingUp },
  { value: "30 сек", label: "на генерацию", icon: Zap },
];

const testimonials = [
  {
    name: "Ольга М.",
    role: "Продавец товаров для дома",
    content: "Описания реально работают! После замены текстов на сгенерированные продажи выросли на 28%. Теперь все новые карточки делаю через WBGen.",
    rating: 5,
  },
  {
    name: "Артём В.",
    role: "Селлер спортивных товаров",
    content: "Главное — ключевые слова подбираются автоматически. Раньше я не знал, какие запросы использовать, теперь ИИ всё делает за меня.",
    rating: 5,
  },
  {
    name: "Наталья К.",
    role: "Поставщик косметики",
    content: "Удобно, что можно указать свои ключи и особенности товара. Получается уникальное описание, которое точно передаёт преимущества.",
    rating: 4,
  },
];

const faqItems = [
  {
    question: "Как генерируются SEO-описания?",
    answer: "Вы вводите название товара, категорию и основные характеристики. ИИ анализирует данные, подбирает релевантные ключевые слова и генерирует уникальное продающее описание с оптимальной структурой для маркетплейса.",
  },
  {
    question: "Какие ключевые слова использует ИИ?",
    answer: "Нейросеть анализирует поисковые запросы на Wildberries, изучает топовые карточки в вашей категории и подбирает наиболее частотные и релевантные ключевые слова для вашего товара.",
  },
  {
    question: "Можно ли редактировать готовое описание?",
    answer: "Да, вы можете скопировать описание и отредактировать его перед загрузкой на маркетплейс. Также можно перегенерировать описание с другими параметрами.",
  },
  {
    question: "Подходят ли описания для Ozon?",
    answer: "Да, сгенерированные описания универсальны и подходят для всех маркетплейсов. Вы можете адаптировать длину под требования конкретной площадки.",
  },
  {
    question: "Сколько токенов тратится на описание?",
    answer: "Генерация одного SEO-описания тратит меньше токенов, чем создание визуальной карточки. Точную стоимость смотрите на странице тарифов.",
  },
  {
    question: "Можно ли указать свои ключевые слова?",
    answer: "Да, вы можете добавить свои ключевые слова и пожелания к описанию. ИИ учтёт их при генерации текста.",
  },
];

const relatedServices = [
  {
    title: "Создание карточек",
    description: "Генерация дизайна карточек с ИИ за 3 минуты",
    href: "/sozdanie-kartochek",
    icon: Image,
  },
  {
    title: "Генератор ШК",
    description: "Создание штрихкодов и этикеток для WB бесплатно",
    href: "/generator-shk",
    icon: Barcode,
  },
  {
    title: "Видео-генерация",
    description: "Создание видеообложек для карточек товаров",
    href: "/video-generaciya",
    icon: Video,
    isComingSoon: true,
  },
];

const SeoDescriptions = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Генерация SEO-описаний для Wildberries — ИИ-копирайтинг | WBGen</title>
        <meta
          name="description"
          content="Автоматическая генерация продающих SEO-описаний для карточек Wildberries. Подбор ключевых слов, оптимальная структура, +35% к конверсии."
        />
        <meta property="og:title" content="Генерация SEO-описаний для Wildberries — WBGen" />
        <meta property="og:description" content="ИИ-генерация продающих описаний с ключевыми словами для карточек Wildberries." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/seo-opisaniya" />
        <link rel="canonical" href="https://wbgen.ru/seo-opisaniya" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Генерация SEO-описаний для Wildberries",
            "description": "Автоматическое создание продающих описаний с ключевыми словами для карточек товаров",
            "provider": {
              "@type": "Organization",
              "name": "WBGen",
              "url": "https://wbgen.ru"
            },
            "areaServed": "RU"
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="SEO-описания для карточек"
        subtitle="Wildberries"
        description="Генерируйте продающие описания с ключевыми словами за 30 секунд. ИИ анализирует конкурентов, подбирает ключи и создаёт текст по формуле AIDA."
        badge="ИИ-копирайтинг для маркетплейсов"
        stats={[
          { value: "+35%", label: "рост конверсии" },
          { value: "30 сек", label: "на генерацию" },
          { value: "1800", label: "символов" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "SEO-описания" },
        ]}
        ctaText="Создать описание"
        secondaryCtaText="Смотреть тарифы"
        secondaryCtaLink="/pricing"
        heroImage={heroImage}
      />

      <StatsSection stats={stats} />

      <ServiceFeatures
        title="Возможности генератора описаний"
        subtitle="Умный ИИ для создания продающих текстов"
        features={features}
      />

      <StepsSection
        title="Как создать описание"
        subtitle="От ввода данных до готового текста за минуту"
        steps={steps}
      />

      <BenefitsSection
        title="Преимущества для вашего бизнеса"
        subtitle="Почему SEO-описания увеличивают продажи"
        benefits={benefits}
      />

      <TestimonialsSection
        title="Отзывы пользователей"
        subtitle="Реальные результаты селлеров"
        testimonials={testimonials}
      />

      <ServiceFAQ items={faqItems} />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/seo-opisaniya" 
      />

      <ServiceCTA
        title="Создайте описание прямо сейчас"
        subtitle="Попробуйте бесплатно — получите токены при регистрации"
        ctaText="Начать бесплатно"
        secondaryCtaText="Смотреть примеры"
        secondaryCtaLink="/cases"
      />
    </ServicePageLayout>
  );
};

export default SeoDescriptions;