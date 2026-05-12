import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/landing-theme.css";

import beforeAfter1 from "@/assets/example-before-after-1.jpg";
import beforeAfter2 from "@/assets/example-before-after-2.jpg";
import beforeAfter3 from "@/assets/example-before-after-3.jpg";

// Avito brand accent (хорошо узнаваемый зелёный)
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

const beforeAfterPairs = [
  { src: beforeAfter1, label: "Товар для дома" },
  { src: beforeAfter2, label: "Электроника" },
  { src: beforeAfter3, label: "Одежда и аксессуары" },
];

const steps = [
  { icon: Upload, title: "Загрузите фото", desc: "Просто фото товара со смартфона — без студии и фона" },
  { icon: Sparkles, title: "ИИ создаёт обложку", desc: "Нейросеть собирает дизайн с акцентами, плашками и ценой" },
  { icon: Download, title: "Опубликуйте на Авито", desc: "Скачайте готовый файл и загрузите в объявление за минуту" },
];

const Avito = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  const goToThanks = () => {
    navigate("/avito/thanks");
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark">
      <div className="noise-overlay" />

      {/* Ambient glow — авито-зелёный */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-25">
        <div
          className="absolute w-[700px] h-[700px] -top-1/4 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${AVITO} 0%, transparent 70%)` }}
        />
        <div
          className="absolute w-[500px] h-[500px] top-1/2 -right-40 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(268,50%,30%) 0%, transparent 70%)" }}
        />
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
                className="h-14 px-10 text-base font-semibold rounded-xl hover:opacity-90 transition-opacity text-white border-0"
                style={{ background: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
              >
                Попробовать бесплатно
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

        {/* ===== BEFORE / AFTER ===== */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-4"
            >
              Было / Стало
            </motion.h2>
            <p className="text-center text-white/50 mb-12 max-w-2xl mx-auto">
              Слева — обычное фото товара. Справа — обложка, которую WBGen собрал за 3 минуты.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {beforeAfterPairs.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl border border-white/5 overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={p.src}
                      alt={`Было и стало — ${p.label}`}
                      loading="lazy"
                      className="w-full h-auto block"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold bg-black/60 text-white/80 backdrop-blur-sm">
                      Было
                    </div>
                    <div
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold text-black"
                      style={{ background: AVITO_LIGHT }}
                    >
                      Стало
                    </div>
                  </div>
                  <div className="p-4 text-center text-sm text-white/60">{p.label}</div>
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
                className="h-14 px-10 text-base font-semibold rounded-xl hover:opacity-90 transition-opacity text-white border-0"
                style={{ background: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
              >
                <span className="sm:hidden">Зарегистрироваться</span>
                <span className="hidden sm:inline">Зарегистрироваться бесплатно</span>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Avito;
