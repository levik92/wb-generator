import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

export const DashboardBanners = ({ userId }: DashboardBannersProps) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBannersAndDismissed();
  }, [userId]);

  const fetchBannersAndDismissed = async () => {
    try {
      const { data: bannersData, error: bannersError } = await supabase
        .from('dashboard_banners')
        .select('id, title, description, gradient_start, gradient_end')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (bannersError) throw bannersError;

      const { data: dismissedData, error: dismissedError } = await supabase
        .from('user_dismissed_banners')
        .select('banner_id')
        .eq('user_id', userId);

      if (dismissedError) throw dismissedError;

      const dismissedSet = new Set(dismissedData?.map(d => d.banner_id) || []);
      setDismissedIds(dismissedSet);

      const visibleBanners = (bannersData || []).filter(
        b => !dismissedSet.has(b.id)
      );
      setBanners(visibleBanners);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleDismiss = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from('user_dismissed_banners')
        .insert({ user_id: userId, banner_id: bannerId });
      if (error) throw error;

      setDismissedIds(prev => new Set([...prev, bannerId]));
      setBanners(prev => {
        const filtered = prev.filter(b => b.id !== bannerId);
        if (currentIndex >= filtered.length && filtered.length > 0) {
          setCurrentIndex(filtered.length - 1);
        }
        return filtered;
      });
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

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const hasMultiple = banners.length > 1;

  return (
    <div className="w-full mb-4 md:mb-6">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-violet-500/10 transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, ${currentBanner.gradient_start} 0%, ${currentBanner.gradient_end} 100%)`,
        }}
      >
        {/* Decorative inner glows */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.25),_transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Закрыть"
          className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm"
          onClick={() => handleDismiss(currentBanner.id)}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="relative flex flex-col gap-3 p-4 pr-12 sm:p-5 sm:pr-14 md:flex-row md:items-center md:gap-5 md:p-6 md:pr-16">
          {/* Icon badge */}
          <div className="hidden sm:flex shrink-0 h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 shadow-inner">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>

          {/* Text */}
          <div
            key={currentBanner.id}
            className="flex-1 min-w-0 animate-fade-in"
          >
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-white/90">
                Новое
              </span>
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug break-words">
              {currentBanner.title}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-white/90 leading-relaxed break-words line-clamp-3 md:line-clamp-2">
              {currentBanner.description}
            </p>
          </div>

          {/* Navigation (desktop, side) */}
          {hasMultiple && (
            <div className="hidden md:flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Предыдущий"
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm"
                onClick={goToPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Следующий"
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Dots */}
        {hasMultiple && (
          <div className="relative flex items-center justify-center gap-1.5 pb-3 md:pb-4">
            {banners.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Перейти к баннеру ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
