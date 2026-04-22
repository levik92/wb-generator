/**
 * Tracks the visual viewport on mobile devices and exposes the on-screen
 * keyboard height as a CSS custom property: `--keyboard-inset-height`.
 *
 * Use this once at the app root. Components (Drawer, Dialog) can then
 * compensate for the keyboard by reading the variable, ensuring focused
 * inputs remain visible.
 */
export function setupKeyboardInsetTracking() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  const update = () => {
    const vv = window.visualViewport;
    if (!vv) {
      root.style.setProperty("--keyboard-inset-height", "0px");
      return;
    }
    // When the soft keyboard appears, visualViewport.height shrinks below
    // window.innerHeight. The difference is roughly the keyboard height.
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty("--keyboard-inset-height", `${inset}px`);
  };

  update();
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  window.addEventListener("orientationchange", update);
}
