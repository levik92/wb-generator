import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles } from "lucide-react";

interface TutorialDialogProps {
  userId: string;
  loginCount: number;
  onNavigateToBonuses: () => void;
}

export const TutorialDialog = ({ userId, loginCount, onNavigateToBonuses }: TutorialDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Показываем диалог только при первом и втором входе
    if (loginCount === 1 || loginCount === 2) {
      setOpen(true);
    }
  }, [loginCount]);

  const handleGoToBonuses = () => {
    setOpen(false);
    onNavigateToBonuses();
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Gift className="h-16 w-16 text-primary relative z-10" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Получай токены бесплатно! 🎁
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-4">
            Участвуй в нашей{" "}
            <span className="font-semibold text-foreground">бонусной программе</span> и получай 
            токены за публикации о сервисе в социальных сетях. Размести сторис или рилс — 
            и мы начислим бонусы на твой баланс!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleGoToBonuses}
            className="w-full relative overflow-hidden group border-0 ring-0 outline-none"
            size="lg"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse" />
              Узнать подробнее
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>

          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full hover:bg-muted hover:text-foreground"
          >
            Напомнить позже
          </Button>
        </div>

        {loginCount === 1 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Это окно будет показано еще один раз при следующем входе
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
