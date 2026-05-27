import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "Можно ли использовать карточки на Wildberries и Ozon?",
    answer:
      "Да. WBGen генерирует PNG-карточки в формате, оптимальном для Wildberries, Ozon, Яндекс Маркет и других маркетплейсов. Файлы можно сразу загружать в личный кабинет.",
  },
  {
    question: "Подходит ли сервис для Авито и соцсетей?",
    answer:
      "Да. Готовые изображения универсальны — их используют для Авито, объявлений, Telegram, ВКонтакте и баннеров в рекламе. Можно собирать карточки и обложки под разные площадки.",
  },
  {
    question: "Нужен ли опыт в дизайне?",
    answer:
      "Нет. Достаточно загрузить фото товара и кратко описать преимущества. AI сам подбирает композицию, шрифты и инфографику с фокусом на CTR и продаваемость.",
  },
  {
    question: "Можно ли делать карточки для клиентов?",
    answer:
      "Да. Менеджеры маркетплейсов и дизайнеры используют WBGen, чтобы быстрее закрывать заказы клиентов: генерировать концепты, собирать варианты для тестов и сдавать работу в день обращения.",
  },
  {
    question: "Сколько времени занимает создание карточки?",
    answer:
      "Один набор (до 6 карточек) — около 3 минут. SEO-описание — 30–60 секунд. Этикетки и штрих-коды — мгновенно.",
  },
  {
    question: "Можно ли тестировать разные варианты дизайна?",
    answer:
      "Да, это одна из ключевых функций. Вы получаете несколько вариантов за раз, можете перегенерировать и точечно править отдельные элементы — удобно для A/B-тестов и усиления рекламы.",
  },
  {
    question: "Чем WBGen отличается от обычного конструктора?",
    answer:
      "Конструктор требует ручной работы и шаблонного результата. WBGen использует AI: он сам собирает дизайн под товар, делает инфографику и подбирает стиль — без перетаскивания блоков.",
  },
  {
    question: "Сколько стоит и есть ли подписка?",
    answer:
      "Сервис работает по модели токенов без обязательной подписки. 1 карточка — от 59₽. Токены не сгорают — удобно для селлеров с разной активностью.",
  },
  {
    question: "Безопасно ли загружать фото товаров?",
    answer:
      "Да. Файлы хранятся в защищённом облаке, используются только для генерации ваших карточек и не передаются третьим лицам.",
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />
      
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Частые вопросы
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Ответы на популярные вопросы о работе сервиса
          </p>
        </div>

        {/* FAQ items - CSS-based accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="faq-item rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
                aria-expanded={openIndex === index}
              >
                <span className="text-base sm:text-lg font-medium text-white pr-8">
                  {item.question}
                </span>
                <div 
                  className={`flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown className="w-5 h-5 text-white/50" />
                </div>
              </button>

              <div 
                className={`grid transition-all duration-300 ease-out ${
                  openIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6">
                    <p className="text-white/60 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
