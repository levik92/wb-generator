import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles } from "lucide-react";

interface TutorialDialogProps {
  userId: string;
  loginCount: number;
  onNavigateToLearning: () => void;
}

export const TutorialDialog = ({ userId, loginCount, onNavigateToLearning }: TutorialDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Показываем диалог только при первом и втором входе
    if (loginCount === 1 || loginCount === 2) {
      setOpen(true);
    }
  }, [loginCount]);

  const handleGoToLearning = () => {
    setOpen(false);
    onNavigateToLearning();
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
              <BookOpen className="h-16 w-16 text-primary relative z-10" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Добро пожаловать в сервис! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-4">
            Перед началом работы рекомендуем изучить раздел{" "}
            <span className="font-semibold text-foreground">Обучение</span>, где вы найдете
            подробные инструкции и примеры использования всех возможностей платформы.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleGoToLearning}
            className="w-full relative overflow-hidden group border-0 ring-0 outline-none"
            size="lg"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse" />
              Перейти к обучению
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
