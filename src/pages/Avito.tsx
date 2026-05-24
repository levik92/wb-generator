import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Upload,
  Sparkles,
  Download,
  Zap,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
  Tag,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaseStudyDialog } from "@/components/cases/CaseStudyDialog";
import "@/styles/landing-theme.css";

import chairBefore from "@/assets/avito/chair-before.png";
import chairAfter from "@/assets/avito/chair-after.jpg";
import roomBefore from "@/assets/avito/room-before.png";
import roomAfter from "@/assets/avito/room-after.jpg";
import headphonesBefore from "@/assets/avito/headphones-before.png";
import headphonesAfter from "@/assets/avito/headphones-after.jpg";
import sneakersBefore from "@/assets/avito/sneakers-before.png";
import sneakersAfter from "@/assets/avito/sneakers-after.jpg";

// Avito brand accent
const AVITO = "hsl(78, 68%, 48%)";
const AVITO_LIGHT = "hsl(82, 75%, 58%)";

const stats = [
  { value: "+187%", label: "рост CTR объявления" },
  { value: "3 мин", label: "на одну обложку" },
  { value: "от 49₽", label: "за обложку" },
  { value: "120 000+", label: "обложек создано" },
];

const problems = [
  { icon: Eye, text: "Объявление теряется в ленте — как у всех на белом фоне" },
  { icon: Clock, text: "Photoshop долго учить, дизайнер берёт 1 500–5 000₽ за макет" },
  { icon: Tag, text: "Низкий CTR: платите за показы, но клики не идут" },
  { icon: Layers, text: "Сложно держать единый стиль на десятках объявлений" },
];

const solutions = [
  { icon: CheckCircle2, text: "Готовая обложка под формат Авито за 3 минуты" },
  { icon: CheckCircle2, text: "Цена, скидка, бейджи «Хит» и «В наличии» — автоматически" },
  { icon: CheckCircle2, text: "Единый бренд-стиль для всего магазина" },
  { icon: CheckCircle2, text: "Без дизайнера и Photoshop — нужен только смартфон" },
];

const cases = [
  {
    id: 101,
    before: headphonesBefore,
    after: chairAfter,
    category: "Мебель",
    title: "Офисное кресло",
    conversion: "+239%",
    ordersChange: "3 → 11",
    description: "Светлая обложка с инфографикой подняла CTR в 3.4 раза",
  },
  {
    id: 102,
    before: roomBefore,
    after: roomAfter,
    category: "Недвижимость",
    title: "Аренда студии",
    conversion: "+217%",
    ordersChange: "6 → 19",
    description: "Тёплый свет и студийная подача — уровень Booking",
  },
  {
    id: 103,
    before: chairBefore,
    after: headphonesAfter,
    category: "Электроника",
    title: "Наушники Xiaomi",
    conversion: "+192%",
    ordersChange: "5 → 17",
    description: "Премиальная обложка убрала вопросы «новый или б/у?»",
  },
  {
    id: 104,
    before: sneakersBefore,
    after: sneakersAfter,
    category: "Одежда",
    title: "Женские слипоны",
    conversion: "+184%",
    ordersChange: "4 → 14",
    description: "Студийный мрамор вместо подсобки — возвраты −31%",
  },
];

const steps = [
  { icon: Upload, title: "Загрузите фото", desc: "Просто фото товара со смартфона — без студии и фона" },
  { icon: Sparkles, title: "ИИ создаёт обложку", desc: "Нейросеть собирает дизайн с акцентами, плашками и ценой" },
  { icon: Download, title: "Опубликуйте на Авито", desc: "Скачайте готовый файл и загрузите в объявление за минуту" },
];

const Avito = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollY } = useScroll();

  // Параллакс: салатовый градиент уходит вверх за экран
  const greenY = useTransform(scrollY, [0, 800], [0, -500]);
  const greenOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  // Фиолетовое радиальное пятно — мягкий параллакс вниз
  const purpleY = useTransform(scrollY, [0, 1500], [0, 250]);
  const purpleX = useTransform(scrollY, [0, 1500], [0, -80]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  const goToThanks = () => navigate({ pathname: "/avito/thanks", search: location.search });

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark relative overflow-x-hidden" style={{ isolation: "isolate" }}>
      <div className="noise-overlay" />

      {/* ===== Параллакс-фон =====
          ВАЖНО: на мобильных (iOS Safari) сочетание position:fixed с
          большими blur-фильтрами внутри overflow-x-hidden ломает
          композитор и даёт чёрный экран при скролле. Поэтому фон —
          absolute, привязан к высоте всей страницы, blur уменьшен,
          а на мобильных параллакс отключён. */}
      <div className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden -z-10">
        {/* Салатовый градиент сверху по центру */}
        <motion.div
          style={{ y: greenY, opacity: greenOpacity, willChange: "transform" }}
          className="absolute -top-40 inset-x-0 mx-auto w-[700px] sm:w-[1100px] h-[600px] sm:h-[900px] hidden sm:block"
        >
          <div
            className="w-full h-full rounded-full blur-3xl opacity-40"
            style={{
              background: `radial-gradient(closest-side, ${AVITO_LIGHT} 0%, ${AVITO} 35%, transparent 70%)`,
            }}
          />
        </motion.div>
        {/* Мобильный статичный градиент сверху (без параллакса и без огромных blur) */}
        <div
          className="sm:hidden absolute -top-32 inset-x-0 mx-auto w-[600px] h-[500px] rounded-full blur-2xl opacity-30"
          style={{
            background: `radial-gradient(closest-side, ${AVITO_LIGHT} 0%, ${AVITO} 35%, transparent 70%)`,
          }}
        />

        {/* Фиолетовый радиальный — параллакс только на десктопе */}
        <motion.div
          style={{ y: purpleY, x: purpleX, willChange: "transform" }}
          className="absolute top-[60%] -right-40 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] hidden sm:block"
        >
          <div
            className="w-full h-full rounded-full blur-3xl opacity-50"
            style={{
              background: "radial-gradient(closest-side, hsl(268,83%,45%) 0%, hsl(280,70%,30%) 45%, transparent 75%)",
            }}
          />
        </motion.div>

        {/* Мобильный статичный фиолетовый */}
        <div
          className="sm:hidden absolute top-[55%] -right-32 w-[420px] h-[420px] rounded-full blur-2xl opacity-30"
          style={{
            background: "radial-gradient(closest-side, hsl(268,83%,45%) 0%, hsl(280,70%,30%) 45%, transparent 75%)",
          }}
        />

        {/* Доп. фиолетовое пятно ниже — только десктоп */}
        <motion.div
          style={{ y: useTransform(scrollY, [0, 2000], [0, -300]), willChange: "transform" }}
          className="absolute top-[120%] left-[10%] w-[500px] h-[500px] hidden sm:block"
        >
          <div
            className="w-full h-full rounded-full blur-3xl opacity-30"
            style={{
              background: "radial-gradient(closest-side, hsl(268,83%,40%) 0%, transparent 70%)",
            }}
          />
        </motion.div>
      </div>

      <main className="relative z-10">
        {/* ===== HERO ===== */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-20">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center justify-center gap-3 mb-8">
                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  WB<span className="text-[hsl(268,83%,60%)]">Gen</span>
                </span>
                <span className="text-white/30">×</span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: `${AVITO}22`, color: AVITO_LIGHT, border: `1px solid ${AVITO}44` }}
                >
                  для Авито
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
                Обложки для Авито,{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
                >
                  которые продают
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-xl mx-auto">
                ИИ-сервис создаёт цепляющие обложки для объявлений за 3 минуты — выделитесь в ленте и поднимите CTR без дизайнера
              </p>

              <Button
                onClick={goToThanks}
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-xl hover:opacity-90 transition-opacity text-black border-0"
                style={{ background: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
              >
                Попробовать
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="glass-card rounded-2xl border border-white/5 p-8 sm:p-10 bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{s.value}</div>
                    <div className="text-white/50 text-sm">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PROBLEM / SOLUTION ===== */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-4"
            >
              Почему объявления не приносят клиентов
            </motion.h2>
            <p className="text-center text-white/50 mb-12 max-w-2xl mx-auto">
              Знакомо? Так живут 90% продавцов и интернет-магазинов на Авито.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card rounded-2xl border border-white/5 p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-red-400 mb-5 flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> Как сейчас
                </h3>
                <ul className="space-y-4">
                  {problems.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/60">
                      <p.icon className="w-5 h-5 text-red-400/70 mt-0.5 shrink-0" />
                      <span>{p.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card rounded-2xl border p-6 sm:p-8"
                style={{ borderColor: `${AVITO}33` }}
              >
                <h3
                  className="text-lg font-semibold mb-5 flex items-center gap-2"
                  style={{ color: AVITO_LIGHT }}
                >
                  <CheckCircle2 className="w-5 h-5" /> С WBGen для Авито
                </h3>
                <ul className="space-y-4">
                  {solutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/70">
                      <s.icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: AVITO_LIGHT }} />
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== BEFORE / AFTER — реальные кейсы ===== */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-4"
            >
              Было / Стало на Авито
            </motion.h2>
            <p className="text-center text-white/50 mb-12 max-w-2xl mx-auto">
              4 реальных кейса наших клиентов: рост заявок, CTR и снижение цены клика.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {cases.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col"
                >
                  <div className="grid grid-cols-2 gap-1 bg-black/40 p-1">
                    <div className="relative aspect-square overflow-hidden rounded-l-md bg-black/40">
                      <img src={c.before} alt={`До — ${c.title}`} loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white/80 backdrop-blur-sm">
                        ДО
                      </div>
                    </div>
                    <div className="relative aspect-square overflow-hidden rounded-r-md bg-black/40">
                      <img src={c.after} alt={`После — ${c.title}`} loading="lazy" className="w-full h-full object-cover" />
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-black"
                        style={{ background: AVITO_LIGHT }}
                      >
                        ПОСЛЕ
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
                        {c.category}
                      </span>
                      <span className="text-xl font-bold" style={{ color: AVITO_LIGHT }}>
                        {c.conversion}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{c.title}</h3>
                    <p className="text-sm text-white/50 -mt-1">{c.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40">Заявки/день:</span>
                      <span className="font-semibold text-white">{c.ordersChange}</span>
                    </div>
                    <CaseStudyDialog caseId={c.id}>
                      <button
                        className="w-full text-center text-xs font-medium flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all border mt-1"
                        style={{
                          background: `${AVITO}14`,
                          borderColor: `${AVITO}33`,
                          color: AVITO_LIGHT,
                        }}
                      >
                        Изучить подробнее
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </CaseStudyDialog>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12"
            >
              Как это работает
            </motion.h2>

            <div className="grid sm:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="glass-card rounded-2xl border border-white/5 p-6 text-center"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: `linear-gradient(135deg, ${AVITO}, ${AVITO_LIGHT})` }}
                  >
                    <step.icon className="w-6 h-6 text-black" />
                  </div>
                  <div className="text-xs font-bold text-white/30 mb-2">Шаг {i + 1}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-3xl border p-10 sm:p-14 bg-gradient-to-br from-white/[0.03] to-transparent"
              style={{ borderColor: `${AVITO}33` }}
            >
              <Zap className="w-10 h-10 mx-auto mb-4" style={{ color: AVITO_LIGHT }} />
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Сделайте первую обложку для Авито бесплатно</h2>
              <p className="text-white/50 mb-8">
                Регистрация бесплатна. Дальше — обложки от 49₽ за штуку. Без подписок и обязательств.
              </p>
              <Button
                onClick={goToThanks}
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-xl hover:opacity-90 transition-opacity text-black border-0"
                style={{ background: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
              >
                Зарегистрироваться
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Avito;
