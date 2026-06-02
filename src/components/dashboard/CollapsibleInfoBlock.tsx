import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CollapsibleInfoBlockProps {
  storageKey: string;
  collapsedLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps an informational/promo block with a persistent hide/show toggle.
 * - When visible: renders children + small "Скрыть" (EyeOff) button in top-right.
 * - When hidden: collapses to a compact muted "Show" stub aligned to the right.
 * - State persisted in localStorage under `storageKey`.
 */
export const CollapsibleInfoBlock = ({
  storageKey,
  collapsedLabel = "Подробнее о разделе",
  children,
  className,
}: CollapsibleInfoBlockProps) => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== "true";
    } catch {
      return true;
    }
  });

  const hide = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setVisible(false);
  };

  const show = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setVisible(true);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {visible ? (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`relative ${className ?? ""}`}
        >
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={hide}
                  aria-label="Скрыть блок"
                  className="absolute top-2 right-2 z-40 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-background/75 backdrop-blur-sm border border-border/60 text-muted-foreground hover:text-foreground hover:bg-background hover:border-border transition-colors"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6} className="text-xs">
                Скрыть
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex justify-end"
        >
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={show}
                  aria-label="Показать блок"
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  <span className="truncate max-w-[60vw]">{collapsedLabel}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6} className="text-xs">
                Показать
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
