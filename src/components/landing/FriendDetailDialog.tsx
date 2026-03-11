import { BadgeCheck, ChevronDown, ExternalLink, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceFriend {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  exclusive_conditions: string;
  logo_url: string;
  service_url: string;
}

interface FriendDetailDialogProps {
  friend: ServiceFriend | null;
  onClose: () => void;
}

export const FriendDetailDialog = ({ friend, onClose }: FriendDetailDialogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight + 8;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 16;
    setShowScrollHint(canScroll && !nearBottom);
  }, []);

  useEffect(() => {
    if (friend) {
      setShowScrollHint(true);
      setTimeout(checkScroll, 100);
    }
  }, [friend, checkScroll]);

  return (
    <Dialog open={!!friend} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#111111] border-white/[0.08] text-white p-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden rounded-2xl">
        <DialogTitle className="sr-only">{friend?.name}</DialogTitle>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="overflow-y-auto flex-1 overscroll-contain"
        >
          {/* Hero header */}
          <div className="relative px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" />
            <div className="relative flex items-start gap-5">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0" style={{ width: 72, height: 72 }}>
                <img
                  src={friend?.logo_url}
                  alt={friend?.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {friend?.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary/80">Верифицированный партнёр</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                О сервисе
              </h4>
              <p className="text-sm sm:text-base text-white/65 leading-relaxed whitespace-pre-line">
                {friend?.detailed_description || friend?.short_description}
              </p>
            </div>

            {/* Exclusive conditions */}
            {friend?.exclusive_conditions && (
              <div className="rounded-2xl bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] border border-primary/20 p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold text-primary">
                    Эксклюзивные условия
                  </h4>
                </div>
                <p className="text-sm sm:text-base text-white/65 leading-relaxed whitespace-pre-line">
                  {friend.exclusive_conditions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        {showScrollHint && (
          <div className="absolute bottom-[76px] left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-white/60" />
            </div>
          </div>
        )}

        {/* Sticky footer */}
        <div className="border-t border-white/[0.06] px-6 py-4 sm:px-8 sm:py-5 bg-[#111111] shrink-0">
          <Button className="w-full gap-2 h-12 text-base" size="lg" asChild>
            <a href={friend?.service_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Перейти на сайт
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
