import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, User, BarChart3, Megaphone, Send, ShieldCheck } from "lucide-react";

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
  otherPlaceholder?: string;
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
    otherPlaceholder: "Уточните, кем вы являетесь",
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
    otherPlaceholder: "Уточните объём",
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
      "Instagram",
      "Реклама (у блогера / в соцсетях)",
      "Рекомендация знакомых",
      "Wildberries / чаты селлеров",
      "Другое",
    ],
    otherPlaceholder: "Уточните, откуда узнали (необязательно)",
  },
];

export const OnboardingSurvey = ({ userId, onComplete }: OnboardingSurveyProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Bonus "let's get to know each other" Telegram step (after all questions)
  const TELEGRAM_STEP = QUESTIONS.length;
  const [telegram, setTelegram] = useState("");
  const [consent, setConsent] = useState(false);

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

  const finishSurvey = async (saveTelegram: boolean) => {
    setSaving(true);
    try {
      const rows = Object.entries(answers).map(([question_key, answer]) => {
        let finalAnswer = answer;
        if (answer === "Другое" && otherText[question_key]) {
          finalAnswer = `Другое: ${otherText[question_key]}`;
        }
        return { user_id: userId, question_key, answer: finalAnswer };
      });

      await (supabase as any).from("user_survey_responses").insert(rows);

      // Save Telegram username to profile (NOT to survey responses, so it
      // does not appear in the public survey statistics)
      if (saveTelegram && telegram.trim()) {
        const handle = telegram.trim().replace(/^@+/, "").slice(0, 64);
        if (handle) {
          await (supabase as any)
            .from("profiles")
            .update({ telegram_username: handle })
            .eq("id", userId);
        }
      }

      setIsOpen(false);
      onComplete();
    } catch (error) {
      console.error("Error saving survey:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === QUESTIONS.length - 1) {
      // Move to bonus Telegram step
      setCurrentStep(TELEGRAM_STEP);
    } else {
      // Telegram step — save with telegram if provided & consent given
      const canSave = telegram.trim().length > 0 && consent;
      await finishSurvey(canSave);
    }
  };

  const isTelegramStep = currentStep === TELEGRAM_STEP;
  const currentQuestion = QUESTIONS[currentStep];
  const currentAnswer = isTelegramStep ? undefined : answers[currentQuestion?.key];
  const Icon = isTelegramStep ? Send : currentQuestion?.icon;
  const totalSteps = QUESTIONS.length + 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
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
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Handle bar for mobile */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 md:hidden" />

            <div className="p-5 md:p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <motion.div
                  key={isTelegramStep ? "telegram" : currentQuestion.key}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0"
                >
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </motion.div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {isTelegramStep
                      ? `Шаг ${currentStep + 1} из ${totalSteps}`
                      : `Вопрос ${currentStep + 1} из ${QUESTIONS.length}`}
                  </p>
                  <motion.h3
                    key={`title-${isTelegramStep ? "telegram" : currentQuestion.key}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-base md:text-lg font-semibold leading-tight"
                  >
                    {isTelegramStep ? "Давайте знакомиться" : currentQuestion.title}
                  </motion.h3>
                </div>
              </div>

              {/* Body */}
              {isTelegramStep ? (
                <motion.div
                  key="telegram-body"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 mb-6"
                >
                  <p className="text-sm text-muted-foreground">
                    Мы хотим стать ближе и приглашать вас в бонусные программы, дарить токены и сообщать о новых фишках. Оставьте свой логин Telegram — этот шаг можно пропустить.
                  </p>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      className="h-11 pl-7 text-sm"
                      placeholder="username"
                      maxLength={64}
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value.replace(/\s/g, ""))}
                    />
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border cursor-pointer">
                    <Checkbox
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
                      <div className="flex items-center gap-1.5 mb-1 text-foreground font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Ваши данные в безопасности
                      </div>
                      Я соглашаюсь с обработкой моего логина Telegram в соответствии с политикой конфиденциальности. Данные используются только для участия в бонусных программах WBGen и приглашений в закрытые активности.
                    </div>
                  </label>
                </motion.div>
              ) : (
                <>
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
                      <div key={option}>
                        <button
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
                        {option === "Другое" && currentAnswer === "Другое" && (
                          <Input
                            className="mt-2 ml-8 w-[calc(100%-2rem)] h-10 text-sm"
                            placeholder="Уточните, откуда узнали (необязательно)"
                            maxLength={100}
                            value={otherText[currentQuestion.key] || ""}
                            onChange={(e) =>
                              setOtherText((prev) => ({
                                ...prev,
                                [currentQuestion.key]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {currentStep > 0 && !isTelegramStep && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11 md:h-12"
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                  >
                    Назад
                  </Button>
                )}
                {isTelegramStep && (
                  <Button
                    variant="outline"
                    className="flex-1 h-11 md:h-12"
                    onClick={() => finishSurvey(false)}
                    disabled={saving}
                  >
                    Пропустить
                  </Button>
                )}
                <Button
                  className="flex-1 h-11 md:h-12 text-sm md:text-base"
                  onClick={handleNext}
                  disabled={
                    saving ||
                    (isTelegramStep
                      ? !telegram.trim() || !consent
                      : !currentAnswer)
                  }
                >
                  {saving ? (
                    "Сохранение..."
                  ) : isTelegramStep ? (
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
