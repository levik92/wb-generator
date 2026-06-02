/**
 * Aurora-эффект для hero: переливающийся conic-градиент + мягкие orbs.
 * На мобиле — упрощённый рендер без `will-change` и с меньшим blur,
 * чтобы избежать лагов от композитинга больших GPU-слоёв.
 */
export const AuroraBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Базовый noir-фон */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(263_70%_12%)_0%,hsl(0_0%_5%)_55%,hsl(0_0%_4%)_100%)]" />

      {/* Aurora conic */}
      <div
        className="aurora-conic absolute -top-1/2 left-1/2 -translate-x-1/2 w-[140vw] h-[140vh] opacity-[0.32] aurora-spin"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, transparent 0%, hsl(263 90% 60% / 0.28) 12%, transparent 25%, hsl(290 90% 65% / 0.24) 42%, transparent 55%, hsl(220 90% 65% / 0.22) 72%, transparent 88%, hsl(263 90% 60% / 0.28) 100%)",
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 30%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 30%, #000 30%, transparent 75%)",
        }}
      />

      {/* Floating orbs */}
      <div className="aurora-orb absolute top-[10%] left-[12%] w-[380px] h-[380px] max-w-[55vw] bg-[hsl(263,95%,58%)] rounded-full blur-[120px] opacity-[0.16] aurora-float-a" />
      <div className="aurora-orb absolute bottom-[5%] right-[8%] w-[340px] h-[340px] max-w-[55vw] bg-[hsl(295,95%,62%)] rounded-full blur-[120px] opacity-[0.14] aurora-float-b" />
      <div className="aurora-orb absolute top-[30%] right-[20%] w-[280px] h-[280px] max-w-[45vw] bg-[hsl(220,100%,60%)] rounded-full blur-[110px] opacity-[0.10] aurora-float-c" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-[0.08]" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#0d0d0d]" />
    </div>
  );
};
