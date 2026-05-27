import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  /** Включить лёгкий magnetic-наклон карточки */
  magnetic?: boolean;
}

/**
 * Карточка с курсорной подсветкой (spotlight) и опциональным magnetic-наклоном.
 * Эффект работает только на устройствах с pointer:fine (десктоп) — на мобиле просто статика.
 */
export const SpotlightCard = ({
  children,
  className,
  spotlightColor = "hsl(263 90% 60% / 0.18)",
  magnetic = false,
}: SpotlightCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (magnetic) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -3.5;
      const ry = ((x - cx) / cx) * 3.5;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    }
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("spotlight-card group/spot", magnetic && "magnetic-card", className)}
      style={
        {
          ["--spotlight-color" as string]: spotlightColor,
        } as React.CSSProperties
      }
    >
      {children}
      <div className="spotlight-card__glow" aria-hidden="true" />
    </div>
  );
};
