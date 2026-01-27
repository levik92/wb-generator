import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceFAQ, ServiceCTA } from "@/components/services";
import { PricingSection } from "@/components/landing/PricingSection";
import { Breadcrumbs } from "@/components/services/Breadcrumbs";

const faqItems = [
  { question: "Что такое токены?", answer: "Токены — внутренняя валюта сервиса. На генерацию карточек и описаний тратится определённое количество токенов в зависимости от сложности." },
  { question: "Есть ли подписка?", answer: "Нет обязательной подписки. Вы покупаете пакет токенов и используете их когда нужно. Токены не сгорают." },
  { question: "Какие способы оплаты?", answer: "Банковские карты Visa, MasterCard, МИР. Оплата через ЮKassa, безопасно и быстро." },
  { question: "Можно ли вернуть деньги?", answer: "Возврат возможен если вы не использовали токены. Обратитесь в поддержку." },
  { question: "Есть ли скидки?", answer: "Да, чем больше пакет — тем ниже цена за токен. Также следите за промокодами в нашем Telegram." },
];

const PricingPage = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Тарифы WBGen — цены на генерацию карточек для Wildberries, Ozon, Яндекс Маркет</title>
        <meta name="description" content="Тарифы WBGen: от 59₽ за карточку для WB, Ozon и Яндекс Маркет. Пакеты токенов без подписки, штрихкоды бесплатно. Выберите подходящий тариф." />
        <meta property="og:title" content="Тарифы WBGen — цены на генерацию карточек" />
        <meta property="og:url" content="https://wbgen.ru/pricing" />
        <link rel="canonical" href="https://wbgen.ru/pricing" />
      </Helmet>

      {/* Simple header section without hero */}
      <section className="relative pt-20 pb-4 sm:pt-24 sm:pb-6">
        <div className="container mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ label: "Тарифы" }]} />
        </div>
      </section>

      <PricingSection />

      <ServiceFAQ items={faqItems} title="Вопросы об оплате" />

      <ServiceCTA title="Остались вопросы?" subtitle="Напишите нам и мы подберём оптимальный тариф" ctaText="Написать в Telegram" ctaLink="https://t.me/wbgen_support" />
    </ServicePageLayout>
  );
};

export default PricingPage;
