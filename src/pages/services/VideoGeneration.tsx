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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import heroImage from "@/assets/service-video-hero.png";

const features = [
  {
    icon: Video,
    title: "Анимация карточки до 5 сек",
    description: "Превращаем статичную обложку в «живую» карточку с плавной анимацией до 5 секунд. Автовоспроизведение в каталоге WB привлекает внимание",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Sparkles,
    title: "ИИ-анимация обложки",
    description: "Нейросеть анализирует вашу карточку и добавляет естественное движение: мерцание, плавные эффекты, динамичные акценты",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: TrendingUp,
    title: "+60% к кликабельности",
    description: "Движущаяся карточка выделяется среди статичных изображений. Покупатели кликают на «живые» обложки значительно чаще",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Clock,
    title: "До 5 секунд — идеальный хронометраж",
    description: "Оптимальная длительность для автовоспроизведения в каталоге. Успевает привлечь внимание, не замедляя скролл покупателя",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Layers,
    title: "Та же карточка — но живая",
    description: "Не создаём новое видео, а анимируем вашу готовую обложку. Сохраняется дизайн, инфографика и все элементы",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Film,
    title: "Разные стили анимации",
    description: "Плавное появление, эффект параллакса, мерцание акцентов, zoom-in на товар — выбирайте стиль под вашу карточку",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Загрузите готовую карточку",
    description: "Добавьте обложку карточки, которую вы уже создали в WBGen или загрузили отдельно",
    icon: Upload,
  },
  {
    number: "02",
    title: "Выберите стиль анимации",
    description: "Плавное появление, параллакс, мерцание элементов или zoom на товар — подберите под свой дизайн",
    icon: Clapperboard,
  },
  {
    number: "03",
    title: "ИИ создаёт анимацию",
    description: "Нейросеть анимирует карточку за 1-2 минуты, сохраняя весь дизайн и инфографику",
    icon: Wand2,
  },
  {
    number: "04",
    title: "Скачайте готовый MP4",
    description: "Получите видеообложку до 5 секунд в формате MP4 HD для загрузки на Wildberries",
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

// Animation types section
const videoTypes = [
  {
    title: "Плавное появление",
    description: "Элементы карточки появляются последовательно: сначала товар, затем заголовок и инфографика",
    icon: Play,
    example: "Идеально для одежды, украшений, аксессуаров",
  },
  {
    title: "Эффект параллакса",
    description: "Фон и передний план движутся с разной скоростью, создавая ощущение глубины и объёма",
    icon: Clapperboard,
    example: "Для техники, гаджетов, товаров с функционалом",
  },
  {
    title: "Мерцание акцентов",
    description: "Мягкое свечение выделенных элементов: цен, скидок, УТП. Притягивает взгляд к важному",
    icon: Sparkles,
    example: "Мебель, декор, товары для дома и спорта",
  },
  {
    title: "Zoom на товар",
    description: "Плавное приближение к товару с последующим отдалением. Показывает детали без перегрузки",
    icon: Target,
    example: "Обувь, сумки, электроника, косметика",
  },
];

const faqItems = [
  {
    question: "Что такое видеообложка карточки?",
    answer: "Это короткое видео до 5 секунд, которое автоматически воспроизводится в каталоге Wildberries вместо статичной обложки. Мы анимируем вашу готовую карточку: добавляем плавное движение, эффекты, динамику — и она «оживает», привлекая больше кликов.",
  },
  {
    question: "Чем это отличается от создания видео с нуля?",
    answer: "Мы не снимаем новое видео. Мы анимируем уже готовую обложку карточки: вся ваша инфографика, цвета и дизайн сохраняются — карточка просто оживает. Это быстрее, дешевле и не требует видеооператора.",
  },
  {
    question: "Какая длительность анимации?",
    answer: "До 5 секунд — оптимальный хронометраж для автовоспроизведения в каталоге Wildberries. Достаточно, чтобы привлечь внимание, но не замедлять скролл покупателя.",
  },
  {
    question: "Какой формат и разрешение?",
    answer: "Готовый файл — MP4, оптимизированный под Wildberries. Разрешение до 900×1200 пикселей (стандарт карточки WB). Файл весит до 5 МБ для быстрой загрузки.",
  },
  {
    question: "Сколько стоит создание видеообложки?",
    answer: "От 10₽ за обложку. Точная цена зависит от выбранного пакета токенов. При регистрации вы получаете токены для тестирования — попробуйте бесплатно.",
  },
  {
    question: "Можно анимировать любую карточку?",
    answer: "Да, вы можете анимировать карточки, созданные в WBGen, или загрузить любую готовую обложку. Главное — качественное изображение с разрешением от 800×800 пикселей.",
  },
  {
    question: "Подходит для Ozon и других маркетплейсов?",
    answer: "Да, созданные MP4-файлы универсальны: подходят для Wildberries, Ozon, Яндекс Маркет и для рекламы в социальных сетях.",
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

// Video cases data - placeholder for GIFs
const videoCases = [
  {
    id: 1,
    afterImage: "/lovable-uploads/video-case-after-jeans.jpg",
    videoUrl: "/lovable-uploads/video-case-jeans.mp4",
    title: "Джинсы — Одежда",
    description: "+47% кликов в первую неделю. Анимация привлекла внимание к посадке и деталям ткани.",
    metric: "+47% CTR",
  },
  {
    id: 2,
    afterImage: "/lovable-uploads/video-case-after-headphones.jpg",
    videoUrl: "/lovable-uploads/video-case-headphones.mp4",
    title: "Гарнитура — Электроника",
    description: "+52% конверсии. Динамичная обложка подчеркнула премиальность и технологичность.",
    metric: "+52% CR",
  },
  {
    id: 3,
    afterImage: "/lovable-uploads/video-case-after-laptop.jpg",
    videoUrl: "/lovable-uploads/video-case-laptop.mp4",
    title: "Ноутбук — Техника",
    description: "+38% времени просмотра. Анимация показала мощь и дизайн устройства.",
    metric: "+38% время",
  },
  {
    id: 4,
    afterImage: "/lovable-uploads/video-case-after-headphones2.jpg",
    videoUrl: "/lovable-uploads/video-case-headphones2.mp4",
    title: "Наушники — Аудио",
    description: "+44% к кликабельности. Премиальный стиль анимации усилил восприятие качества.",
    metric: "+44% CTR",
  },
];

// Video Cases Section with before/after
const VideoCasesSection = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <section id="examples" className="py-20 sm:py-28 border-t border-white/10 bg-gradient-to-b from-[hsl(var(--primary))]/5 to-transparent">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-4">
            Кейсы
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Карточка → Видеообложка до 5 сек
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Нажмите на карточку, чтобы посмотреть готовую видеообложку
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {videoCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => setActiveVideo(caseItem.videoUrl)}
            >
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-300">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={caseItem.afterImage}
                    alt={caseItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/80 backdrop-blur-sm rounded text-xs text-white font-medium">
                    {caseItem.metric}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">{caseItem.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2">{caseItem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-md p-0 bg-black border-white/10 overflow-hidden">
          {activeVideo && (
            <video
              src={activeVideo}
              autoPlay
              loop
              muted
              playsInline
              className="w-full aspect-[3/4] object-cover"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

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

// Animation types section
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
          Стили анимации
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Эффекты на любую карточку
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Выбирайте стиль анимации, который лучше всего подойдёт для вашего дизайна
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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(280,90%,55%)] flex items-center justify-center mx-auto mb-8">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Сервис №1 в СНГ по ИИ-видеообложкам
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          Загрузите карточку — получите анимированную обложку за 2 минуты. Без видеооператора, без монтажа, без студии. Только вы и нейросеть.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
          {[
            { value: "10₽", label: "за обложку" },
            { value: "2 мин", label: "генерация" },
            { value: "MP4", label: "готовый файл" },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-2xl font-bold text-[hsl(var(--primary))]">{s.value}</div>
              <div className="text-muted-foreground text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        
        <Link to={withUtm("/auth?tab=signup")}>
          <Button className="h-12 px-10 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(280,90%,55%)] text-white border-0 text-base">
            Создать видеообложку
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
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
          { value: "5 сек", label: "хронометраж", icon: Film },
          { value: "2 мин", label: "на создание", icon: Zap },
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
          content="Генерация видеообложек для карточек Wildberries с помощью нейросети. Видеоконтент увеличивает CTR на 60%. От 10₽ за обложку, готовый MP4 за 2 минуты."
        />
        <meta name="keywords" content="видео wildberries, видеообложка карточки, видео для wb, видеоконтент маркетплейс, видеогенерация ии" />
        <meta property="og:title" content="Видео-генерация для Wildberries — AI-создание видеообложек" />
        <meta property="og:description" content="ИИ-генерация видеообложек для карточек товаров. Увеличьте CTR на 60% — готовый MP4 за 2 минуты." />
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
        title="Анимация карточек"
        subtitle="«Живые» обложки для WB"
        description="Превратите готовую карточку в анимированную обложку до 5 секунд. Нейросеть добавляет движение, эффекты и динамику — карточка выделяется в каталоге и привлекает больше кликов."
        badge="🎬 Видеообложки уже доступны"
        stats={[
          { value: "+60%", label: "к CTR" },
          { value: "до 5 сек", label: "хронометраж" },
          { value: "MP4 HD", label: "формат" },
        ]}
        breadcrumbs={[
          { label: "Продукт" },
          { label: "Анимация карточек" },
        ]}
        ctaText="Создать видеообложку"
        ctaLink="/auth?tab=signup"
        secondaryCtaText="Примеры"
        secondaryCtaLink="#examples"
        heroImage={heroImage}
      />

      <ServiceFeatures
        title="Возможности анимации карточек"
        subtitle="Профессиональные инструменты, чтобы карточка выделялась в каталоге"
        features={features}
      />

      <StepsSection
        title="Как это работает"
        subtitle="От готовой карточки до живой обложки — 4 простых шага"
        steps={steps}
      />

      <BenefitsCards />

      {/* Video Cases Section */}
      <VideoCasesSection />

      <VideoTypesSection />

      <NotifySection />

      <ServiceFAQ 
        items={faqItems}
        title="Вопросы об анимации карточек"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/video-generaciya" 
        title="Попробуйте уже сейчас"
      />

      <ServiceCTA
        title="Создайте видеообложку прямо сейчас"
        subtitle="Загрузите карточку и получите анимированную обложку за 2 минуты"
        ctaText="Создать видеообложку"
        ctaLink="/auth"
        secondaryCtaText="Смотреть примеры"
        secondaryCtaLink="#examples"
      />
    </ServicePageLayout>
  );
};

export default VideoGeneration;