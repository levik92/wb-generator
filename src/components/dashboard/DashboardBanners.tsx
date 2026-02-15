import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBannersAndDismissed();
  }, [userId]);

  const fetchBannersAndDismissed = async () => {
    try {
      // Fetch active banners
      const { data: bannersData, error: bannersError } = await supabase
        .from('dashboard_banners')
        .select('id, title, description, gradient_start, gradient_end')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (bannersError) throw bannersError;

      // Fetch dismissed banners for this user
      const { data: dismissedData, error: dismissedError } = await supabase
        .from('user_dismissed_banners')
        .select('banner_id')
        .eq('user_id', userId);

      if (dismissedError) throw dismissedError;

      const dismissedSet = new Set(dismissedData?.map(d => d.banner_id) || []);
      setDismissedIds(dismissedSet);

      // Filter out dismissed banners
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

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleDismiss = async (bannerId: string) => {
    try {
      // Insert into dismissed table
      const { error } = await supabase
        .from('user_dismissed_banners')
        .insert({ user_id: userId, banner_id: bannerId });

      if (error) throw error;

      // Update local state
      setDismissedIds(prev => new Set([...prev, bannerId]));
      setBanners(prev => {
        const filtered = prev.filter(b => b.id !== bannerId);
        // Adjust current index if needed
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

  // Don't render anything if no banners or still loading
  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="w-full mb-4 md:mb-6">
      <div
        className="relative w-full rounded-xl p-4 md:p-6 overflow-hidden transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, ${currentBanner.gradient_start} 0%, ${currentBanner.gradient_end} 100%)`,
        }}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 md:top-3 md:right-3 h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
          onClick={() => handleDismiss(currentBanner.id)}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="pr-10 md:pr-12">
          <h3 className="text-sm md:text-base font-semibold text-white mb-1 md:mb-1.5 line-clamp-1">
            {currentBanner.title}
          </h3>
          <p className="text-xs text-white/90 line-clamp-2">
            {currentBanner.description}
          </p>
        </div>

        {/* Navigation dots and arrows (only if multiple banners) */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3 md:mt-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 text-white hidden md:flex"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1.5">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-6 bg-white' 
                      : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 text-white hidden md:flex"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
