import { useRef, useCallback, type ReactNode, type MouseEvent } from "react";
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
 * Оптимизация: requestAnimationFrame-троттлинг + кеш bounding rect.
 * На устройствах с hover:none эффект автоматически выключается через CSS.
 */
export const SpotlightCard = ({
  children,
  className,
  spotlightColor = "hsl(263 90% 60% / 0.10)",
  magnetic = false,
}: SpotlightCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const apply = useCallback(() => {
    rafRef.current = null;
    const el = ref.current;
    const pos = pendingRef.current;
    const rect = rectRef.current;
    if (!el || !pos || !rect) return;

    const x = pos.x - rect.left;
    const y = pos.y - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (magnetic) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -3;
      const ry = ((x - cx) / cx) * 3;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    }
  }, [magnetic]);

  const handleEnter = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    rectRef.current = el.getBoundingClientRect();
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(apply);
  }, [apply]);

  const handleMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(apply);
  }, [apply]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
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
