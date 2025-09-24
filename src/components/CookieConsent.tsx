import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleClose = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
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