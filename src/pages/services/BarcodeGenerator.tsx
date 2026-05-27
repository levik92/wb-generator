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
  Clock,
  CheckCircle,
  Infinity,
} from "lucide-react";
import heroImage from "@/assets/service-barcode-hero.png";

const features = [
  {
    icon: Barcode,
    title: "CODE-128 для Wildberries",
    description: "Стандартный формат штрихкодов, который принимают все склады WB без вопросов",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: QrCode,
    title: "QR-коды для маркетинга",
    description: "Генерируйте QR для упаковки, визиток или маркетинговых материалов",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Download,
    title: "PDF готов к печати",
    description: "Скачивайте этикетки в формате PDF, оптимизированном для термопринтеров",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Infinity,
    title: "Без ограничений",
    description: "Генерируйте сколько угодно штрихкодов — никаких лимитов и скрытых платежей",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Printer,
    title: "Любой принтер",
    description: "Работает с термопринтерами этикеток и обычными офисными принтерами",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: FileText,
    title: "Массовая генерация",
    description: "Создавайте сотни этикеток за раз — идеально для крупных поставок",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Введите данные товара",
    description: "Укажите артикул, название и баркод для генерации этикетки",
    icon: PenTool,
  },
  {
    number: "02",
    title: "Выберите формат",
    description: "CODE-128 для складских этикеток или QR-код для маркетинга",
    icon: Barcode,
  },
  {
    number: "03",
    title: "Мгновенная генерация",
    description: "Система создаёт этикетку за 2-3 секунды в нужном размере",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Скачайте и печатайте",
    description: "Получите PDF-файл, готовый для печати на любом принтере",
    icon: Download,
  },
];

const benefits = [
  {
    title: "100% бесплатно навсегда",
    description: "Это наш подарок селлерам. Никаких скрытых платежей, подписок или лимитов",
  },
  {
    title: "Соответствие требованиям WB",
    description: "Штрихкоды проходят проверку на всех складах Wildberries без проблем",
  },
  {
    title: "Экономия на софте",
    description: "Не нужно покупать специальные программы — всё работает в браузере",
  },
  {
    title: "Массовая генерация",
    description: "Создавайте этикетки для сотен товаров за минуты вместо часов",
  },
  {
    title: "История генераций",
    description: "Все созданные этикетки сохраняются — легко найти и скачать повторно",
  },
];

const stats = [
  { value: "150 000+", label: "этикеток создано", icon: Barcode },
  { value: "0₽", label: "навсегда бесплатно", icon: Gift },
  { value: "5 000+", label: "селлеров используют", icon: Users },
  { value: "3 сек", label: "на генерацию", icon: Clock },
];

const faqItems = [
  {
    question: "Это действительно полностью бесплатно?",
    answer: "Да, генерация штрихкодов и этикеток на 100% бесплатна без каких-либо ограничений. Это наш подарок селлерам Wildberries. Мы зарабатываем на платных инструментах (карточки, описания), а ШК даём бесплатно.",
  },
  {
    question: "Какой формат штрихкодов поддерживается?",
    answer: "Мы генерируем штрихкоды CODE-128 — это стандартный формат для Wildberries, который принимают все склады. Также доступны QR-коды для дополнительной маркировки и маркетинга.",
  },
  {
    question: "В каком формате скачиваются этикетки?",
    answer: "Этикетки скачиваются в формате PDF, оптимизированном для печати. Файл совместим с термопринтерами этикеток (Zebra, TSC, Godex) и обычными офисными принтерами.",
  },
  {
    question: "Какой размер этикеток?",
    answer: "Стандартный размер — 58x40 мм, оптимальный для большинства термопринтеров. При печати на обычном принтере можно масштабировать под нужный размер.",
  },
  {
    question: "Нужна ли регистрация?",
    answer: "Для генерации штрихкодов нужна бесплатная регистрация. Это позволяет сохранять историю генераций и быстро находить нужные этикетки в будущем.",
  },
  {
    question: "Можно ли генерировать много этикеток сразу?",
    answer: "Да, доступна массовая генерация. Вы можете создать этикетки для сотен товаров за несколько минут, загрузив данные списком.",
  },
];

const relatedServices = [
  {
    title: "Создание карточек",
    description: "ИИ-генерация дизайна карточек с инфографикой за 3 минуты",
    href: "/sozdanie-kartochek",
    icon: Image,
  },
  {
    title: "SEO-описания",
    description: "Продающие описания с ключевыми словами для роста в поиске",
    href: "/seo-opisaniya",
    icon: FileText,
  },
  {
    title: "Видео-генерация",
    description: "ИИ-создание видеообложек для карточек товаров",
    href: "/video-generaciya",
    icon: Video,
  },
];

const BarcodeGenerator = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Генератор штрихкодов для Wildberries — бесплатные этикетки CODE-128 | WBGen</title>
        <meta
          name="description"
          content="Бесплатный генератор штрихкодов и этикеток для Wildberries. CODE-128, QR-коды, готовые PDF для печати. Без ограничений и подписок. 150 000+ этикеток создано."
        />
        <meta name="keywords" content="генератор штрихкодов wildberries, штрихкод wb, этикетки для вб, code-128 генератор, баркод для маркетплейса" />
        <meta property="og:title" content="Генератор штрихкодов для Wildberries — WBGen" />
        <meta property="og:description" content="Бесплатный генератор штрихкодов CODE-128 для WB. Скачивайте PDF для печати." />
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
            }
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="Генератор штрихкодов"
        subtitle="для Wildberries — бесплатно"
        description="Создавайте этикетки CODE-128 и QR-коды без ограничений. Готовые PDF для печати на любом принтере. Это бесплатно — наш подарок селлерам."
        badge="🎁 Бесплатно и без лимитов"
        accent="emerald"
        signature={(
          <div className="flex flex-wrap gap-2">
            {["CODE-128", "QR-код", "PDF к печати", "Без лимитов"].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        stats={[
          { value: "0₽", label: "навсегда" },
          { value: "CODE-128", label: "формат WB" },
          { value: "3 сек", label: "генерация" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Генератор ШК" },
        ]}
        ctaText="Создать штрихкод бесплатно"
        secondaryCtaText="Узнать больше"
        secondaryCtaLink="/baza-znaniy"
        heroImage={heroImage}
      />

      <StatsSection stats={stats} />

      <ServiceFeatures
        title="Всё для маркировки товаров"
        subtitle="Бесплатный инструмент без компромиссов по качеству"
        features={features}
      />

      <StepsSection
        title="Как создать этикетку за 3 секунды"
        subtitle="Простой процесс — справится каждый"
        steps={steps}
      />

      <BenefitsSection
        title="Почему селлеры выбирают WBGen"
        subtitle="Преимущества бесплатного генератора штрихкодов"
        benefits={benefits}
      />

      <ServiceFAQ 
        items={faqItems}
        title="Частые вопросы о генераторе ШК"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/generator-shk"
        title="Другие инструменты для селлеров"
      />

      <ServiceCTA
        title="Создайте штрихкоды бесплатно"
        subtitle="Зарегистрируйтесь и начните генерировать этикетки прямо сейчас"
        ctaText="Начать бесплатно"
        secondaryCtaText="Смотреть платные инструменты"
        secondaryCtaLink="/sozdanie-kartochek"
      />
    </ServicePageLayout>
  );
};

export default BarcodeGenerator;
