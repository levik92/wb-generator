import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, ArrowRight, Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentThanks = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [paused, setPaused] = useState(false);

  const amount = Number(params.get("amount") || 0);
  const tokens = Number(params.get("tokens") || 0);

  // Fire conversion goals once on mount
  useEffect(() => {
    try {
      // @ts-ignore — Facebook Pixel "Purchase"
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        // @ts-ignore
        window.fbq("track", "Purchase", { value: amount || 0, currency: "RUB" });
      }
      // @ts-ignore — Yandex Metrika goal
      if (typeof window !== "undefined" && typeof window.ym === "function") {
        // @ts-ignore
        window.ym(105111303, "reachGoal", "payment_success", {
          order_price: amount || 0,
          currency: "RUB",
        });
      }
    } catch (e) {
      console.warn("[PaymentThanks] tracking error", e);
    }
  }, [amount]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/dashboard?payment=success", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate, paused]);

  const goNow = () => navigate("/dashboard?payment=success", { replace: true });
  const progress = ((5 - countdown) / 5) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, hsl(268 83% 60% / 0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, hsl(280 75% 60% / 0.14) 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-border/60 bg-card shadow-xl shadow-violet-500/[0.06] p-6 sm:p-8">
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15, stiffness: 220, damping: 16 }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30"
          >
            <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10 text-white" strokeWidth={2.4} />
          </motion.div>

          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              Оплата прошла
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight mb-2">
              Спасибо за оплату!
            </h1>
            <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
              Платёж успешно обработан. Сейчас откроем ваш кабинет.
            </p>
          </div>

          {/* Summary */}
          {(tokens > 0 || amount > 0) && (
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {tokens > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex flex-col items-start">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    Начислено
                  </div>
                  <div className="font-semibold tabular-nums text-base sm:text-lg bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {tokens.toLocaleString("ru-RU")}
                    <span className="text-xs text-muted-foreground font-normal ml-1">токенов</span>
                  </div>
                </div>
              )}
              {amount > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex flex-col items-start">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <Receipt className="w-3 h-3 text-violet-500" />
                    Сумма
                  </div>
                  <div className="font-semibold tabular-nums text-base sm:text-lg text-foreground">
                    {amount.toLocaleString("ru-RU")}
                    <span className="text-xs text-muted-foreground font-normal ml-1">₽</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={goNow}
            size="lg"
            className="mt-6 w-full h-12 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-md shadow-violet-500/25 group"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Перейти в кабинет
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Button>

          {/* Countdown */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Автопереход через {countdown} сек.</span>
              <button
                onClick={() => setPaused((p) => !p)}
                className="text-violet-600 dark:text-violet-300 hover:underline underline-offset-2"
              >
                {paused ? "Возобновить" : "Остановить"}
              </button>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/80 mt-4 px-4">
          Чек об оплате отправим на ваш e-mail. Если что-то пойдёт не так — напишите в поддержку.
        </p>
      </motion.div>
    </div>
  );
};

export default PaymentThanks;
