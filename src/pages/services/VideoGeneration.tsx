import { Helmet } from "react-helmet-async";
import {
  ServicePageLayout,
  ServiceHero,
  ServiceFeatures,
  ServiceFAQ,
  ServiceCTA,
  RelatedServices,
  StepsSection,
} from "@/components/services";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
  Upload,
  Wand2,
  Download,
  Eye,
  Zap,
  Shield,
  Users,
  Award,
  Target,
  Play,
  Film,
  Volume2,
  Layers,
  CheckCircle,
  ArrowRight,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/service-video-hero.png";

const features = [
  {
    icon: Video,
    title: "Видеообложки для карточек",
    description: "Создаём динамичные превью, которые автоматически воспроизводятся в каталоге WB и привлекают внимание покупателей",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Sparkles,
    title: "Нейросеть анимации",
    description: "ИИ анализирует товар на фото и создаёт естественную анимацию: вращение, приближение, демонстрация деталей",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: TrendingUp,
    title: "+60% к кликабельности",
    description: "Видео в каталоге выделяется среди статичных изображений. Покупатели кликают на движущиеся карточки чаще",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Clock,
    title: "15-30 секунд — идеальный хронометраж",
    description: "Оптимальная длительность по рекомендациям Wildberries. Достаточно, чтобы показать товар, не утомляя покупателя",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Volume2,
    title: "Библиотека музыки",
    description: "Роялти-фри треки для создания атмосферы. Или загружайте свою музыку для брендирования контента",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Film,
    title: "Разные стили роликов",
    description: "Презентационные, демонстрационные, lifestyle, 360° — выбирайте формат под ваш товар и аудиторию",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Загрузите фотографии",
    description: "Добавьте качественные фото товара с разных ракурсов — ИИ использует их как кадры для видео",
    icon: Upload,
  },
  {
    number: "02",
    title: "Выберите стиль видео",
    description: "Презентация товара, демонстрация функций, lifestyle-ролик или 360° обзор — под любую задачу",
    icon: Clapperboard,
  },
  {
    number: "03",
    title: "ИИ создаёт анимацию",
    description: "Нейросеть анимирует изображения, добавляет переходы, эффекты и создаёт плавный видеоряд",
    icon: Wand2,
  },
  {
    number: "04",
    title: "Скачайте готовый MP4",
    description: "Получите видеоролик в формате и разрешении, оптимизированном для загрузки на WB",
    icon: Download,
  },
];

// Expanded benefits with icons for card layout
const benefitCards = [
  {
    icon: Eye,
    title: "CTR выше на 60%",
    description: "Видео в каталоге привлекает внимание сильнее статичных изображений. Покупатели кликают на движущиеся карточки гораздо чаще.",
    stat: "+60%",
  },
  {
    icon: Target,
    title: "Выделение среди конкурентов",
    description: "Менее 5% карточек на Wildberries используют видео. Это ваш шанс выделиться и запомниться покупателю.",
    stat: "<5%",
  },
  {
    icon: PlayCircle,
    title: "Демонстрация в действии",
    description: "Покажите товар с разных ракурсов, продемонстрируйте функциональность. Видео отвечает на вопросы покупателей до их появления.",
    stat: "360°",
  },
  {
    icon: Clock,
    title: "Время просмотра ×2",
    description: "Покупатели проводят в карточке с видео вдвое больше времени. Чем дольше изучают — тем выше конверсия в покупку.",
    stat: "×2",
  },
  {
    icon: Award,
    title: "Профессиональное качество",
    description: "ИИ создаёт ролики уровня продакшн-студии за минуты. Без оборудования, без видеооператора, без монтажа.",
    stat: "PRO",
  },
  {
    icon: Zap,
    title: "Запуск за минуты",
    description: "От загрузки фото до готового видео — 5 минут. Выводите товары быстрее конкурентов.",
    stat: "5 мин",
  },
];

// Video types section
const videoTypes = [
  {
    title: "Презентационное видео",
    description: "Классическое представление товара с плавными переходами между ракурсами и акцентами на деталях",
    icon: Play,
    example: "Идеально для одежды, украшений, аксессуаров",
  },
  {
    title: "Демонстрационное видео",
    description: "Показывает товар в действии: как открывается, как работает, как выглядит при использовании",
    icon: Clapperboard,
    example: "Для техники, гаджетов, товаров с функционалом",
  },
  {
    title: "Lifestyle-ролик",
    description: "Товар в естественной среде использования. Создаёт эмоциональную связь с покупателем",
    icon: Film,
    example: "Мебель, декор, товары для дома и спорта",
  },
  {
    title: "360° обзор",
    description: "Плавное вращение товара на 360 градусов. Покупатель видит изделие со всех сторон",
    icon: Layers,
    example: "Обувь, сумки, электроника, посуда",
  },
];

const faqItems = [
  {
    question: "Когда будет доступна видео-генерация?",
    answer: "Мы активно работаем над этой функцией. Планируемый запуск — Q2 2025. Оставьте email, чтобы узнать о запуске первыми и получить бонусные токены для тестирования.",
  },
  {
    question: "Какие видео можно будет создавать?",
    answer: "Вы сможете генерировать: видеообложки для главного слайда карточки (первое, что видит покупатель), демонстрационные ролики товара с 360° обзором, lifestyle-видео с товаром в интерьере или в использовании.",
  },
  {
    question: "Какой формат и разрешение видео?",
    answer: "Видео будут в формате MP4, оптимизированном для Wildberries. Разрешение — до 1920×1080 (Full HD). Длительность — от 15 до 30 секунд согласно рекомендациям маркетплейса.",
  },
  {
    question: "Сколько будет стоить генерация видео?",
    answer: "Цены будут объявлены ближе к запуску. Мы планируем сделать функцию доступной для всех селлеров — стоимость будет сопоставима с генерацией комплекта карточек.",
  },
  {
    question: "Нужно специальное оборудование или навыки?",
    answer: "Нет! Достаточно загрузить качественные фотографии товара — минимум 4-6 ракурсов. ИИ сам создаст профессиональный видеоролик на их основе. Никакого монтажа не требуется.",
  },
  {
    question: "Можно ли добавить музыку и текст?",
    answer: "Да, мы планируем: библиотеку роялти-фри музыки на выбор, возможность загрузить свой аудиотрек, добавление текстовых плашек с УТП и акциями, фирменные вотермарки.",
  },
  {
    question: "Подходят ли видео для других маркетплейсов?",
    answer: "Да, созданные видео универсальны. MP4-файлы можно использовать на Wildberries, Ozon, Яндекс.Маркет и в социальных сетях для рекламы.",
  },
];

const relatedServices = [
  {
    title: "Создание карточек",
    description: "Генерация дизайна карточек с инфографикой за 3 минуты",
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
    description: "Бесплатные штрихкоды и этикетки для Wildberries",
    href: "/generator-shk",
    icon: Barcode,
  },
];

// Benefits section with cards layout
const BenefitsCards = () => (
  <section className="py-20 sm:py-28 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="inline-block px-4 py-2 rounded-full bg-[hsl(268,83%,55%)]/10 text-[hsl(268,83%,65%)] text-sm font-medium mb-4">
          Преимущества
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Зачем вашей карточке нужно видео
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Видеоконтент — ключ к повышению конверсии на маркетплейсах
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefitCards.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative"
          >
            <div className="glass-card rounded-2xl p-8 h-full border border-white/5 hover:border-[hsl(268,83%,55%)]/30 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(268,83%,55%)]/20 to-[hsl(280,90%,55%)]/10 flex items-center justify-center">
                  <benefit.icon className="w-7 h-7 text-[hsl(268,83%,65%)]" />
                </div>
                <span className="text-2xl font-bold text-[hsl(268,83%,65%)]">{benefit.stat}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
              <p className="text-white/60 leading-relaxed">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// Video types section
const VideoTypesSection = () => (
  <section className="py-20 sm:py-28 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
          Типы видео
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Форматы на любую задачу
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Выбирайте стиль видео, который лучше всего подойдёт для вашего товара
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {videoTypes.map((type, index) => (
          <motion.div
            key={type.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="glass-card rounded-2xl p-8 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 group"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <type.icon className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{type.title}</h3>
                <p className="text-white/60 mb-4">{type.description}</p>
                <p className="text-emerald-400/80 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {type.example}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// Notification signup section
const NotifySection = () => (
  <section className="py-20 sm:py-28 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] flex items-center justify-center mx-auto mb-8">
          <Bell className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Узнайте о запуске первыми
        </h2>
        <p className="text-white/60 text-lg mb-8">
          Оставьте email и получите уведомление о старте видео-генерации + бонусные токены для тестирования
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <Input 
            type="email" 
            placeholder="Ваш email" 
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <Button className="h-12 px-8 bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] text-white border-0 whitespace-nowrap">
            Уведомить меня
          </Button>
        </div>
        
        <p className="text-white/40 text-sm mt-4">
          Никакого спама. Только одно письмо при запуске.
        </p>
      </motion.div>
    </div>
  </section>
);

// Stats section
const StatsSection = () => (
  <section className="py-16 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: "+60%", label: "к кликабельности", icon: TrendingUp },
          { value: "×2", label: "время просмотра", icon: Clock },
          { value: "<5%", label: "конкурентов с видео", icon: Target },
          { value: "5 мин", label: "на создание", icon: Zap },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-[hsl(268,83%,55%)]/10 flex items-center justify-center mx-auto mb-4">
              <stat.icon className="w-6 h-6 text-[hsl(268,83%,65%)]" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</div>
            <div className="text-white/60 text-sm">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const VideoGeneration = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Видео-генерация для карточек Wildberries — AI-создание видеообложек | WBGen</title>
        <meta
          name="description"
          content="Генерация видеообложек для карточек Wildberries с помощью нейросети. Видеоконтент увеличивает CTR на 60%. Создание роликов за 5 минут. Скоро в WBGen."
        />
        <meta name="keywords" content="видео wildberries, видеообложка карточки, видео для wb, видеоконтент маркетплейс, видеогенерация ии" />
        <meta property="og:title" content="Видео-генерация для Wildberries — AI-создание видеообложек" />
        <meta property="og:description" content="ИИ-генерация видеообложек для карточек товаров. Увеличьте CTR на 60%. Скоро в WBGen." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/video-generaciya" />
        <link rel="canonical" href="https://wbgen.ru/video-generaciya" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Видео-генерация для карточек Wildberries",
            "description": "AI-создание видеообложек и демонстрационных роликов для маркетплейсов",
            "provider": {
              "@type": "Organization",
              "name": "WBGen",
              "url": "https://wbgen.ru"
            },
            "areaServed": "RU",
            "availableChannel": {
              "@type": "ServiceChannel",
              "serviceUrl": "https://wbgen.ru/video-generaciya"
            }
          })}
        </script>
      </Helmet>

      <ServiceHero
        title="AI-генерация видео"
        subtitle="для карточек товаров"
        description="Превратите фотографии товара в динамичные видеоролики, которые привлекают внимание в каталоге. Нейросеть создаёт профессиональное видео за минуты — без оборудования и монтажа."
        badge="🎬 Скоро"
        stats={[
          { value: "+60%", label: "к CTR" },
          { value: "15-30 сек", label: "хронометраж" },
          { value: "MP4 HD", label: "формат" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Видео-генерация" },
        ]}
        isComingSoon={true}
        heroImage={heroImage}
      />

      <StatsSection />

      <ServiceFeatures
        title="Возможности, которые мы разрабатываем"
        subtitle="Профессиональные инструменты для создания видеоконтента"
        features={features}
      />

      <StepsSection
        title="Как это будет работать"
        subtitle="От фотографий до готового видео — 4 простых шага"
        steps={steps}
      />

      <BenefitsCards />

      <VideoTypesSection />

      <NotifySection />

      <ServiceFAQ 
        items={faqItems}
        title="Вопросы о видео-генерации"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/video-generaciya" 
        title="Попробуйте уже сейчас"
      />

      <ServiceCTA
        title="Пока ждёте — создайте карточки с ИИ"
        subtitle="Генерация дизайна карточек и SEO-описаний уже доступна"
        ctaText="Создать карточку"
        ctaLink="/sozdanie-kartochek"
        secondaryCtaText="Смотреть все инструменты"
        secondaryCtaLink="/pricing"
      />
    </ServicePageLayout>
  );
};

export default VideoGeneration;