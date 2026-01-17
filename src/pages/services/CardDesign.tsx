import { Helmet } from "react-helmet-async";
import {
  ServicePageLayout,
  ServiceHero,
  ServiceFeatures,
  ServiceFAQ,
  ServiceCTA,
  RelatedServices,
} from "@/components/services";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ExamplesSection } from "@/components/landing/ExamplesSection";
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
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "ИИ-генерация",
    description: "Нейросеть создаёт уникальный дизайн за секунды, адаптированный под вашу нишу",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Clock,
    title: "3 минуты",
    description: "Полный комплект карточек готов за считанные минуты вместо дней работы с дизайнером",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: TrendingUp,
    title: "+40% конверсии",
    description: "Профессиональный дизайн повышает кликабельность и конверсию в продажи",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Palette,
    title: "10+ стилей",
    description: "Minimal, Premium, Bold, Luxury и другие стили под любой товар и целевую аудиторию",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Image,
    title: "До 6 карточек",
    description: "Генерируйте сразу несколько вариантов и выбирайте лучший для каждого слайда",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Zap,
    title: "Готовые PNG",
    description: "Скачивайте в нужном разрешении, готовые для загрузки на Wildberries и Ozon",
    color: "from-indigo-500 to-purple-600",
  },
];

const faqItems = [
  {
    question: "Как работает генерация карточек с ИИ?",
    answer: "Вы загружаете фото товара, указываете категорию и описание. Нейросеть анализирует данные и создаёт профессиональный дизайн карточки с инфографикой, иконками и продающими элементами. Весь процесс занимает 2-3 минуты.",
  },
  {
    question: "Сколько стоит создание одной карточки?",
    answer: "Стоимость зависит от выбранного тарифа. Минимальная цена — от 59₽ за карточку. При покупке большего пакета токенов цена за карточку снижается. Смотрите актуальные тарифы на странице цен.",
  },
  {
    question: "Какие форматы изображений поддерживаются?",
    answer: "Вы можете загружать изображения в форматах JPG, PNG, WebP. Готовые карточки скачиваются в формате PNG в высоком разрешении (900x1200 пикселей), оптимальном для Wildberries.",
  },
  {
    question: "Можно ли редактировать готовые карточки?",
    answer: "Да, вы можете перегенерировать отдельные карточки, изменить стиль или описание. Также доступна функция редактирования карточки с изменением отдельных элементов.",
  },
  {
    question: "Подходят ли карточки для Ozon и других маркетплейсов?",
    answer: "Да, созданные карточки универсальны и подходят для всех маркетплейсов: Wildberries, Ozon, Яндекс.Маркет. Вы получаете PNG-файлы в высоком разрешении.",
  },
  {
    question: "Что такое токены и как они расходуются?",
    answer: "Токены — это внутренняя валюта сервиса. На генерацию одной карточки тратится определённое количество токенов в зависимости от сложности. При регистрации вы получаете бесплатные токены для тестирования.",
  },
];

const relatedServices = [
  {
    title: "SEO-описания",
    description: "Генерация продающих описаний с ключевыми словами",
    href: "/seo-opisaniya",
    icon: FileText,
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

const CardDesign = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Создание карточек Wildberries с ИИ — дизайн за 3 минуты | WBGen</title>
        <meta
          name="description"
          content="Генерация дизайна карточек для Wildberries с помощью ИИ. Профессиональная инфографика, 10+ стилей, готовые PNG за 3 минуты. От 59₽ за карточку."
        />
        <meta property="og:title" content="Создание карточек Wildberries с ИИ — WBGen" />
        <meta property="og:description" content="Генерация дизайна карточек для Wildberries с ИИ. Инфографика за 3 минуты от 59₽." />
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
            }
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="Создание карточек товаров"
        subtitle="с помощью ИИ"
        description="Генерируйте профессиональный дизайн карточек для Wildberries за 3 минуты. Нейросеть создаёт уникальную инфографику, подбирает стиль и оформление под вашу нишу."
        badge="Нейросеть для карточек товаров"
        stats={[
          { value: "от 59₽", label: "за карточку" },
          { value: "3 мин", label: "на генерацию" },
          { value: "+40%", label: "рост конверсии" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Создание карточек" },
        ]}
        ctaText="Создать карточку"
        secondaryCtaText="Смотреть примеры"
        secondaryCtaLink="/cases"
      />

      <ServiceFeatures
        title="Почему выбирают WBGen"
        subtitle="Современные ИИ-технологии для создания продающих карточек"
        features={features}
      />

      <HowItWorksSection />

      <ExamplesSection />

      <ServiceFAQ items={faqItems} />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/sozdanie-kartochek" 
      />

      <ServiceCTA
        title="Готовы создать карточки?"
        subtitle="Попробуйте бесплатно — получите токены при регистрации"
        ctaText="Начать бесплатно"
        secondaryCtaText="Смотреть тарифы"
        secondaryCtaLink="/pricing"
      />
    </ServicePageLayout>
  );
};

export default CardDesign;
