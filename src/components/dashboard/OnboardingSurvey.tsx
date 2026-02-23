import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, User, BarChart3, Megaphone } from "lucide-react";

interface OnboardingSurveyProps {
  userId: string;
  onComplete: () => void;
}

interface Question {
  key: string;
  title: string;
  subtitle: string;
  icon: any;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    key: "who_are_you",
    title: "Кто вы?",
    subtitle: "Расскажите нам кто вы?",
    icon: User,
    options: [
      "Селлер на Wildberries",
      "Менеджер/маркетолог селлера",
      "Дизайнер карточек / студия",
      "Производитель/бренд (свой товар)",
      "Другое",
    ],
  },
  {
    key: "monthly_volume",
    title: "Объём в месяц",
    subtitle: "Сколько карточек товара вам нужно делать в месяц?",
    icon: BarChart3,
    options: [
      "Только начинаю (пока 0)",
      "1–5 карточек",
      "6–15 карточек",
      "16–50 карточек",
      "51+ карточек",
    ],
  },
  {
    key: "acquisition_channel",
    title: "Канал привлечения",
    subtitle: "Откуда вы узнали о WBGen?",
    icon: Megaphone,
    options: [
      "Поиск в Google/Яндекс",
      "YouTube",
      "TikTok / Reels / Shorts",
      "Telegram (канал/чат)",
      "Рекомендация знакомых",
      "Wildberries / чаты селлеров",
      "Другое",
    ],
  },
];

export const OnboardingSurvey = ({ userId, onComplete }: OnboardingSurveyProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkSurvey = async () => {
      // Check if user already completed survey
      const { data } = await supabase
        .from("user_survey_responses" as any)
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!data || data.length === 0) {
        setIsOpen(true);
      }
    };
    checkSurvey();
  }, [userId]);

  const handleSelect = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [QUESTIONS[currentStep].key]: answer }));
  };

  const handleNext = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Save all answers
      setSaving(true);
      try {
        const rows = Object.entries(answers).map(([question_key, answer]) => ({
          user_id: userId,
          question_key,
          answer,
        }));
        
        await (supabase as any)
          .from("user_survey_responses")
          .insert(rows);
        
        setIsOpen(false);
        onComplete();
      } catch (error) {
        console.error("Error saving survey:", error);
      } finally {
        setSaving(false);
      }
    }
  };

  const currentQuestion = QUESTIONS[currentStep];
  const currentAnswer = answers[currentQuestion?.key];
  const Icon = currentQuestion?.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-t-3xl md:rounded-3xl overflow-hidden mx-4 mb-0 md:mb-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Handle bar for mobile */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 md:hidden" />

            <div className="p-5 md:p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <motion.div
                  key={currentQuestion.key}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0"
                >
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </motion.div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Вопрос {currentStep + 1} из {QUESTIONS.length}
                  </p>
                  <motion.h3
                    key={`title-${currentQuestion.key}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-base md:text-lg font-semibold leading-tight"
                  >
                    {currentQuestion.title}
                  </motion.h3>
                </div>
              </div>

              {/* Subtitle */}
              <motion.p
                key={`sub-${currentQuestion.key}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-muted-foreground mb-4"
              >
                {currentQuestion.subtitle}
              </motion.p>

              {/* Options */}
              <motion.div
                key={`opts-${currentQuestion.key}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 mb-6"
              >
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left p-3 md:p-3.5 rounded-xl border transition-all text-sm md:text-base ${
                      currentAnswer === option
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          currentAnswer === option
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {currentAnswer === option && (
                          <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      {option}
                    </div>
                  </button>
                ))}
              </motion.div>

              {/* Actions */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11 md:h-12"
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                  >
                    Назад
                  </Button>
                )}
                <Button
                  className="flex-1 h-11 md:h-12 text-sm md:text-base"
                  onClick={handleNext}
                  disabled={!currentAnswer || saving}
                >
                  {saving ? (
                    "Сохранение..."
                  ) : currentStep === QUESTIONS.length - 1 ? (
                    "Готово"
                  ) : (
                    <>
                      Далее
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
