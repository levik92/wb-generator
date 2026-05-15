import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare, MoreVertical, Download, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PWAInstallPromptProps {
  userId: string;
  loginCount: number;
}

export const PWAInstallPrompt = ({ userId, loginCount }: PWAInstallPromptProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if already in PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsPWA(isStandalone);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt only after the user has done at least 2 generations,
    // not in PWA mode, on mobile platforms, and not previously dismissed.
    const dismissed = localStorage.getItem(`pwa_install_dismissed_${userId}`);
    if (!dismissed && !isStandalone && (ios || android)) {
      (async () => {
        try {
          const { count } = await (supabase as any)
            .from('generations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          if ((count ?? 0) >= 2) {
            setTimeout(() => setIsOpen(true), 1500);
          }
        } catch (err) {
          // Fail silent — never spam the prompt on errors
          console.warn('PWA prompt: generation count check failed', err);
        }
      })();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [userId]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`pwa_install_dismissed_${userId}`, 'true');
    setIsOpen(false);
  };

  const handleRemindLater = () => {
    setIsOpen(false);
  };

  if (isPWA) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-background rounded-t-3xl overflow-hidden"
          >
            {/* Handle bar */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3" />
            
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                    <Smartphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Установите приложение</h3>
                    <p className="text-sm text-muted-foreground">Быстрый доступ с главного экрана</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Мгновенный запуск</p>
                    <p className="text-xs text-muted-foreground">Без открытия браузера</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-lg">📱</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Как нативное приложение</p>
                    <p className="text-xs text-muted-foreground">Полноэкранный режим</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {isIOS ? (
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-center text-muted-foreground">Как установить на iPhone:</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Share className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-center">1. Нажмите<br/>"Поделиться"</span>
                    </div>
                    <div className="text-2xl text-muted-foreground">→</div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <PlusSquare className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-center">2. "На экран<br/>Домой"</span>
                    </div>
                    <div className="text-2xl text-muted-foreground">→</div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <span className="text-xl">✓</span>
                      </div>
                      <span className="text-xs text-center">3. Нажмите<br/>"Добавить"</span>
                    </div>
                  </div>
                </div>
              ) : isAndroid && !deferredPrompt ? (
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-center text-muted-foreground">Как установить на Android:</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <MoreVertical className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-center">1. Откройте<br/>меню ⋮</span>
                    </div>
                    <div className="text-2xl text-muted-foreground">→</div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Download className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-center">2. "Установить<br/>приложение"</span>
                    </div>
                    <div className="text-2xl text-muted-foreground">→</div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <span className="text-xl">✓</span>
                      </div>
                      <span className="text-xs text-center">3. Нажмите<br/>"Установить"</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="space-y-3">
                {deferredPrompt && isAndroid && (
                  <Button 
                    className="w-full h-12 text-base" 
                    onClick={handleInstall}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Установить приложение
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-base"
                  onClick={handleRemindLater}
                >
                  Напомнить позже
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
