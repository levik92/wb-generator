/**
 * Aurora-эффект для hero: переливающийся conic-градиент + мягкие orbs.
 * Только CSS-анимации (transform/opacity) — без JS-цикла, дружелюбно к моб. устройствам.
 * Уважает prefers-reduced-motion (через global media-query в landing-theme.css).
 */
export const AuroraBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Базовый noir-фон */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(263_70%_14%)_0%,hsl(0_0%_5%)_55%,hsl(0_0%_4%)_100%)]" />

      {/* Aurora: переливающийся conic-gradient */}
      <div
        className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[140vw] h-[140vh] opacity-[0.55] aurora-spin will-change-transform"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, transparent 0%, hsl(263 90% 55% / 0.35) 12%, transparent 25%, hsl(290 90% 60% / 0.30) 42%, transparent 55%, hsl(220 90% 60% / 0.28) 72%, transparent 88%, hsl(263 90% 55% / 0.35) 100%)",
          filter: "blur(80px)",
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 30%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 30%, #000 30%, transparent 75%)",
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-[10%] left-[12%] w-[420px] h-[420px] max-w-[60vw] bg-[hsl(263,95%,58%)] rounded-full blur-[140px] opacity-25 aurora-float-a will-change-transform" />
      <div className="absolute bottom-[5%] right-[8%] w-[380px] h-[380px] max-w-[60vw] bg-[hsl(295,95%,62%)] rounded-full blur-[140px] opacity-20 aurora-float-b will-change-transform" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] max-w-[50vw] bg-[hsl(220,100%,60%)] rounded-full blur-[120px] opacity-15 aurora-float-c will-change-transform" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-[0.10]" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#0d0d0d]" />
    </div>
  );
};
