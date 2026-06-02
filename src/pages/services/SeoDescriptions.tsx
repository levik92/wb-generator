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
import { motion } from "framer-motion";
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
  Brain,
  ListChecks,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import heroImage from "@/assets/service-seo-hero.png";

const features = [
  {
    icon: Search,
    title: "Автоматический подбор ключей",
    description: "ИИ анализирует топовые карточки WB, Ozon, Яндекс Маркет и собирает самые частотные поисковые запросы",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Brain,
    title: "Формула AIDA",
    description: "Описания строятся по проверенной продающей формуле: Внимание → Интерес → Желание → Действие",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Target,
    title: "Анализ конкурентов",
    description: "Нейросеть изучает описания лидеров в категории и адаптирует лучшие практики для вашего товара",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: ListChecks,
    title: "Оптимальная структура",
    description: "Текст форматируется под требования алгоритмов WB, Ozon и Яндекс Маркет: заголовки, списки, ключевые слова",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Zap,
    title: "Генерация за 30 секунд",
    description: "Получите готовое продающее описание быстрее, чем копирайтер напишет первый абзац",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: MessageSquare,
    title: "Свои ключевые слова",
    description: "Добавляйте собственные ключи и пожелания — ИИ учтёт их при генерации текста",
    color: "from-indigo-500 to-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Введите данные о товаре",
    description: "Укажите название, категорию, основные характеристики и преимущества продукта",
    icon: PenTool,
  },
  {
    number: "02",
    title: "ИИ анализирует нишу",
    description: "Нейросеть изучает конкурентов, собирает ключевые слова и определяет оптимальную структуру",
    icon: Search,
  },
  {
    number: "03",
    title: "Генерация по формуле AIDA",
    description: "Создаётся уникальное продающее описание с правильной структурой и ключевыми словами",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Скопируйте в карточку",
    description: "Готовое описание можно сразу вставить на Wildberries. Или отредактируйте под себя",
    icon: Copy,
  },
];

const benefits = [
  {
    title: "Рост позиций в поиске WB",
    description: "Правильно подобранные ключевые слова помогают товару попадать в топ выдачи по целевым запросам",
  },
  {
    title: "Конверсия в покупку +35%",
    description: "Продающая структура текста по формуле AIDA мотивирует покупателей нажать «В корзину»",
  },
  {
    title: "Экономия 5-10 часов в неделю",
    description: "Вместо мучительного написания текстов — готовое описание за 30 секунд",
  },
  {
    title: "100% уникальность контента",
    description: "Каждое описание генерируется индивидуально, без шаблонов и копипаста",
  },
  {
    title: "Соответствие требованиям WB",
    description: "Оптимальная длина 1000-1800 символов и структура, которую любят алгоритмы маркетплейса",
  },
];

const stats = [
  { value: "50 000+", label: "описаний создано", icon: FileText },
  { value: "3 200+", label: "селлеров используют", icon: Users },
  { value: "+35%", label: "средний рост конверсии", icon: TrendingUp },
  { value: "30 сек", label: "время генерации", icon: Zap },
];

const testimonials = [
  {
    name: "Ольга Морозова",
    role: "Продавец товаров для дома, 800+ SKU",
    content: "После замены описаний на сгенерированные в WBGen продажи выросли на 32%. Ключевые слова подбираются автоматически — это огромная экономия времени. Раньше тратила на тексты по 2-3 часа в день.",
    rating: 5,
  },
  {
    name: "Артём Волков",
    role: "Селлер спортивных товаров",
    content: "Главное — не нужно думать, какие запросы использовать. ИИ сам анализирует конкурентов и подбирает ключи. Мои позиции в поиске WB выросли, появились органические продажи без рекламы.",
    rating: 5,
  },
  {
    name: "Наталья Козлова",
    role: "Поставщик косметики, бренд NatKos",
    content: "Удобно, что можно добавить свои ключевые слова и особенности товара. Получается персонализированное описание, которое точно передаёт преимущества. Клиенты пишут, что описания понятные и полные.",
    rating: 5,
  },
];

const faqItems = [
  {
    question: "Как ИИ подбирает ключевые слова?",
    answer: "Нейросеть анализирует поисковые запросы на Wildberries, изучает описания топовых карточек в вашей категории и подбирает наиболее частотные и релевантные ключевые слова. Вы также можете добавить собственные ключи.",
  },
  {
    question: "Что такое формула AIDA и как она работает?",
    answer: "AIDA — это проверенная формула продающего текста: Attention (Внимание) → Interest (Интерес) → Desire (Желание) → Action (Действие). ИИ структурирует описание по этой формуле, чтобы текст вёл покупателя к покупке.",
  },
  {
    question: "Какая оптимальная длина описания для WB?",
    answer: "Алгоритмы Wildberries лучше ранжируют описания длиной 1000-1800 символов. WBGen генерирует тексты именно в этом диапазоне, с оптимальной плотностью ключевых слов.",
  },
  {
    question: "Можно ли редактировать готовое описание?",
    answer: "Да, вы получаете текст, который можете свободно редактировать перед загрузкой на маркетплейс. Также можно перегенерировать описание с другими параметрами или дополнительными пожеланиями.",
  },
  {
    question: "Подходят ли описания для Ozon и других маркетплейсов?",
    answer: "Да, сгенерированные описания универсальны. Вы можете адаптировать длину и формат под требования любой площадки: Ozon, Яндекс.Маркет, СберМегаМаркет и других.",
  },
  {
    question: "Сколько токенов тратится на генерацию описания?",
    answer: "Генерация одного SEO-описания тратит меньше токенов, чем создание визуальной карточки. При регистрации вы получаете токены для тестирования. Точную стоимость смотрите на странице тарифов.",
  },
  {
    question: "ИИ создаёт уникальные тексты?",
    answer: "Да, каждое описание генерируется индивидуально на основе ваших данных о товаре. Это не шаблоны и не переписанные тексты конкурентов — полностью уникальный контент.",
  },
  {
    question: "Как часто нужно обновлять описания?",
    answer: "Рекомендуем обновлять описания при изменении характеристик товара, сезонных акциях или если позиции в поиске падают. WBGen позволяет быстро сгенерировать новую версию текста.",
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

// Keywords visualization section
const KeywordsSection = () => (
  <section className="py-16 sm:py-24 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Как работает подбор ключевых слов
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto">
          ИИ анализирует реальные поисковые запросы покупателей на Wildberries
        </p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Пример для категории «Косметика»</h3>
              <p className="text-white/50 text-sm">Товар: увлажняющий крем для лица</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { word: "увлажняющий крем", freq: "высокая" },
              { word: "крем для лица", freq: "высокая" },
              { word: "корейская косметика", freq: "средняя" },
              { word: "гиалуроновая кислота", freq: "средняя" },
              { word: "антивозрастной", freq: "средняя" },
              { word: "для сухой кожи", freq: "средняя" },
              { word: "натуральный состав", freq: "низкая" },
              { word: "дневной крем", freq: "низкая" },
            ].map((kw, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  kw.freq === "высокая"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : kw.freq === "средняя"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-white/10 text-white/70 border border-white/20"
                }`}
              >
                {kw.word}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Высокая частотность
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Средняя
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white/30" /> Низкая
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

// AIDA Formula visualization
const AidaSection = () => (
  <section className="py-16 sm:py-24 border-t border-white/10">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Формула AIDA в действии
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto">
          Структура, которая превращает просмотры в продажи
        </p>
      </motion.div>

      <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {[
          {
            letter: "A",
            title: "Attention",
            subtitle: "Внимание",
            description: "Яркий заголовок с главным УТП товара. Цепляет взгляд покупателя",
            color: "from-purple-500 to-violet-600",
          },
          {
            letter: "I",
            title: "Interest",
            subtitle: "Интерес",
            description: "Раскрытие преимуществ и особенностей. Отвечает на «Что это мне даст?»",
            color: "from-blue-500 to-cyan-600",
          },
          {
            letter: "D",
            title: "Desire",
            subtitle: "Желание",
            description: "Эмоциональная выгода и социальное доказательство. Хочется купить",
            color: "from-amber-500 to-orange-600",
          },
          {
            letter: "A",
            title: "Action",
            subtitle: "Действие",
            description: "Призыв к действию и снятие возражений. Подталкивает к покупке",
            color: "from-emerald-500 to-green-600",
          },
        ].map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-6 text-center"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4`}>
              <span className="text-2xl font-bold text-white">{step.letter}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
            <p className="text-[hsl(268,83%,65%)] text-sm mb-3">{step.subtitle}</p>
            <p className="text-white/60 text-sm">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const SeoDescriptions = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>SEO-описания для Wildberries, Ozon, Яндекс Маркет — генерация текстов с ИИ | WBGen</title>
        <meta
          name="description"
          content="Автоматическая генерация SEO-описаний для карточек Wildberries, Ozon и Яндекс Маркет. Подбор ключевых слов, формула AIDA, +35% к конверсии. Готовый текст за 30 секунд."
        />
        <meta name="keywords" content="seo описания wildberries, описание товара ozon, ключевые слова маркетплейс, продающее описание, яндекс маркет описание" />
        <meta property="og:title" content="SEO-описания для маркетплейсов — WBGen" />
        <meta property="og:description" content="ИИ-генерация продающих описаний с ключевыми словами для WB, Ozon, Яндекс Маркет." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wbgen.ru/seo-opisaniya" />
        <link rel="canonical" href="https://wbgen.ru/seo-opisaniya" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Генерация SEO-описаний для Wildberries",
            "description": "Автоматическое создание продающих описаний с ключевыми словами для карточек товаров маркетплейсов",
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
        title="SEO-описания для Wildberries"
        subtitle="с ключевыми словами"
        description="Генерируйте продающие описания по формуле AIDA за 30 секунд. ИИ анализирует конкурентов и подбирает ключевые слова."
        badge="📝 50 000+ описаний создано"
        accent="blue"
        signature={(
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white/70 font-mono">AIDA</span>
            <span className="text-white/30">→</span>
            <span className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-200 font-mono">+keywords</span>
            <span className="text-white/30">→</span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 font-mono">конверсия +35%</span>
          </div>
        )}
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
        title="Почему SEO-описания от WBGen работают"
        subtitle="Умный ИИ, который знает, как продавать текстом"
        features={features}
      />

      <KeywordsSection />

      <StepsSection
        title="Как создать описание за 30 секунд"
        subtitle="От ввода данных до готового текста — 4 простых шага"
        steps={steps}
      />

      <AidaSection />

      <BenefitsSection
        title="Результаты для вашего бизнеса"
        subtitle="Что вы получите с SEO-описаниями от WBGen"
        benefits={benefits}
      />

      <TestimonialsSection
        title="Отзывы селлеров"
        subtitle="Реальные результаты наших пользователей"
        testimonials={testimonials}
      />

      <ServiceFAQ 
        items={faqItems}
        title="Частые вопросы о SEO-описаниях"
      />

      <RelatedServices 
        services={relatedServices} 
        currentPath="/seo-opisaniya"
        title="Другие инструменты для селлеров"
      />

      <ServiceCTA
        title="Создайте SEO-описание прямо сейчас"
        subtitle="Получите токены при регистрации и протестируйте качество ИИ-генерации"
        ctaText="Начать"
        secondaryCtaText="Смотреть примеры"
        secondaryCtaLink="/cases"
      />
    </ServicePageLayout>
  );
};

export default SeoDescriptions;
