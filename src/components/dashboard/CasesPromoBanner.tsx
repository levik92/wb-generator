import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Coins, Sparkles, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
interface CasesPromoBannerProps {
  userId: string;
  onNavigateToBalance: () => void;
}
const BANNER_DISMISSED_KEY = "cases_promo_banner_dismissed";
export const CasesPromoBanner = ({
  userId,
  onNavigateToBalance
}: CasesPromoBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        // Check localStorage first
        const localDismissed = localStorage.getItem(`${BANNER_DISMISSED_KEY}_${userId}`);
        if (localDismissed === "true") {
          setIsVisible(false);
          setIsLoading(false);
          return;
        }
        setIsVisible(true);
      } catch (error) {
        console.error("Error checking banner status:", error);
        setIsVisible(true);
      }
      setIsLoading(false);
    };
    checkDismissed();
  }, [userId]);
  const handleDismiss = () => {
    localStorage.setItem(`${BANNER_DISMISSED_KEY}_${userId}`, "true");
    setIsVisible(false);
  };
  const handleViewCases = () => {
    window.open("/cases", "_blank");
  };
  if (isLoading || !isVisible) return null;
  return <AnimatePresence>
      <motion.div initial={{
      opacity: 0,
      y: -20,
      scale: 0.95
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} exit={{
      opacity: 0,
      y: -20,
      scale: 0.95
    }} transition={{
      duration: 0.4,
      ease: "easeOut"
    }} className="relative overflow-hidden rounded-2xl">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 animate-gradient-x" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        
        {/* Floating lightning bolts animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Zap className="absolute top-3 left-[8%] w-4 h-4 text-white/25 animate-float-slow" />
          <Zap className="absolute top-6 left-[28%] w-5 h-5 text-white/20 animate-float-medium rotate-12" />
          <Zap className="absolute top-4 right-[22%] w-4 h-4 text-white/30 animate-float-fast -rotate-12" />
          <Zap className="absolute bottom-3 left-[18%] w-3 h-3 text-white/20 animate-float-medium rotate-6" />
          <Zap className="absolute bottom-5 right-[12%] w-5 h-5 text-white/15 animate-float-slow -rotate-6" />
          <Zap className="absolute top-1/2 left-[50%] w-3 h-3 text-white/15 animate-float-fast rotate-45" />
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

        <div className="relative p-4 sm:p-6">
          {/* Close button */}
          <button onClick={handleDismiss} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white z-10" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 pr-8">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Посмотрите, какие карточки создают в WBGen   
              </h3>
              <p className="text-sm text-white/80 line-clamp-2">
                Узнайте, как другие оформляют товары и увеличивают продажи с помощью наших генераций!
              </p>
            </div>

            {/* Buttons - vertical on desktop for more text space, under content on tablet/mobile */}
            <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-shrink-0">
              <Button onClick={handleViewCases} className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg">
                <Eye className="w-4 h-4 mr-2" />
                Посмотреть
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button variant="outline" onClick={onNavigateToBalance} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Coins className="w-4 h-4 mr-2" />
                Пополнить баланс
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>;
};