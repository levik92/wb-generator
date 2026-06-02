import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Smartphone, Download, Share, PlusSquare } from "lucide-react";
import { motion } from "framer-motion";

interface GenerationPopupsProps {
  userId: string;
  generationCount: number;
  onNavigateToLearning: () => void;
}

// Storage keys
const FIRST_GEN_POPUP_KEY = "first_generation_learning_shown";
const PWA_POPUP_KEY = "pwa_install_popup_count";

export const GenerationPopups = ({
  userId,
  generationCount,
  onNavigateToLearning
}: GenerationPopupsProps) => {
  const [showLearningPopup, setShowLearningPopup] = useState(false);
  const [showPwaPopup, setShowPwaPopup] = useState(false);
  const [previousGenerationCount, setPreviousGenerationCount] = useState<number | null>(null);

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
      {/* Learning popup - After first generation */}
      <ResponsiveDialog open={showLearningPopup} onOpenChange={handleLearningOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </motion.div>
            </div>
            <ResponsiveDialogTitle className="text-center text-xl">
              🎉 Поздравляем с первой генерацией!
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-center">
              Хотите делать карточки ещё лучше? Посмотрите обучающие материалы в базе знаний — 
              там мы рассказываем, как получить максимум от генераций.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLearningClose} className="w-full sm:w-auto">
              Напомнить позже
            </Button>
            <Button onClick={handleLearningNavigate} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
              Перейти к обучению
              <BookOpen className="w-4 h-4 ml-2" />
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

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
