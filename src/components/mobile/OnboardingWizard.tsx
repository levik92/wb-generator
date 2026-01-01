import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Upload, Type, FileText, Grid, Sparkles, 
  ArrowRight, X, CheckCircle2, Edit, RefreshCw 
} from "lucide-react";

interface OnboardingWizardProps {
  userId: string;
  loginCount: number;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = {
  id: string;
  title: string;
  description: string;
  icon: any;
  action?: string;
};

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Давайте создадим вашу первую карточку!',
    description: 'Мы проведём вас по шагам генерации. Это займёт всего пару минут.',
    icon: Sparkles,
  },
  {
    id: 'upload',
    title: 'Загрузите фото товара',
    description: 'Нажмите на область загрузки или перетащите изображение вашего товара (до 3 фото).',
    icon: Upload,
    action: 'Загрузите изображение',
  },
  {
    id: 'name',
    title: 'Введите название товара',
    description: 'Напишите название вашего товара. Например: "Набор кистей для макияжа" или "Умные часы".',
    icon: Type,
    action: 'Заполните поле названия',
  },
  {
    id: 'description',
    title: 'Добавьте описание',
    description: 'Опишите товар или пожелания по дизайну. Можете нажать "Придумай сам", чтобы AI сгенерировал описание.',
    icon: FileText,
    action: 'Заполните описание или нажмите кнопку',
  },
  {
    id: 'select',
    title: 'Выберите тип карточки',
    description: 'Выберите "Главная" — это основная карточка товара, которую покупатели увидят первой.',
    icon: Grid,
    action: 'Выберите тип карточки',
  },
  {
    id: 'generate',
    title: 'Запустите генерацию!',
    description: 'Теперь нажмите кнопку "Генерировать" и подождите, пока AI создаст вашу карточку.',
    icon: Sparkles,
    action: 'Нажмите "Генерировать"',
  },
  {
    id: 'complete',
    title: 'Отлично! Вы справились! 🎉',
    description: 'Теперь вы можете редактировать или перегенерировать изображение с помощью иконок рядом с карточкой.',
    icon: CheckCircle2,
  },
];

export const OnboardingWizard = ({ 
  userId, 
  loginCount, 
  onComplete, 
  onSkip 
}: OnboardingWizardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding_completed_${userId}`);
    const skipped = localStorage.getItem(`onboarding_skipped_${userId}`);
    
    if (!completed && !skipped && loginCount === 1) {
      // Delay to let other dialogs close first
      setTimeout(() => setIsOpen(true), 500);
    }
  }, [userId, loginCount]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_skipped_${userId}`, 'true');
    setIsOpen(false);
    onSkip();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-t-3xl md:rounded-3xl overflow-hidden mx-4 mb-0 md:mb-4"
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Handle bar for mobile */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 md:hidden" />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    key={step.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25"
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Шаг {currentStep + 1} из {STEPS.length}
                    </p>
                    <motion.h3
                      key={`title-${step.id}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-lg font-semibold leading-tight"
                    >
                      {step.title}
                    </motion.h3>
                  </div>
                </div>
                {!isLastStep && (
                  <button
                    onClick={handleSkip}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Description */}
              <motion.p
                key={`desc-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-muted-foreground mb-6"
              >
                {step.description}
              </motion.p>

              {/* Action hint */}
              {step.action && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-6"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">{step.action}</p>
                </motion.div>
              )}

              {/* Tips for last step */}
              {isLastStep && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Edit className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Редактирование</p>
                      <p className="text-xs text-muted-foreground">Измените детали изображения</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Перегенерация</p>
                      <p className="text-xs text-muted-foreground">Создайте новый вариант карточки</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!isFirstStep && !isLastStep && (
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                  >
                    Назад
                  </Button>
                )}
                <Button 
                  className="flex-1 h-12 text-base"
                  onClick={handleNext}
                >
                  {isFirstStep ? 'Начать обучение' : isLastStep ? 'Завершить' : 'Далее'}
                  {!isLastStep && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </div>

              {/* Skip link */}
              {isFirstStep && (
                <button
                  onClick={handleSkip}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 py-2"
                >
                  Пропустить обучение
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
