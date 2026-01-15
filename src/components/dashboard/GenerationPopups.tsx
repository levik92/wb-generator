import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, Smartphone, Download, Share, PlusSquare } from "lucide-react";
import { motion } from "framer-motion";

interface GenerationPopupsProps {
  userId: string;
  generationCount: number;
  onNavigateToLearning: () => void;
}

// Storage keys
const WELCOME_POPUP_KEY = "welcome_cases_popup_shown";
const FIRST_GEN_POPUP_KEY = "first_generation_learning_shown";
const PWA_POPUP_KEY = "pwa_install_popup_count";

export const GenerationPopups = ({
  userId,
  generationCount,
  onNavigateToLearning
}: GenerationPopupsProps) => {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showLearningPopup, setShowLearningPopup] = useState(false);
  const [showPwaPopup, setShowPwaPopup] = useState(false);
  const [previousGenerationCount, setPreviousGenerationCount] = useState<number | null>(null);

  // Check for welcome popup on mount
  useEffect(() => {
    const welcomeShown = localStorage.getItem(`${WELCOME_POPUP_KEY}_${userId}`);
    if (!welcomeShown) {
      // Delay to allow page to load
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  // Track generation count changes
  useEffect(() => {
    if (previousGenerationCount === null) {
      setPreviousGenerationCount(generationCount);
      return;
    }

    // Only trigger when generation count increases
    if (generationCount > previousGenerationCount) {
      checkGenerationPopups(generationCount);
      setPreviousGenerationCount(generationCount);
    }
  }, [generationCount, previousGenerationCount, userId]);

  const checkGenerationPopups = (count: number) => {
    // After first generation - show learning popup
    if (count === 1) {
      const learningShown = localStorage.getItem(`${FIRST_GEN_POPUP_KEY}_${userId}`);
      if (!learningShown) {
        setTimeout(() => setShowLearningPopup(true), 2000);
      }
    }

    // After 5 or 15 generations - show PWA popup
    if (count === 5 || count === 15) {
      const pwaShowCount = parseInt(localStorage.getItem(`${PWA_POPUP_KEY}_${userId}`) || "0");
      if (pwaShowCount < 2) {
        setTimeout(() => setShowPwaPopup(true), 2000);
      }
    }
  };

  const handleWelcomeClose = () => {
    localStorage.setItem(`${WELCOME_POPUP_KEY}_${userId}`, "true");
    setShowWelcomePopup(false);
  };

  const handleWelcomeViewCases = () => {
    localStorage.setItem(`${WELCOME_POPUP_KEY}_${userId}`, "true");
    window.open("/cases", "_blank");
    setShowWelcomePopup(false);
  };

  const handleLearningClose = () => {
    localStorage.setItem(`${FIRST_GEN_POPUP_KEY}_${userId}`, "true");
    setShowLearningPopup(false);
  };

  const handleLearningOpenChange = (open: boolean) => {
    if (!open) {
      handleLearningClose();
    }
  };

  const handleLearningNavigate = () => {
    localStorage.setItem(`${FIRST_GEN_POPUP_KEY}_${userId}`, "true");
    onNavigateToLearning();
    setShowLearningPopup(false);
  };

  const handlePwaClose = () => {
    const currentCount = parseInt(localStorage.getItem(`${PWA_POPUP_KEY}_${userId}`) || "0");
    localStorage.setItem(`${PWA_POPUP_KEY}_${userId}`, String(currentCount + 1));
    setShowPwaPopup(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <>
      {/* Welcome popup - View cases before paying */}
      <Dialog open={showWelcomePopup} onOpenChange={(open) => { if (!open) handleWelcomeClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ExternalLink className="w-8 h-8 text-primary" />
              </motion.div>
            </div>
            <DialogTitle className="text-center text-xl">
              Перед оплатой — посмотрите результаты
            </DialogTitle>
            <DialogDescription className="text-center">
              Узнайте, какие карточки создают другие селлеры в нашем сервисе. 
              Это поможет вам понять возможности генерации и принять решение.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleWelcomeClose} className="w-full sm:w-auto">
              Позже
            </Button>
            <Button onClick={handleWelcomeViewCases} className="w-full sm:w-auto">
              Смотреть примеры
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Learning popup - After first generation */}
      <Dialog open={showLearningPopup} onOpenChange={handleLearningOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </motion.div>
            </div>
            <DialogTitle className="text-center text-xl">
              🎉 Поздравляем с первой генерацией!
            </DialogTitle>
            <DialogDescription className="text-center">
              Хотите делать карточки ещё лучше? Посмотрите обучающие материалы в базе знаний — 
              там мы рассказываем, как получить максимум от генераций.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLearningClose} className="w-full sm:w-auto">
              Напомнить позже
            </Button>
            <Button onClick={handleLearningNavigate} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
              Перейти к обучению
              <BookOpen className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PWA Install popup - After 5 and 15 generations */}
      <Dialog open={showPwaPopup} onOpenChange={setShowPwaPopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Smartphone className="w-8 h-8 text-blue-500" />
              </motion.div>
            </div>
            <DialogTitle className="text-center text-xl">
              Добавьте приложение на рабочий стол
            </DialogTitle>
            <DialogDescription className="text-center">
              Быстрый доступ к генерациям прямо с главного экрана — как настоящее приложение!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isIOS ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Share className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">1. Нажмите «Поделиться»</p>
                    <p className="text-xs text-muted-foreground">Кнопка внизу экрана в Safari</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <PlusSquare className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">2. Выберите «На экран Домой»</p>
                    <p className="text-xs text-muted-foreground">Прокрутите вниз в меню</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">3. Нажмите «Добавить»</p>
                    <p className="text-xs text-muted-foreground">Иконка появится на рабочем столе</p>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">⋮</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">1. Откройте меню браузера</p>
                    <p className="text-xs text-muted-foreground">Три точки в правом верхнем углу Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <PlusSquare className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">2. Нажмите «Добавить на главный экран»</p>
                    <p className="text-xs text-muted-foreground">Или «Установить приложение»</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">3. Подтвердите установку</p>
                    <p className="text-xs text-muted-foreground">Приложение появится на рабочем столе</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Установите приложение</p>
                    <p className="text-xs text-muted-foreground">
                      В адресной строке браузера найдите значок установки или откройте меню и выберите «Установить»
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handlePwaClose} className="w-full">
              Понятно, закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
