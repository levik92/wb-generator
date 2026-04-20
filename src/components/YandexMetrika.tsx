import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const YM_COUNTER_ID = 105111303;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/**
 * Send a Yandex.Metrika goal via the official ym() API.
 * Returns a Promise that resolves after the goal is dispatched
 * (using the ym callback) or after a 500ms timeout — whichever
 * comes first. Callers can `await` before navigating away.
 */
const reachGoal = (goal: string): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (typeof window.ym !== "function") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 500);
    try {
      window.ym(YM_COUNTER_ID, "reachGoal", goal, { callback: () => { clearTimeout(timeout); resolve(); } });
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
};

const ROUTE_GOALS: Record<string, string> = {
  "/promo": "promo_loaded",
  "/promo/thanks": "promo_thanks_loaded",
};

/**
 * SPA-friendly Yandex.Metrika route tracker.
 *
 * The counter itself is installed globally in index.html (without `defer`),
 * so it sends the very first pageview automatically. This component:
 *  1) skips the initial mount to avoid a duplicate first hit;
 *  2) sends a `hit` on each subsequent client-side route change;
 *  3) fires a `reachGoal` (via sendBeacon) for routes mapped above so
 *     JavaScript-event goals are recorded even if the page unmounts fast.
 */
const YandexMetrika = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip the initial render — the inline counter in index.html already
    // counted the first pageview (defer is OFF).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Still fire a route-mapped goal on the initial page if applicable,
      // because the inline init only sends a hit, not custom goals.
      const initialGoal = ROUTE_GOALS[location.pathname];
      if (initialGoal) void reachGoal(initialGoal);
      return;
    }

    if (typeof window.ym !== "function") return;

    const path = location.pathname;
    const url = window.location.origin + path + location.search + location.hash;

    window.ym(YM_COUNTER_ID, "hit", url, {
      title: document.title,
      referer: document.referrer,
    });

    const goal = ROUTE_GOALS[path];
    if (goal) void reachGoal(goal);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export { reachGoal };
export default YandexMetrika;
