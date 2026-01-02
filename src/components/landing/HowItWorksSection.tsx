import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Image, FileText, Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Image,
    title: "Загрузите фото",
    description: "До 3 фотографий товара. Подойдут даже простые снимки на телефон",
    color: "from-purple-500 to-violet-600",
  },
  {
    number: "02",
    icon: FileText,
    title: "Опишите товар",
    description: "Расскажите о преимуществах и добавьте пожелания по дизайну",
    color: "from-blue-500 to-cyan-600",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "ИИ создает карточки",
    description: "Нейросеть генерирует до 6 профессиональных карточек за 3 минуты",
    color: "from-pink-500 to-rose-600",
  },
  {
    number: "04",
    icon: Check,
    title: "Скачайте результат",
    description: "Получите готовые PNG и сразу загрузите в кабинет Wildberries",
    color: "from-emerald-500 to-green-600",
  },
];

export const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      {/* Top border gradient */}
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
            Простой процесс
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Как увеличить продажи
            <br />
            <span className="bg-gradient-to-r from-[hsl(268,83%,65%)] to-[hsl(280,90%,70%)] bg-clip-text text-transparent">
              на Wildberries
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto">
            Четыре простых шага до профессиональных карточек товара
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-[hsl(268,83%,50%)]/30 to-white/10 hidden sm:block" />

            <div className="space-y-8 sm:space-y-0">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className={`relative flex items-center gap-6 sm:gap-0 ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                >
                  {/* Step number (mobile) */}
                  <div className="sm:hidden flex-shrink-0">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 sm:w-[calc(50%-3rem)] ${
                      index % 2 === 0 ? "sm:pr-12" : "sm:pl-12"
                    }`}
                  >
                    <div className="glass-card rounded-2xl p-6 sm:p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-white/20 to-white/5 bg-clip-text text-transparent">
                          {step.number}
                        </span>
                        <div
                          className={`hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} items-center justify-center`}
                        >
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-white/50">{step.description}</p>
                    </div>
                  </div>

                  {/* Center dot (desktop) */}
                  <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[hsl(268,83%,50%)] shadow-lg shadow-purple-500/50 z-10" />

                  {/* Spacer for alternating layout */}
                  <div className="hidden sm:block flex-1 sm:w-[calc(50%-3rem)]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <Link to="/auth?tab=signup">
            <Button className="btn-premium text-base sm:text-lg px-8 py-6 rounded-xl font-semibold group">
              Попробовать бесплатно
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
