import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Tracks SPA navigation as PageView events for Meta (Facebook) Pixel.
 * The base pixel is initialized in index.html and already fires the
 * initial PageView automatically, so this component skips the first
 * render and only sends PageView on subsequent client-side route changes.
 */
const MetaPixel = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip the initial render — the inline fbq('track', 'PageView') in
    // index.html already counted the first pageview. Without this guard
    // every initial page load would record a duplicate PageView.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window.fbq !== "function") return;
    // Defer to the next tick so Yandex.Metrika gets the network slot first.
    const timer = setTimeout(() => {
      if (typeof window.fbq === "function") window.fbq("track", "PageView");
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixel;
