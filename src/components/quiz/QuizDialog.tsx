import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_OPTIONS,
  AudienceId,
  GOALS_BY_AUDIENCE,
  QUIZ_SUBTITLE,
  VIDEO_BRANCH_BY_AUDIENCE,
  VIDEO_URLS,
} from "./quizConfig";

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accentBtn =
  "bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,70%,50%)] hover:opacity-90 transition-opacity text-white border-0";

export const QuizDialog = ({ open, onOpenChange }: QuizDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0); // 0=audience, 1=goals, 2=video
  const [audience, setAudience] = useState<AudienceId | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      // reset on close
      const t = setTimeout(() => {
        setStep(0);
        setAudience(null);
        setGoals([]);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const branch = audience ? VIDEO_BRANCH_BY_AUDIENCE[audience] : null;
  const videoUrl = branch ? VIDEO_URLS[branch] : "";
  const progress = ((step + 1) / 3) * 100;

  const handleAudiencePick = (id: AudienceId) => {
    setAudience(id);
    setGoals([]);
    setStep(1);
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    // Финальный трекинг
    if (typeof window !== "undefined") {
      // @ts-ignore
      window.ym?.(105111303, "reachGoal", "quiz_completed");
      // @ts-ignore
      window.fbq?.("trackCustom", "QuizCompleted");
    }
    onOpenChange(false);
    // Forward UTM query params so Я.Метрика attribution survives the SPA hop.
    navigate({ pathname: "/quiz/thanks", search: location.search });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[640px] bg-[#141414] border-white/10 text-white p-0">
        <div className="p-5 sm:p-7">
          {/* Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">Шаг {step + 1} из 3</span>
              {step > 0 && step < 2 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Назад
                </button>
              )}
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,70%,50%)]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Кто вы?</h2>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">{QUIZ_SUBTITLE}</p>
                <div className="grid gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAudiencePick(opt.id)}
                      className="group text-left px-4 py-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[hsl(268,83%,55%)]/40 transition-all flex items-center justify-between"
                    >
                      <span className="text-sm sm:text-base">{opt.label}</span>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(268,83%,60%)] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && audience && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Какие цели вы преследуете?</h2>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">
                  {QUIZ_SUBTITLE} Можно выбрать несколько вариантов.
                </p>
                <div className="grid gap-2 mb-6">
                  {GOALS_BY_AUDIENCE[audience].map((g) => {
                    const checked = goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          "text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3",
                          checked
                            ? "border-[hsl(268,83%,55%)]/60 bg-[hsl(268,83%,55%)]/10"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                            checked
                              ? "bg-gradient-to-br from-[hsl(268,83%,55%)] to-[hsl(280,70%,50%)] border-transparent"
                              : "border-white/20"
                          )}
                        >
                          {checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-sm sm:text-base">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={goals.length === 0}
                  size="lg"
                  className={cn("w-full h-12 rounded-xl font-semibold", accentBtn)}
                >
                  Продолжить
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Посмотрите короткое видео</h2>
                <p className="text-sm text-white/50 mb-5">
                  Всего минута — это поможет понять, нужен ли вам сервис и сможете ли вы закрыть свои задачи.
                </p>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 mb-3">
                  {videoUrl ? (
                    <iframe
                      src={videoUrl}
                      title="WBGen — видео"
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                      Видео скоро появится
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/40 text-center mb-6">
                  Посмотрите обязательно — займёт всего минуту.
                </p>

                <Button
                  onClick={handleFinish}
                  size="lg"
                  className={cn("w-full h-14 rounded-xl text-base font-semibold", accentBtn)}
                >
                  Хочу попробовать
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default QuizDialog;
