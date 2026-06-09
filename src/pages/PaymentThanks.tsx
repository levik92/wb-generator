import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/landing-theme.css";

const PaymentThanks = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [countdown, setCountdown] = useState(4);

  const amount = Number(params.get("amount") || 0);
  const tokens = Number(params.get("tokens") || 0);

  // Fire conversion goals once on mount
  useEffect(() => {
    try {
      // Facebook Pixel — Purchase goal
      // @ts-ignore
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        // @ts-ignore
        window.fbq("track", "Purchase", {
          value: amount || 0,
          currency: "RUB",
        });
      }
      // Yandex Metrika — payment success goal
      // @ts-ignore
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
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);

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

    return () => {
      clearInterval(interval);
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, [navigate]);

  const goNow = () => navigate("/dashboard?payment=success", { replace: true });

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark flex items-center justify-center px-4">
      <div className="noise-overlay" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div
          className="absolute w-[700px] h-[700px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(268,50%,30%) 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.15, stiffness: 200, damping: 14 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(268,83%,55%), hsl(280,70%,50%))",
            boxShadow: "0 16px 40px -12px hsl(268,83%,55%)",
          }}
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
          Спасибо за оплату!
        </h1>
        <p className="text-white/55 text-base sm:text-lg mb-2 leading-relaxed">
          Платёж прошёл успешно.
        </p>
        {tokens > 0 && (
          <p className="text-white/70 text-sm mb-6 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Начислено {tokens.toLocaleString("ru-RU")} токенов
          </p>
        )}

        <div className="mt-6">
          <Button
            onClick={goNow}
            size="lg"
            className="w-full h-12 rounded-xl text-base font-semibold text-white border-0"
            style={{
              background: "linear-gradient(90deg, hsl(268,83%,55%), hsl(280,70%,50%))",
              boxShadow: "0 10px 30px -10px hsl(268,83%,55%)",
            }}
          >
            Перейти в кабинет
          </Button>
          <p className="text-white/40 text-xs mt-4">
            Автоматический переход через {countdown} сек.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentThanks;
