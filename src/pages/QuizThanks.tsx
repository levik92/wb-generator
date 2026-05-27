import { ThanksScreen } from "@/components/thanks/ThanksScreen";

const QuizThanks = () => {
  const trackMount = () => {
    if (typeof window === "undefined") return;
    // @ts-ignore
    window.ym?.(105111303, "reachGoal", "quiz_thanks_loaded");
    // @ts-ignore
    window.fbq?.("trackCustom", "QuizThanksLoaded");
  };

  return (
    <ThanksScreen
      title="Отлично! Подбираем для вас решение"
      subtitle="Сейчас откроем регистрацию — пройдите её и сразу попробуйте сервис на своих карточках."
      primaryLabel="Перейти к регистрации"
      onMountTrack={trackMount}
    />
  );
};

export default QuizThanks;
