import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceFAQ, ServiceCTA } from "@/components/services";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Book, Image, FileText, Barcode, CreditCard, ArrowRight } from "lucide-react";

const categories = [
  { icon: Book, title: "Начало работы", description: "Регистрация, первые шаги, интерфейс", href: "/baza-znaniy#start", count: 5 },
  { icon: Image, title: "Генерация карточек", description: "Как создавать карточки с ИИ", href: "/baza-znaniy#cards", count: 8 },
  { icon: FileText, title: "SEO-описания", description: "Работа с текстами и ключевыми словами", href: "/baza-znaniy#seo", count: 4 },
  { icon: Barcode, title: "Штрихкоды и этикетки", description: "Генерация ШК для маркетплейсов", href: "/baza-znaniy#barcode", count: 3 },
  { icon: CreditCard, title: "Оплата и тарифы", description: "Токены, пакеты, способы оплаты", href: "/baza-znaniy#payment", count: 6 },
];

const faqItems = [
  { question: "Как начать работу с WBGen?", answer: "Зарегистрируйтесь, получите бесплатные токены и загрузите первое фото товара. Выберите стиль и нажмите «Сгенерировать». Через 2-3 минуты карточка готова." },
  { question: "Сколько токенов даётся при регистрации?", answer: "При регистрации вы получаете бесплатные токены для тестирования сервиса. Их хватит на несколько генераций." },
  { question: "Как пополнить баланс токенов?", answer: "Перейдите в раздел «Тарифы» в личном кабинете, выберите пакет и оплатите картой. Токены зачисляются мгновенно." },
  { question: "Можно ли вернуть токены?", answer: "Если генерация не удалась по техническим причинам, токены возвращаются автоматически. По другим вопросам обращайтесь в поддержку." },
  { question: "Как связаться с поддержкой?", answer: "Напишите в Telegram @wbgen_support или на email info@wbgen.ru. Мы отвечаем в течение нескольких часов." },
];

const KnowledgeBase = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>База знаний WBGen — инструкции и FAQ</title>
        <meta name="description" content="Инструкции по работе с WBGen: создание карточек, SEO-описания, штрихкоды. Ответы на частые вопросы и руководства для селлеров." />
        <meta property="og:title" content="База знаний WBGen" />
        <meta property="og:url" content="https://wbgen.ru/baza-znaniy" />
        <link rel="canonical" href="https://wbgen.ru/baza-znaniy" />
      </Helmet>

      <ServiceHero
        title="База знаний"
        subtitle="WBGen"
        description="Инструкции, руководства и ответы на частые вопросы. Всё, что нужно знать для эффективной работы с сервисом."
        breadcrumbs={[{ label: "Ресурсы" }, { label: "База знаний" }]}
        badge="Справочный центр"
        ctaText="Написать в поддержку"
        ctaLink="https://t.me/wbgen_support"
      />

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categories.map((cat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={cat.href} className="block glass-card rounded-2xl p-6 group hover:border-white/20 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <cat.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{cat.title}</h3>
                  <p className="text-white/50 text-sm mb-4">{cat.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{cat.count} статей</span>
                    <ArrowRight className="w-4 h-4 text-[hsl(268,83%,65%)]" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ServiceFAQ items={faqItems} title="Популярные вопросы" />

      <ServiceCTA title="Не нашли ответ?" subtitle="Напишите нам и мы поможем разобраться" ctaText="Написать в Telegram" ctaLink="https://t.me/wbgen_support" />
    </ServicePageLayout>
  );
};

export default KnowledgeBase;
