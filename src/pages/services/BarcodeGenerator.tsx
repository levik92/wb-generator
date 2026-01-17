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
  StatsSection,
} from "@/components/services";
import {
  Barcode,
  Download,
  Zap,
  FileText,
  Printer,
  QrCode,
  Image,
  Video,
  PenTool,
  Sparkles,
  Users,
  Gift,
  CheckCircle,
  Clock,
} from "lucide-react";
import heroImage from "@/assets/service-barcode-hero.jpg";

const features = [
  {
    icon: Barcode,
    title: "CODE-128",
    description: "Стандартный формат штрихкодов для Wildberries и других маркетплейсов",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: QrCode,
    title: "QR-коды",
    description: "Генерация QR-кодов для упаковки и маркетинговых материалов",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Download,
    title: "Скачивание PDF",
    description: "Готовые этикетки в формате PDF для печати на любом принтере",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Zap,
    title: "100% бесплатно",
    description: "Генерация штрихкодов и этикеток без ограничений и подписок",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Printer,
    title: "Готово к печати",
    description: "Оптимальный размер этикеток для термопринтеров и обычных принтеров",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: FileText,
    title: "Массовая генерация",
    description: "Создавайте этикетки для нескольких товаров одновременно",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Введите данные",
    description: "Укажите артикул, название товара и баркод для генерации",
    icon: PenTool,
  },
  {
    number: "02",
    title: "Выберите формат",
    description: "CODE-128 для стандартных этикеток или QR-код для расширенной маркировки",
    icon: Barcode,
  },
  {
    number: "03",
    title: "Генерация",
    description: "Система мгновенно создаёт готовую этикетку в нужном размере",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Скачайте PDF",
    description: "Получите файл, готовый для печати на любом принтере",
    icon: Download,
  },
];

const benefits = [
  {
    title: "Полностью бесплатно",
    description: "Никаких скрытых платежей, лимитов или подписок — генерируйте сколько нужно",
  },
  {
    title: "Соответствие требованиям WB",
    description: "Штрихкоды соответствуют всем требованиям Wildberries к маркировке",
  },
  {
    title: "Готово к печати",
    description: "PDF-файлы оптимизированы для термопринтеров и обычных принтеров",
  },
  {
    title: "Экономия времени",
    description: "Массовая генерация позволяет создавать сотни этикеток за минуты",
  },
  {
    title: "Нет зависимости от софта",
    description: "Работает в браузере — не нужно устанавливать программы",
  },
];

const stats = [
  { value: "100 000+", label: "этикеток создано", icon: Barcode },
  { value: "0₽", label: "навсегда", icon: Gift },
  { value: "5 000+", label: "селлеров", icon: Users },
  { value: "5 сек", label: "на генерацию", icon: Clock },
];

const faqItems = [
  {
    question: "Какой формат штрихкодов поддерживается?",
    answer: "Мы генерируем штрихкоды в формате CODE-128, который является стандартом для Wildberries. Также доступна генерация QR-кодов для дополнительной маркировки.",
  },
  {
    question: "Генерация штрихкодов действительно бесплатная?",
    answer: "Да, генерация штрихкодов и этикеток полностью бесплатна без ограничений по количеству. Это наш подарок селлерам Wildberries.",
  },
  {
    question: "В каком формате скачиваются этикетки?",
    answer: "Этикетки скачиваются в формате PDF, готовом для печати. Вы можете распечатать их на обычном принтере или термопринтере.",
  },
  {
    question: "Какой размер этикеток?",
    answer: "Стандартный размер этикетки — 58x40 мм, оптимальный для большинства принтеров этикеток. Вы можете масштабировать при печати.",
  },
  {
    question: "Нужно ли регистрироваться для генерации ШК?",
    answer: "Для генерации штрихкодов требуется бесплатная регистрация. Это позволяет сохранять историю и быстро находить нужные этикетки.",
  },
  {
    question: "Можно ли добавить логотип на этикетку?",
    answer: "В текущей версии этикетки содержат штрихкод и текстовую информацию. Кастомизация с логотипом планируется в будущих обновлениях.",
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
    title: "Видео-генерация",
    description: "Создание видеообложек для карточек товаров",
    href: "/video-generaciya",
    icon: Video,
    isComingSoon: true,
  },
];

const BarcodeGenerator = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Генератор штрихкодов для Wildberries — бесплатные этикетки | WBGen</title>
        <meta
          name="description"
          content="Бесплатный генератор штрихкодов и этикеток для Wildberries. CODE-128, QR-коды, готовые PDF для печати. Без ограничений и подписок."
        />
        <meta property="og:title" content="Генератор штрихкодов для Wildberries — WBGen" />
        <meta property="og:description" content="Бесплатный генератор штрихкодов и этикеток для WB. Скачивайте PDF для печати." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/generator-shk" />
        <link rel="canonical" href="https://wbgen.ru/generator-shk" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Генератор штрихкодов WBGen",
            "description": "Бесплатный онлайн-генератор штрихкодов и этикеток для Wildberries",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "RUB"
            },
            "provider": {
              "@type": "Organization",
              "name": "WBGen",
              "url": "https://wbgen.ru"
            }
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="Генератор штрихкодов"
        subtitle="для Wildberries"
        description="Создавайте штрихкоды и этикетки для товаров бесплатно. CODE-128, QR-коды, готовые PDF для печати — всё без ограничений и подписок."
        badge="Бесплатно и без лимитов"
        stats={[
          { value: "0₽", label: "навсегда" },
          { value: "CODE-128", label: "формат" },
          { value: "PDF", label: "для печати" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Генератор ШК" },
        ]}
        ctaText="Создать штрихкод"
        secondaryCtaText="Узнать больше"
        secondaryCtaLink="/baza-znaniy"
        heroImage={heroImage}
      />

      <StatsSection stats={stats} />

      <ServiceFeatures
        title="Возможности генератора"
        subtitle="Всё необходимое для маркировки товаров"
        features={features}
      />

      <StepsSection
        title="Как создать этикетку"
        subtitle="От ввода данных до готового PDF за секунды"
        steps={steps}
      />

      <BenefitsSection
        title="Почему наш генератор"
        subtitle="Преимущества бесплатного инструмента для селлеров"
        benefits={benefits}
      />

      <ServiceFAQ items={faqItems} />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/generator-shk" 
      />

      <ServiceCTA
        title="Создайте этикетки бесплатно"
        subtitle="Зарегистрируйтесь и начните генерировать штрихкоды прямо сейчас"
        ctaText="Начать бесплатно"
        secondaryCtaText="Смотреть другие инструменты"
        secondaryCtaLink="/sozdanie-kartochek"
      />
    </ServicePageLayout>
  );
};

export default BarcodeGenerator;