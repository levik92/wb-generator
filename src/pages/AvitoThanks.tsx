import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/landing-theme.css";

const AVITO = "hsl(78, 68%, 48%)";
const AVITO_LIGHT = "hsl(82, 75%, 58%)";

const AvitoThanks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);

  // Preserve UTM params into the auth screen so Я.Метрика keeps attribution.
  const authTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("tab", "register");
    return `/auth?${params.toString()}`;
  }, [location.search]);

  const goToAuth = () => {
    navigate(authTarget);
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    window.scrollTo(0, 0);

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

    return () => {
      clearInterval(interval);
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, [navigate, authTarget]);

  return (
    <div className="min-h-screen bg-[#111111] text-white landing-dark flex items-center justify-center">
      <div className="noise-overlay" />

      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-25">
        <div
          className="absolute w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${AVITO} 0%, transparent 70%)` }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center px-6 max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ background: `linear-gradient(135deg, ${AVITO}, ${AVITO_LIGHT})` }}
        >
          <CheckCircle2 className="w-10 h-10 text-black" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Спасибо, что доверились нам!</h1>
        <p className="text-white/50 text-lg mb-8">
          Сейчас мы переведём вас на страницу регистрации...
        </p>

        <Button
          onClick={goToAuth}
          size="lg"
          className="h-12 px-8 rounded-xl hover:opacity-90 transition-opacity text-white border-0 font-semibold"
          style={{ background: `linear-gradient(90deg, ${AVITO}, ${AVITO_LIGHT})` }}
        >
          Перейти сейчас
        </Button>

        <p className="text-white/30 text-sm mt-6">Автоматический переход через {countdown} сек.</p>
      </motion.div>
    </div>
  );
};

export default AvitoThanks;
