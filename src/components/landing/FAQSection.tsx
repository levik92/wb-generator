import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "Что такое токены и сколько их нужно?",
    answer:
      "Токены — это внутренняя валюта сервиса. 1 токен = примерно 12₽. Для генерации одной карточки нужно около 5 токенов (примерно 60₽). При регистрации вы получаете 10 бесплатных токенов для тестирования.",
  },
  {
    question: "Какого качества будут карточки?",
    answer:
      "Карточки генерируются в разрешении, оптимальном для Wildberries. Результат соответствует профессиональному дизайну: инфографика, правильная композиция, читаемые тексты и акценты на преимуществах товара.",
  },
  {
    question: "Можно ли редактировать результат?",
    answer:
      "Да! Вы можете перегенерировать любую карточку неограниченное количество раз (за токены). Также доступна функция редактирования отдельных элементов через встроенный ИИ-редактор.",
  },
  {
    question: "Для каких маркетплейсов подходит сервис?",
    answer:
      "WBGen создаёт карточки для Wildberries, Ozon, Яндекс Маркет и других маркетплейсов. Готовые PNG-файлы универсальны и подходят для любой площадки. ИИ адаптирует стиль под категорию товара.",
  },
  {
    question: "Как быстро происходит генерация?",
    answer:
      "Генерация одного набора карточек (до 6 штук) занимает 2-3 минуты. SEO-описание создается за 30-60 секунд. Этикетки и штрих-коды — мгновенно.",
  },
  {
    question: "Есть ли подписка или только пакеты?",
    answer:
      "Сейчас мы работаем по модели пакетов токенов без ежемесячной подписки. Вы покупаете токены и используете их когда удобно — они не сгорают. Это удобнее для продавцов с разной активностью.",
  },
  {
    question: "Что делать, если результат не понравился?",
    answer:
      "Вы можете перегенерировать карточку с другими настройками или изменить описание товара. Также доступна функция редактирования отдельных элементов. Мы постоянно улучшаем качество генерации.",
  },
  {
    question: "Безопасно ли загружать фото товаров?",
    answer:
      "Да, все загруженные фотографии хранятся в защищенном облаке и используются только для генерации ваших карточек. Мы не передаем данные третьим лицам и не используем их для обучения моделей.",
  },
];

export const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />
      
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Частые вопросы
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Ответы на популярные вопросы о работе сервиса
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              className="faq-item rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-base sm:text-lg font-medium text-white pr-8">
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-white/50" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6">
                      <p className="text-white/60 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
