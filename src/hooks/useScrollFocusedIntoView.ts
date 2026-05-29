import { useEffect, type RefObject } from "react";

/**
 * Scrolls the currently focused input/textarea/contenteditable inside the
 * given container into view when it gains focus. Crucial on mobile (especially
 * iOS Safari), where the on-screen keyboard otherwise covers the active field
 * inside a scrollable popup container.
 */
export function useScrollFocusedIntoView(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const handler = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      if (!isField) return;

      // Wait for the on-screen keyboard animation to finish, then center the field.
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          target.scrollIntoView();
        }
      }, 300);
    };

    node.addEventListener("focusin", handler);
    return () => node.removeEventListener("focusin", handler);
  }, [ref, enabled]);
}
