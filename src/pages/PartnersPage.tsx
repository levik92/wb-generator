import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceFAQ, ServiceCTA, BenefitsSection, StepsSection } from "@/components/services";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Percent, Wallet, TrendingUp, Gift, Shield, ArrowRight, CheckCircle, Copy, Share2, CreditCard, BarChart3, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import partnerImage from "@/assets/partner-person.png";
const steps = [{
  number: "01",
  title: "Зарегистрируйтесь",
  description: "Создайте аккаунт в WBGen бесплатно. Это займёт 30 секунд",
  icon: Users
}, {
  number: "02",
  title: "Получите ссылку",
  description: "В разделе «Партнёрам» скопируйте вашу уникальную реферальную ссылку",
  icon: Copy
}, {
  number: "03",
  title: "Делитесь с аудиторией",
  description: "Рассказывайте о WBGen в соцсетях, блоге, на YouTube или лично друзьям",
  icon: Share2
}, {
  number: "04",
  title: "Получайте 20%",
  description: "С каждой покупки приглашённых пользователей — навсегда",
  icon: Wallet
}];
const benefits = [{
  title: "20% комиссии пожизненно",
  description: "Получайте 20% с каждой покупки токенов пользователями, которых вы привели. Не разово, а с каждой их покупки навсегда."
}, {
  title: "Вывод от 5000₽",
  description: "Выводите заработанные средства на карту любого российского банка. Обработка заявки — до 3 рабочих дней."
}, {
  title: "Прозрачная статистика",
  description: "В личном кабинете видите количество рефералов, их покупки и ваш доход в реальном времени."
}, {
  title: "Бонусы для рефералов",
  description: "Приглашённые пользователи получают дополнительные токены. Это повышает конверсию вашей ссылки."
}, {
  title: "Без ограничений",
  description: "Приглашайте сколько угодно пользователей. Никаких лимитов на количество рефералов или заработок."
}];
const faqItems = [{
  question: "Как стать партнёром WBGen?",
  answer: "Зарегистрируйтесь в WBGen и перейдите в раздел «Партнёрам» в личном кабинете. Там вы сразу получите уникальную реферальную ссылку. Никаких анкет и одобрений — начните зарабатывать моментально."
}, {
  question: "Какой процент комиссии я получу?",
  answer: "Вы получаете 20% от каждой покупки токенов пользователями, которых пригласили по вашей ссылке. Например, если реферал купит пакет за 1000₽, вы заработаете 200₽."
}, {
  question: "Как вывести заработанные деньги?",
  answer: "В личном кабинете партнёра нажмите «Вывести средства», укажите реквизиты банковской карты. Минимальная сумма вывода — 5000₽. Обработка заявки занимает до 3 рабочих дней."
}, {
  question: "Как долго действует реферальная связь?",
  answer: "Пожизненно. Вы получаете комиссию со всех покупок приглашённого пользователя, пока он пользуется сервисом. Это не разовая выплата, а постоянный пассивный доход."
}, {
  question: "Где можно продвигать реферальную ссылку?",
  answer: "Везде! Социальные сети (Telegram, VK, YouTube), блоги, форумы селлеров, личные рекомендации коллегам. Единственное ограничение — не используйте спам и вводящую в заблуждение рекламу."
}, {
  question: "Получают ли рефералы какие-то бонусы?",
  answer: "Да, пользователи, зарегистрировавшиеся по реферальной ссылке, получают дополнительные бонусные токены. Это делает ваше предложение ещё привлекательнее."
}];

// Income calculator examples
const incomeExamples = [{
  referrals: 10,
  avgPurchase: 1000,
  monthly: "2 000₽"
}, {
  referrals: 50,
  avgPurchase: 1500,
  monthly: "15 000₽"
}, {
  referrals: 100,
  avgPurchase: 2000,
  monthly: "40 000₽"
}, {
  referrals: 500,
  avgPurchase: 2000,
  monthly: "200 000₽"
}];
const PartnersPage = () => {
  return <ServicePageLayout>
      <Helmet>
        <title>Партнёрская программа WBGen — зарабатывайте 20% с каждой покупки</title>
        <meta name="description" content="Партнёрская программа WBGen: 20% комиссии с каждой покупки приглашённых пользователей. Пожизненная выплата, вывод от 5000₽ на карту." />
        <meta property="og:title" content="Партнёрская программа WBGen — 20% пожизненно" />
        <meta property="og:url" content="https://wbgen.ru/partners" />
        <link rel="canonical" href="https://wbgen.ru/partners" />
      </Helmet>

      {/* Hero Section with Partner Image */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,50%,8%)] via-[hsl(260,40%,6%)] to-[hsl(240,30%,4%)]" />
        <div className="absolute w-[1200px] h-[1200px] -top-1/2 -left-1/4 rounded-full opacity-[0.06]" style={{
        background: 'radial-gradient(circle, hsl(268, 70%, 50%) 0%, transparent 60%)'
      }} />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            {/* Left Content */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8
          }} className="max-w-xl pb-[60px]">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 mb-8">
                💰 Зарабатывайте с WBGen
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1]">
                Партнёрская
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                  программа
                </span>
              </h1>

              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                Приглашайте пользователей в WBGen и получайте <span className="text-emerald-400 font-semibold">20% с каждой их покупки</span>. 
                Пожизненно. Без лимитов. С прозрачной статистикой.
              </p>

              {/* Stats */}
              <div className="flex gap-8 mb-10">
                <div>
                  <div className="text-3xl font-bold text-white">20%</div>
                  <div className="text-sm text-white/50">комиссия</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">∞</div>
                  <div className="text-sm text-white/50">срок действия</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">5000₽</div>
                  <div className="text-sm text-white/50">мин. вывод</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 px-8 py-6 text-lg font-semibold">
                    Стать партнёром
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/partnerstvo">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/15 text-white hover:bg-white/5 px-8 py-6 text-lg">
                    Условия соглашения
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right - Partner Image */}
            <motion.div initial={{
            opacity: 0,
            x: 50
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.8,
            delay: 0.3
          }} className="hidden lg:flex justify-end items-end relative">
              <div className="relative">
                {/* Glow behind */}
                <div className="absolute -inset-8 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-full blur-3xl" />
                
                {/* Partner image - anchored to bottom */}
                <img src={partnerImage} alt="Партнёр WBGen" className="relative z-10 max-h-[500px] w-auto object-contain object-bottom" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Income Calculator Section */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-[hsl(268,83%,55%)]/10 text-[hsl(268,83%,65%)] text-sm font-medium mb-4">
              Калькулятор дохода
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Сколько можно заработать
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Примерный расчёт дохода в зависимости от количества рефералов
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {incomeExamples.map((example, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} className="glass-card rounded-2xl p-6 text-center border border-white/5 hover:border-emerald-500/30 transition-all">
                <div className="text-4xl font-bold text-white mb-2">{example.referrals}</div>
                <div className="text-white/50 text-sm mb-4">рефералов</div>
                <div className="text-2xl font-bold text-emerald-400">{example.monthly}</div>
                <div className="text-white/40 text-xs mt-1">в месяц*</div>
              </motion.div>)}
          </div>
          <p className="text-center text-white/30 text-xs mt-6">
            *При средней покупке токенов {incomeExamples[0].avgPurchase}₽/мес на пользователя
          </p>
        </div>
      </section>

      {/* How It Works */}
      <StepsSection title="Как это работает" subtitle="4 простых шага к пассивному доходу" steps={steps} />

      {/* Features Grid */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Почему партнёры выбирают WBGen
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Честные условия и реальный доход
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[{
            icon: Percent,
            title: "20% комиссии",
            desc: "Одна из самых высоких ставок на рынке",
            color: "from-emerald-500 to-green-600"
          }, {
            icon: TrendingUp,
            title: "Пожизненная выплата",
            desc: "Получайте со всех покупок реферала навсегда",
            color: "from-blue-500 to-cyan-600"
          }, {
            icon: BarChart3,
            title: "Прозрачная аналитика",
            desc: "Детальная статистика в личном кабинете",
            color: "from-purple-500 to-violet-600"
          }, {
            icon: CreditCard,
            title: "Быстрый вывод",
            desc: "На карту любого банка от 5000₽",
            color: "from-pink-500 to-rose-600"
          }, {
            icon: Zap,
            title: "Мгновенный старт",
            desc: "Ссылка готова сразу после регистрации",
            color: "from-amber-500 to-orange-600"
          }, {
            icon: Heart,
            title: "Поддержка партнёров",
            desc: "Помогаем промо-материалами и советами",
            color: "from-red-500 to-rose-600"
          }].map((feature, index) => <motion.div key={feature.title} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} className="glass-card rounded-2xl p-6 border border-white/5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.desc}</p>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <BenefitsSection title="Преимущества партнёрства" subtitle="Что вы получаете, став партнёром WBGen" benefits={benefits} />

      {/* Who Is It For */}
      <section className="py-16 sm:py-24 border-t border-white/10 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Кому подойдёт партнёрство
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[{
            emoji: "📹",
            title: "Блогеры",
            desc: "YouTube, Telegram, VK — делитесь с аудиторией"
          }, {
            emoji: "🛒",
            title: "Селлеры WB",
            desc: "Рекомендуйте коллегам из сообществ"
          }, {
            emoji: "📚",
            title: "Авторы курсов",
            desc: "Добавьте в программу обучения"
          }, {
            emoji: "💼",
            title: "Агентства",
            desc: "Предлагайте клиентам как инструмент"
          }].map((item, index) => <motion.div key={item.title} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} className="glass-card rounded-2xl p-6 text-center border border-white/5">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </motion.div>)}
          </div>
        </div>
      </section>

      <ServiceFAQ items={faqItems} title="Вопросы о партнёрстве" />
      
      <ServiceCTA title="Начните зарабатывать сегодня" subtitle="Регистрация бесплатна. Ссылка готова моментально. 20% — ваши навсегда." ctaText="Стать партнёром" />
    </ServicePageLayout>;
};
export default PartnersPage;