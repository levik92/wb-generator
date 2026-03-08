import {
  Clock,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  Users,
  Image,
  FileText,
  Palette,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "3 минуты",
    description: "вместо 3 дней работы с дизайнером",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: TrendingUp,
    title: "От 59₽",
    description: "за карточку вместо 5000-15000₽",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: Target,
    title: "+40% конверсии",
    description: "благодаря профессиональному дизайну",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Sparkles,
    title: "ИИ-технологии",
    description: "новейшие нейросети для уникального контента",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Zap,
    title: "Мгновенный старт",
    description: "регистрация за 30 секунд",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Поддержка 24/7",
    description: "помогаем решить любые вопросы",
    color: "from-indigo-500 to-purple-600",
  },
];

const capabilities = [
  {
    icon: Image,
    title: "Генерация карточек",
    description: "Профессиональные карточки с инфографикой для WB, Ozon, Яндекс Маркет",
    features: ["До 6 вариантов за раз", "Любой стиль дизайна", "Готовые PNG файлы"],
  },
  {
    icon: FileText,
    title: "SEO-описания",
    description: "Уникальные продающие тексты с ключевыми словами для роста в поиске",
    features: ["Анализ конкурентов", "До 1800 символов", "+35% к конверсии"],
  },
  {
    icon: Palette,
    title: "Стили инфографики",
    description: "Разнообразие стилей: minimal, premium, bold и другие",
    features: ["10+ стилей", "Кастомизация", "Трендовый дизайн"],
  },
  {
    icon: BarChart3,
    title: "Этикетки и коды",
    description: "Штрих-коды, QR-коды и этикетки для товаров WB бесплатно",
    features: ["CODE-128", "QR-коды", "Без ограничений"],
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gray-50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-sm text-purple-700 mb-6">
            Почему WBGen
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Дизайн карточек WB
            <br />
            <span className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,60%)] bg-clip-text text-transparent">
              без дизайнера
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
            ИИ-генератор карточек для WB, Ozon и Яндекс Маркет — профессиональный результат за минуты
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-24">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-6 sm:p-8 group"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Capabilities section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Полный набор инструментов
          </h3>
          <p className="text-gray-500 max-w-xl mx-auto">
            Всё, что нужно для создания продающих карточек на маркетплейсах
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="glass-card rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,55%)] to-[hsl(268,83%,45%)] flex items-center justify-center flex-shrink-0">
                  <cap.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {cap.title}
                  </h4>
                  <p className="text-gray-500 text-sm mb-4">{cap.description}</p>
                  <ul className="flex flex-wrap gap-2">
                    {cap.features.map((f) => (
                      <li
                        key={f}
                        className="px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs text-purple-700"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
