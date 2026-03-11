import { BadgeCheck, ChevronDown, ExternalLink, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

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

const FriendContent = ({ friend, onClose, isMobile }: { friend: ServiceFriend | null; onClose: () => void; isMobile: boolean }) => {
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
    <div className="flex flex-col" style={{ maxHeight: isMobile ? '85vh' : undefined }}>
      {/* Close button — desktop only, mobile uses drawer handle */}
      {!isMobile && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="overflow-y-auto flex-1 overscroll-contain"
      >
        {/* Hero header */}
        <div className="relative px-5 pt-6 pb-5 sm:px-8 sm:pt-10 sm:pb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" />
          <div className="relative flex items-start gap-4 sm:gap-5">
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px]">
              <img
                src={friend?.logo_url}
                alt={friend?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 pt-0.5 sm:pt-1">
              <h3 className="text-lg sm:text-2xl font-bold text-white truncate">
                {friend?.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <BadgeCheck className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm text-primary/80">Верифицированный партнёр</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 sm:px-8 sm:pb-8 space-y-5 sm:space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2.5 sm:mb-3">
              О сервисе
            </h4>
            <p className="text-sm sm:text-base text-white/65 leading-relaxed whitespace-pre-line">
              {friend?.detailed_description || friend?.short_description}
            </p>
          </div>

          {/* Exclusive conditions */}
          {friend?.exclusive_conditions && (
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] border border-primary/20 p-4 sm:p-6">
              <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-primary">
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
        <div className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce" style={{ bottom: isMobile ? 80 : 76 }}>
          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <ChevronDown className="w-4 h-4 text-white/60" />
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <div className="border-t border-white/[0.06] px-5 py-4 sm:px-8 sm:py-5 shrink-0">
        <Button className="w-full gap-2 h-12 text-base" size="lg" asChild>
          <a href={friend?.service_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
            Перейти на сайт
          </a>
        </Button>
      </div>
    </div>
  );
};

export const FriendDetailDialog = ({ friend, onClose }: FriendDetailDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={!!friend} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="bg-[#111111] border-white/[0.08] text-white">
          <DrawerTitle className="sr-only">{friend?.name}</DrawerTitle>
          <FriendContent friend={friend} onClose={onClose} isMobile />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!friend} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#111111] border-white/[0.08] text-white p-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden rounded-2xl">
        <DialogTitle className="sr-only">{friend?.name}</DialogTitle>
        <FriendContent friend={friend} onClose={onClose} isMobile={false} />
      </DialogContent>
    </Dialog>
  );
};
