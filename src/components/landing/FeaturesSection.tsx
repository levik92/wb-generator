import { useRef } from "react";
import { motion, useInView } from "framer-motion";
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
    description: "10 бесплатных токенов после регистрации",
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
    description: "Профессиональные карточки с инфографикой и дизайном для Wildberries",
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
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            Почему WBGen
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Дизайн карточек WB
            <br />
            <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] to-[hsl(280,90%,70%)] bg-clip-text text-transparent">
              без дизайнера
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto">
            ИИ-генератор карточек для Wildberries — профессиональный результат за минуты
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-24">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-6 sm:p-8 group"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Capabilities section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Полный набор инструментов
          </h3>
          <p className="text-white/50 max-w-xl mx-auto">
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center flex-shrink-0">
                  <cap.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {cap.title}
                  </h4>
                  <p className="text-white/50 text-sm mb-4">{cap.description}</p>
                  <ul className="flex flex-wrap gap-2">
                    {cap.features.map((f) => (
                      <li
                        key={f}
                        className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
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
