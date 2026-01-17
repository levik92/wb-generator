import { Helmet } from "react-helmet-async";
import {
  ServicePageLayout,
  ServiceHero,
  ServiceFeatures,
  ServiceFAQ,
  ServiceCTA,
  RelatedServices,
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

      <ServiceFeatures
        title="Возможности генератора описаний"
        subtitle="Умный ИИ для создания продающих текстов"
        features={features}
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
