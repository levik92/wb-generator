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
  Video,
  Sparkles,
  TrendingUp,
  Clock,
  PlayCircle,
  Clapperboard,
  Image,
  FileText,
  Barcode,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Видеообложки",
    description: "Динамичные видеообложки для главного слайда карточки товара",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Sparkles,
    title: "ИИ-генерация",
    description: "Нейросеть создаёт уникальное видео на основе фото товара",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: TrendingUp,
    title: "+60% внимания",
    description: "Видеообложки привлекают больше внимания в каталоге",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Clock,
    title: "15-30 секунд",
    description: "Оптимальная длительность для маркетплейсов",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: PlayCircle,
    title: "Автовоспроизведение",
    description: "Видео запускается автоматически при просмотре карточки",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Clapperboard,
    title: "Разные стили",
    description: "Презентационные, демонстрационные, lifestyle видеоролики",
    color: "from-indigo-500 to-purple-600",
  },
];

const faqItems = [
  {
    question: "Когда будет доступна видео-генерация?",
    answer: "Мы активно работаем над этой функцией. Планируемый запуск — Q2 2025. Подпишитесь на уведомления, чтобы узнать первыми.",
  },
  {
    question: "Какие видео можно будет создавать?",
    answer: "Вы сможете генерировать видеообложки для главного слайда карточки, демонстрационные ролики товара и lifestyle-видео для продвижения.",
  },
  {
    question: "Какой формат и длительность видео?",
    answer: "Видео будут в формате MP4, оптимизированном для Wildberries. Длительность — от 15 до 30 секунд, как рекомендует маркетплейс.",
  },
  {
    question: "Сколько будет стоить генерация видео?",
    answer: "Цены будут объявлены ближе к запуску. Мы планируем сделать функцию доступной для всех селлеров.",
  },
  {
    question: "Нужно ли специальное оборудование?",
    answer: "Нет, достаточно загрузить фотографии товара. ИИ сам создаст видеоролик на их основе.",
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
];

const VideoGeneration = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Видео-генерация для карточек Wildberries — скоро в WBGen</title>
        <meta
          name="description"
          content="Генерация видеообложек для карточек Wildberries с помощью ИИ. Динамичные видеоролики, +60% внимания к товару. Скоро доступно."
        />
        <meta property="og:title" content="Видео-генерация для Wildberries — WBGen" />
        <meta property="og:description" content="ИИ-генерация видеообложек для карточек товаров. Скоро доступно в WBGen." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/video-generaciya" />
        <link rel="canonical" href="https://wbgen.ru/video-generaciya" />
      </Helmet>

      <ServiceHero
        title="Видео-генерация"
        subtitle="для карточек товаров"
        description="Создавайте динамичные видеообложки, которые привлекают внимание в каталоге. ИИ генерирует профессиональные видеоролики на основе фотографий товара."
        badge="Новая функция"
        stats={[
          { value: "+60%", label: "внимания" },
          { value: "15-30 сек", label: "видео" },
          { value: "MP4", label: "формат" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Видео-генерация" },
        ]}
        isComingSoon={true}
      />

      <ServiceFeatures
        title="Что мы разрабатываем"
        subtitle="Возможности, которые скоро станут доступны"
        features={features}
      />

      <ServiceFAQ 
        items={faqItems}
        title="Вопросы о видео-генерации"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/video-generaciya" 
        title="Доступно уже сейчас"
      />

      <ServiceCTA
        title="Попробуйте другие инструменты"
        subtitle="Пока видео-генерация в разработке, создайте карточки и описания с ИИ"
        ctaText="Создать карточку"
        ctaLink="/sozdanie-kartochek"
        secondaryCtaText="Смотреть тарифы"
        secondaryCtaLink="/pricing"
      />
    </ServicePageLayout>
  );
};

export default VideoGeneration;
