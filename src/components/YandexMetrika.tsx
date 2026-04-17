import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const YM_COUNTER_ID = 105111303;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/**
 * SPA-friendly Yandex.Metrika route tracker.
 *
 * The counter itself is installed globally in index.html so it loads once
 * and is available on every page (including ad-traffic pages /promo, /promo/thanks).
 *
 * This component only fires `hit` on every client-side route change so that
 * Metrika goals based on URLs (e.g. "url содержит: wbgen.ru/promo/thanks")
 * fire correctly when users navigate via React Router.
 */
const YandexMetrika = () => {
  const location = useLocation();
  const isFirstHit = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.ym !== "function") {
      return;
    }

    const url = window.location.origin + location.pathname + location.search + location.hash;

    // Skip the very first hit because the inline init script already
    // fires the initial pageview when the counter loads.
    if (isFirstHit.current) {
      isFirstHit.current = false;
      return;
    }

    window.ym(YM_COUNTER_ID, "hit", url, {
      title: document.title,
      referer: document.referrer,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default YandexMetrika;
