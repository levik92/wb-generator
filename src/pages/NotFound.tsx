import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Zap } from "lucide-react";
import { motion } from "framer-motion";
import "@/styles/landing-theme.css";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Force dark mode
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#111111";
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[hsl(268,83%,58%)]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/8 rounded-full blur-[120px]" />
      </div>
      <div className="noise-overlay" />

      <div className="text-center space-y-8 max-w-md px-6 relative z-10">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center space-x-3 mb-8"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] shadow-lg shadow-[hsl(268,83%,58%)]/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">
            WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
          </span>
        </motion.div>

        {/* 404 Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
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

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
        >
          <Link to="/">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] hover:from-[hsl(268,83%,50%)] hover:to-[hsl(280,90%,50%)] text-white border-0 px-6 py-5 rounded-xl font-semibold">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()} 
            className="w-full sm:w-auto border-white/15 text-white hover:bg-white/5 px-6 py-5 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
