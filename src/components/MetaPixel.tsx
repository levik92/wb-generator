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
    // Fire PageView on each SPA route change (initial PageView is sent from index.html)
    window.fbq("track", "PageView");
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixel;
