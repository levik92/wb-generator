import { useState, type ReactNode } from "react";
import { Eye, EyeOff, X } from "lucide-react";
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
  /**
   * "collapse" — toggleable: when hidden shows a compact stub to re-open (default).
   * "dismiss"  — one-way close: when hidden renders nothing, persists per account.
   */
  mode?: "collapse" | "dismiss";
}

/**
 * Wraps an informational/promo block with a persistent hide/show toggle.
 * State persisted in localStorage under `storageKey`.
 */
export const CollapsibleInfoBlock = ({
  storageKey,
  collapsedLabel = "Подробнее о разделе",
  children,
  className,
  mode = "collapse",
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

  const isDismiss = mode === "dismiss";
  const ToggleIcon = isDismiss ? X : EyeOff;
  const tooltipLabel = isDismiss ? "Закрыть" : "Скрыть";

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
                  aria-label={`${tooltipLabel} блок`}
                  className="group absolute top-2 right-2 z-40 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-border/60 text-muted-foreground hover:border-violet-400 hover:shadow-sm transition-all"
                >
                  <ToggleIcon className="w-4 h-4 text-slate-600 group-hover:text-violet-600 transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6} className="text-xs">
                {tooltipLabel}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {children}
        </motion.div>
      ) : isDismiss ? null : (
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
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] leading-none text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors"
                >
                  <Eye className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
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
