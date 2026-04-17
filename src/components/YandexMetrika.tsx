import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const YM_COUNTER_ID = 105111303;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/**
 * Fire a Yandex.Metrika goal. Safe to call before the counter has loaded —
 * the global stub queues the call and replays it once tag.js arrives.
 */
const reachGoal = (goal: string) => {
  if (typeof window === "undefined" || typeof window.ym !== "function") return;
  window.ym(YM_COUNTER_ID, "reachGoal", goal);
};

/**
 * Map specific routes to JavaScript-event goals defined in Metrika.
 * Add new entries here when adding goals in the Metrika dashboard.
 */
const ROUTE_GOALS: Record<string, string> = {
  "/promo": "promo_loaded",
  "/promo/thanks": "promo_thanks_loaded",
};

/**
 * SPA-friendly Yandex.Metrika route tracker.
 *
 * The counter itself is installed globally in index.html so it loads once
 * and is available on every page. This component:
 *  1) sends a `hit` on every client-side route change so URL-based goals
 *     (e.g. "url содержит: wbgen.ru/promo/thanks") fire on SPA navigation;
 *  2) sends a `reachGoal` for routes mapped above so JavaScript-event
 *     goals fire as well.
 *
 * The very first hit is skipped because the inline `ym('init', ...)` call
 * in index.html already counts the initial pageview.
 */
const YandexMetrika = () => {
  const location = useLocation();
  const isFirstHit = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.ym !== "function") {
      return;
    }

    const path = location.pathname;
    const url = window.location.origin + path + location.search + location.hash;

    if (isFirstHit.current) {
      isFirstHit.current = false;
    } else {
      window.ym(YM_COUNTER_ID, "hit", url, {
        title: document.title,
        referer: document.referrer,
      });
    }

    const goal = ROUTE_GOALS[path];
    if (goal) reachGoal(goal);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export { reachGoal };
export default YandexMetrika;
