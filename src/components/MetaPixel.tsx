import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Tracks SPA navigation as PageView events for Meta (Facebook) Pixel.
 * The base pixel is initialized in index.html; this component fires
 * an additional PageView on every client-side route change.
 */
const MetaPixel = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    // Defer to the next tick so Yandex.Metrika gets the network slot first.
    // Meta Pixel is not latency-sensitive; a 0ms delay is invisible to users
    // but prevents fbq from blocking critical conversion-tracking requests.
    const timer = setTimeout(() => {
      if (typeof window.fbq === "function") window.fbq("track", "PageView");
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixel;
