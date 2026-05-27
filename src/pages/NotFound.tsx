import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";
import { ServicePageLayout } from "@/components/services";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <ServicePageLayout>
      <section className="min-h-[calc(100vh-200px)] flex items-center justify-center relative overflow-hidden py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[hsl(268,83%,58%)]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/8 rounded-full blur-[120px]" />
        </div>

        <div className="text-center space-y-8 max-w-md px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-7xl sm:text-8xl font-bold bg-gradient-to-r from-[hsl(268,83%,65%)] to-[hsl(280,90%,70%)] bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Страница не найдена</h2>
            <p className="text-white/50 text-sm sm:text-base">
              Запрашиваемая страница не существует или была перемещена.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
          >
            <Link to="/">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] hover:brightness-110 text-white border-0 px-6 py-5 rounded-xl font-semibold shadow-lg shadow-[hsl(263,90%,40%)]/30">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/25 transition-all px-6 py-5 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </motion.div>
        </div>
      </section>
    </ServicePageLayout>
  );
};

export default NotFound;
