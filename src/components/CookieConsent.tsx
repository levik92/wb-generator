import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

const CONSENT_KEY = 'wb-gen-cookie-consent';

export const CookieConsent = () => {
  // Проверяем localStorage сразу при инициализации состояния
  const [isVisible, setIsVisible] = useState(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    return !consent; // Показываем только если нет сохраненного согласия
  });

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  };

  const handleClose = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card className="p-4 shadow-lg border-border bg-background">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-foreground mb-3">
              Мы используем файлы cookie для улучшения работы сайта и анализа трафика. 
              Продолжая использовать сайт, вы соглашаетесь с использованием cookie.
            </p>
            <Button 
              onClick={handleAccept}
              className="w-full bg-wb-purple hover:bg-wb-purple-dark text-white"
              size="sm"
            >
              Хорошо
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-foreground hover:text-background transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};