import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Sparkles, Download, CheckCircle2, XCircle, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CasesShowcase } from "@/components/services/CasesShowcase";
import { QuizDialog } from "@/components/quiz/QuizDialog";
import "@/styles/landing-theme.css";

const stats = [
  { value: "120 000+", label: "карточек создано" },
  { value: "3 мин", label: "на одну карточку" },
  { value: "+200%", label: "рост конверсии" },
  { value: "от 49₽", label: "за карточку" },
];

const problems = [
  { icon: XCircle, text: "Дизайнер берёт 1 500–5 000₽ за карточку" },
  { icon: XCircle, text: "Photoshop долго учить и ещё дольше работать" },
  { icon: XCircle, text: "Фрилансеры — очереди, правки, срывы сроков" },
];

const solutions = [
  { icon: CheckCircle2, text: "Готовая карточка за 3 минуты" },
  { icon: CheckCircle2, text: "Не нужны навыки дизайна" },
  { icon: CheckCircle2, text: "Единый стиль для всего каталога" },
];

const steps = [
  { icon: Upload, title: "Загрузите фото", desc: "Добавьте фото товара и описание — этого достаточно" },
  { icon: Sparkles, title: "ИИ создаёт дизайн", desc: "Нейросеть генерирует продающую карточку с инфографикой" },
  { icon: Download, title: "Скачайте и разместите", desc: "Готовый результат сразу подходит для Wildberries, Ozon и Avito" },
];

const reviews = [
  { name: "Анна, селлер WB", text: "За месяц увеличили выручку на 47%. Дизайнера уволили." },
  { name: "Игорь, менеджер", text: "Веду 12 кабинетов — раньше дизайн был узким горлом, теперь делаю всё сам." },
  { name: "Мария, дизайнер", text: "Беру в 3 раза больше заказов — рутина на ИИ, креатив на мне." },
];

const Quiz = () => {
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  const openQuiz = () => setQuizOpen(true);

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark">
      <div className="noise-overlay" />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-25">
        <div
          className="absolute w-[700px] h-[700px] -top-1/4 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(268,50%,30%) 0%, transparent 70%)" }}
        />
      </div>

      <main className="relative z-10">
        {/* HERO */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-20">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-block text-2xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                WB<span className="text-[hsl(268,83%,60%)]">Gen</span>
              </span>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-gradient-to-r from-[hsl(268,83%,58%)]/15 to-[hsl(290,83%,58%)]/15 border border-[hsl(268,83%,58%)]/25 text-[hsl(268,83%,75%)] text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Персональный подбор за 60 секунд
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
                Подберём решение{" "}
                <span className="bg-gradient-to-r from-[hsl(268,83%,72%)] to-[hsl(290,83%,75%)] bg-clip-text text-transparent">
                  под вашу задачу
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-xl mx-auto">
                Ответьте на 2 вопроса — покажем, как WBGen закроет именно ваши задачи. Займёт меньше минуты.
              </p>

              <Button
                onClick={openQuiz}
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 transition-opacity text-white border-0 shadow-lg shadow-[hsl(268,83%,40%)]/40"
              >
                Хочу попробовать
              </Button>
              <p className="text-xs text-white/30 mt-4">Бесплатно · без карты · 30 секунд</p>
            </motion.div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="glass-card rounded-2xl border border-white/10 p-8 sm:p-10 bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="text-center"
                  >
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">{s.value}</div>
                    <div className="text-white/50 text-sm">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12"
            >
              Забудьте о проблемах с дизайном
            </motion.h2>

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
                className="glass-card rounded-2xl border border-white/5 p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-emerald-400 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> С WBGen
                </h3>
                <ul className="space-y-4">
                  {solutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/60">
                      <s.icon className="w-5 h-5 text-emerald-400/70 mt-0.5 shrink-0" />
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CASES */}
        <CasesShowcase title="Реальные результаты клиентов" subtitle="До и после — карточки, созданные с WBGen" />

        {/* HOW IT WORKS */}
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
                  transition={{ delay: i * 0.08 }}
                  className="group relative"
                >
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[hsl(268,83%,60%)]/30 to-[hsl(290,83%,60%)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
                  <div className="relative glass-card rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors p-6 text-center h-full">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(268,83%,58%)] to-[hsl(280,83%,52%)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(268,83%,40%)]/30 group-hover:shadow-[hsl(268,83%,60%)]/50 transition-shadow">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs font-bold text-white/30 mb-2">Шаг {i + 1}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/50">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12"
            >
              Что говорят клиенты
            </motion.h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {reviews.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="group relative"
                >
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[hsl(268,83%,60%)]/25 to-[hsl(290,83%,60%)]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
                  <div className="relative glass-card rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors p-6 h-full">
                    <div className="flex gap-0.5 mb-3 text-[hsl(268,83%,72%)]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-white/70 text-sm mb-4 leading-relaxed">«{r.text}»</p>
                    <div className="text-xs text-white/40">{r.name}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-3xl border border-white/10 p-10 sm:p-14 bg-gradient-to-br from-[hsl(268,50%,15%)/30] to-transparent"
            >
              <Zap className="w-10 h-10 text-[hsl(268,83%,60%)] mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Узнайте, подходит ли WBGen вам</h2>
              <p className="text-white/50 mb-8">
                2 вопроса и короткое видео — поймёте, закроете ли вы свои задачи с нашим сервисом.
              </p>
              <Button
                onClick={openQuiz}
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 transition-opacity text-white border-0 shadow-lg shadow-[hsl(268,83%,40%)]/40"
              >
                Хочу попробовать
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <QuizDialog open={quizOpen} onOpenChange={setQuizOpen} />
    </div>
  );
};

export default Quiz;
