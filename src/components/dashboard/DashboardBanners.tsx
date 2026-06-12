import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string;
  description: string;
  gradient_start: string;
  gradient_end: string;
}

interface DashboardBannersProps {
  userId: string;
}

const AUTOPLAY_MS = 8000;

export const DashboardBanners = ({ userId }: DashboardBannersProps) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe state
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: bannersData, error: bannersError }, { data: dismissedData, error: dismissedError }] =
          await Promise.all([
            supabase
              .from('dashboard_banners')
              .select('id, title, description, gradient_start, gradient_end')
              .eq('is_active', true)
              .order('display_order', { ascending: true }),
            supabase
              .from('user_dismissed_banners')
              .select('banner_id')
              .eq('user_id', userId),
          ]);

        if (bannersError) throw bannersError;
        if (dismissedError) throw dismissedError;
        if (cancelled) return;

        const dismissedSet = new Set(dismissedData?.map(d => d.banner_id) || []);
        setDismissedIds(dismissedSet);
        setBanners((bannersData || []).filter(b => !dismissedSet.has(b.id)));
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const hasMultiple = banners.length > 1;

  useEffect(() => {
    if (!hasMultiple || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [banners.length, hasMultiple, isPaused, currentIndex]);

  const handleDismiss = async (bannerId: string) => {
    // Optimistic UI
    setBanners(prev => {
      const filtered = prev.filter(b => b.id !== bannerId);
      setCurrentIndex(idx => (idx >= filtered.length && filtered.length > 0 ? filtered.length - 1 : idx));
      return filtered;
    });
    setDismissedIds(prev => new Set([...prev, bannerId]));
    try {
      await supabase.from('user_dismissed_banners').insert({ user_id: userId, banner_id: bannerId });
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!hasMultiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasMultiple, goToPrev, goToNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setIsPaused(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setDragOffset(touchDeltaX.current);
  };
  const onTouchEnd = () => {
    const delta = touchDeltaX.current;
    setDragOffset(0);
    touchStartX.current = null;
    setIsPaused(false);
    if (Math.abs(delta) > 50 && hasMultiple) {
      delta > 0 ? goToPrev() : goToNext();
    }
  };

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Уведомления"
      className="w-full mb-4 md:mb-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 shadow-[0_8px_30px_-12px_rgba(76,29,149,0.35)] transition-[background] duration-700 ease-out"
        style={{
          background: `linear-gradient(125deg, ${currentBanner.gradient_start} 0%, ${currentBanner.gradient_end} 100%)`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Ambient decor */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.28),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.18),_transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        {/* Subtle grain via gradient noise */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:6px_6px]" />

        {/* Close */}
        <button
          type="button"
          aria-label="Скрыть уведомление"
          onClick={() => handleDismiss(currentBanner.id)}
          className="absolute top-2.5 right-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-white/30 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content with swipe transform */}
        <div
          className="relative will-change-transform"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: dragOffset === 0 ? 'transform 300ms ease-out' : 'none',
          }}
        >
          <div className="relative flex flex-col gap-3 p-4 pr-12 sm:p-5 sm:pr-14 md:flex-row md:items-center md:gap-5 md:p-6 md:pr-20 lg:pr-24">
            {/* Icon badge */}
            <div className="hidden sm:flex shrink-0 h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 shadow-inner ring-1 ring-white/10">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
            </div>

            {/* Text */}
            <div
              key={currentBanner.id}
              className="flex-1 min-w-0 animate-fade-in"
              aria-live="polite"
            >
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] text-white/95">
                  Новое
                </span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug break-words drop-shadow-sm">
                {currentBanner.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-white/90 leading-relaxed break-words line-clamp-3 md:line-clamp-2">
                {currentBanner.description}
              </p>
            </div>

            {/* Desktop nav arrows */}
            {hasMultiple && (
              <div className="hidden md:flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Предыдущее"
                  onClick={goToPrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-white/30 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Следующее"
                  onClick={goToNext}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-white/30 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Dots + progress */}
          {hasMultiple && (
            <div className="relative flex items-center justify-center gap-2 pb-3 md:pb-4">
              {banners.map((b, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Перейти к уведомлению ${idx + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "relative h-1.5 rounded-full overflow-hidden transition-all duration-300",
                      isActive ? "w-8 bg-white/30" : "w-1.5 bg-white/35 hover:bg-white/60"
                    )}
                  >
                    {isActive && !isPaused && (
                      <span
                        key={`${currentIndex}-${isPaused}`}
                        className="absolute inset-y-0 left-0 bg-white rounded-full"
                        style={{
                          animation: `banner-progress ${AUTOPLAY_MS}ms linear forwards`,
                        }}
                      />
                    )}
                    {isActive && isPaused && (
                      <span className="absolute inset-0 bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes banner-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
};
