import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceFeatures, ServiceFAQ, ServiceCTA } from "@/components/services";
import { Users, Percent, Wallet, TrendingUp, Gift, Shield } from "lucide-react";
import heroImage from "@/assets/service-partners-hero.jpg";

const features = [
  { icon: Percent, title: "20% комиссии", description: "С каждой покупки приглашённых пользователей", color: "from-emerald-500 to-green-600" },
  { icon: Wallet, title: "Вывод от 5000₽", description: "На карту любого банка РФ", color: "from-blue-500 to-cyan-600" },
  { icon: Users, title: "Без лимитов", description: "Приглашайте неограниченное число пользователей", color: "from-purple-500 to-violet-600" },
  { icon: TrendingUp, title: "Пожизненно", description: "Получайте комиссию со всех покупок навсегда", color: "from-pink-500 to-rose-600" },
  { icon: Gift, title: "Бонусы рефералам", description: "Приглашённые получают дополнительные токены", color: "from-amber-500 to-orange-600" },
  { icon: Shield, title: "Прозрачная статистика", description: "Отслеживайте заработок в личном кабинете", color: "from-indigo-500 to-purple-600" },
];

const faqItems = [
  { question: "Как стать партнёром?", answer: "Зарегистрируйтесь в WBGen и перейдите в раздел «Партнёрам» в личном кабинете. Там вы получите уникальную реферальную ссылку." },
  { question: "Какой процент комиссии?", answer: "Вы получаете 20% от каждой покупки токенов пользователями, которых пригласили по вашей ссылке." },
  { question: "Как вывести заработок?", answer: "В личном кабинете партнёра нажмите «Вывести средства», укажите реквизиты карты. Минимальная сумма вывода — 5000₽." },
  { question: "Как долго действует реферальная связь?", answer: "Пожизненно. Вы получаете комиссию со всех покупок приглашённого пользователя, пока он пользуется сервисом." },
  { question: "Можно ли продвигать ссылку в рекламе?", answer: "Да, вы можете использовать реферальную ссылку в социальных сетях, блогах, рекламе — любым легальным способом." },
];

const PartnersPage = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>Партнёрская программа WBGen — зарабатывайте 15%</title>
        <meta name="description" content="Партнёрская программа WBGen: 15% с каждой покупки приглашённых. Вывод от 1000₽, пожизненная комиссия." />
        <meta property="og:title" content="Партнёрская программа WBGen" />
        <meta property="og:url" content="https://wbgen.ru/partners" />
        <link rel="canonical" href="https://wbgen.ru/partners" />
      </Helmet>

      <ServiceHero
        title="Партнёрская программа"
        subtitle="WBGen"
        description="Приглашайте пользователей и получайте 20% с каждой их покупки. Пожизненная комиссия, прозрачная статистика, быстрый вывод."
        breadcrumbs={[{ label: "Партнёрам" }]}
        badge="Зарабатывайте с WBGen"
        stats={[
          { value: "20%", label: "комиссия" },
          { value: "5000₽", label: "мин. вывод" },
          { value: "∞", label: "срок действия" },
        ]}
        ctaText="Стать партнёром"
        ctaLink="/auth"
        heroImage={heroImage}
      />

      <ServiceFeatures title="Условия программы" subtitle="Простые и выгодные условия для партнёров" features={features} />
      <ServiceFAQ items={faqItems} title="Вопросы о партнёрстве" />
      <ServiceCTA title="Готовы зарабатывать?" subtitle="Зарегистрируйтесь и получите реферальную ссылку" ctaText="Стать партнёром" />
    </ServicePageLayout>
  );
};

export default PartnersPage;
