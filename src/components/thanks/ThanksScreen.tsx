import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  CreditCard,
  BookOpen,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/landing-theme.css";

export type ThanksAccent = "violet" | "avito";

const ACCENTS: Record<ThanksAccent, { glowFrom: string; from: string; to: string; iconText: string }> = {
  violet: {
    glowFrom: "hsl(268,50%,30%)",
    from: "hsl(268,83%,55%)",
    to: "hsl(280,70%,50%)",
    iconText: "text-white",
  },
  avito: {
    glowFrom: "hsl(78,68%,40%)",
    from: "hsl(78,68%,48%)",
    to: "hsl(82,75%,58%)",
    iconText: "text-black",
  },
};

interface NextStep {
  to: string;
  label: string;
  desc: string;
  icon: typeof ImageIcon;
  external?: boolean;
}

const DEFAULT_NEXT_STEPS: NextStep[] = [
  {
    to: "/cases",
    label: "Посмотреть примеры",
    desc: "Реальные кейсы селлеров",
    icon: ImageIcon,
  },
  {
    to: "/pricing",
    label: "Тарифы и пакеты",
    desc: "Выберите подходящий объём",
    icon: CreditCard,
  },
  {
    to: "/baza-znaniy",
    label: "База знаний",
    desc: "Гайды и инструкции",
    icon: BookOpen,
  },
];

interface ThanksScreenProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  /** Auto-redirect countdown in seconds. Pass 0 to disable. */
  countdownSeconds?: number;
  accent?: ThanksAccent;
  nextSteps?: NextStep[];
  /** Optional analytics hook called once on mount. */
  onMountTrack?: () => void;
}

export const ThanksScreen = ({
  title = "Спасибо, что доверились нам!",
  subtitle = "Сейчас переведём вас на страницу регистрации — займёт меньше минуты.",
  primaryLabel = "Перейти к регистрации",
  countdownSeconds = 15,
  accent = "violet",
  nextSteps = DEFAULT_NEXT_STEPS,
  onMountTrack,
}: ThanksScreenProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [paused, setPaused] = useState(false);

  const a = ACCENTS[accent];

  // Preserve UTM params into the auth screen so Я.Метрика keeps attribution.
  const authTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("tab", "register");
    return `/auth?${params.toString()}`;
  }, [location.search]);

  const goToAuth = () => navigate(authTarget);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);
    onMountTrack?.();
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdownSeconds <= 0 || paused) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(authTarget);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate, authTarget, countdownSeconds, paused]);

  const progress = countdownSeconds > 0 ? ((countdownSeconds - countdown) / countdownSeconds) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark flex items-center justify-center py-10 px-4">
      <div className="noise-overlay" />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div
          className="absolute w-[700px] h-[700px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${a.glowFrom} 0%, transparent 70%)` }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-7 sm:p-10 shadow-2xl shadow-black/40">
          {/* Check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15, stiffness: 200, damping: 14 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
              boxShadow: `0 16px 40px -12px ${a.from}`,
            }}
          >
            <CheckCircle2 className={`w-8 h-8 sm:w-10 sm:h-10 ${a.iconText}`} />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight">{title}</h1>
          <p className="text-white/55 text-center text-base sm:text-lg mb-7 max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>

          {/* Primary CTA */}
          <Button
            onClick={goToAuth}
            size="lg"
            className="w-full h-13 sm:h-14 rounded-xl text-base font-semibold text-white border-0 group transition-all"
            style={{
              background: `linear-gradient(90deg, ${a.from}, ${a.to})`,
              boxShadow: `0 10px 30px -10px ${a.from}`,
            }}
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>

          {/* Countdown / pause */}
          {countdownSeconds > 0 && countdown > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Автопереход через {countdown} сек.</span>
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="text-white/50 hover:text-white/80 transition-colors underline-offset-2 hover:underline"
                >
                  {paused ? "Возобновить" : "Остановить"}
                </button>
              </div>
              <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ background: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Next steps */}
        <div className="mt-8">
          <p className="text-center text-xs uppercase tracking-[0.18em] text-white/35 mb-4">
            <Sparkles className="w-3 h-3 inline mr-1.5 -mt-0.5" />
            Что дальше
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {nextSteps.map((step) => {
              const Icon = step.icon;
              const Comp: any = step.external ? "a" : Link;
              const props: any = step.external
                ? { href: step.to, target: "_blank", rel: "noopener" }
                : { to: step.to };
              return (
                <Comp
                  key={step.to}
                  {...props}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all p-4 flex flex-col text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center mb-3 group-hover:border-white/25 transition-colors">
                    <Icon className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-white mb-0.5">{step.label}</span>
                  <span className="text-xs text-white/45 leading-snug">{step.desc}</span>
                </Comp>
              );
            })}
          </div>

          <div className="mt-5 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Вернуться на главную
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ThanksScreen;
