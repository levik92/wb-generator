import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const UTM_STORAGE_KEY = "wbgen_utm_source_id";
const VISITOR_ID_KEY = "wbgen_visitor_id";

// Capture UTM params + pathname at module load time, before React Router can strip them
const INITIAL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_UTM_SOURCE = INITIAL_PARAMS.get("utm_source");
const INITIAL_UTM_MEDIUM = INITIAL_PARAMS.get("utm_medium") || "";
const INITIAL_UTM_CAMPAIGN = INITIAL_PARAMS.get("utm_campaign") || "";
const INITIAL_PATHNAME = window.location.pathname || "/";

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getStoredUtmSourceId(): string | null {
  return localStorage.getItem(UTM_STORAGE_KEY);
}

/**
 * Score how well a UTM source candidate matches the incoming URL.
 * Higher = better match. Returns -1 if disqualified.
 */
function scoreCandidate(
  candidate: { utm_source: string; utm_medium: string | null; utm_campaign: string | null; base_url: string | null },
  source: string,
  medium: string,
  campaign: string,
  pathname: string
): number {
  // utm_source must match (case-insensitive)
  if (candidate.utm_source.toLowerCase() !== source.toLowerCase()) return -1;

  let score = 1; // baseline for source match

  const candMedium = (candidate.utm_medium || "").toLowerCase();
  const candCampaign = (candidate.utm_campaign || "").toLowerCase();
  const urlMedium = medium.toLowerCase();
  const urlCampaign = campaign.toLowerCase();

  // Medium match (both empty counts as match)
  if (candMedium === urlMedium) {
    score += 4;
  } else if (candMedium && urlMedium && candMedium !== urlMedium) {
    // Defined but different — penalize heavily so other candidates win
    score -= 10;
  }

  // Campaign match (both empty counts as match)
  if (candCampaign === urlCampaign) {
    score += 4;
  } else if (candCampaign && urlCampaign && candCampaign !== urlCampaign) {
    score -= 10;
  }

  // Pathname match (extract path from base_url)
  if (candidate.base_url) {
    try {
      const candPath = new URL(candidate.base_url).pathname.replace(/\/$/, "") || "/";
      const urlPath = pathname.replace(/\/$/, "") || "/";
      if (candPath === urlPath) {
        score += 2;
      } else if (candPath !== "/" && urlPath !== "/") {
        // Defined but different paths — small penalty
        score -= 1;
      }
    } catch {
      // ignore invalid URL
    }
  }

  return score;
}

/**
 * Track UTM visits. Call on any page that may receive UTM traffic.
 */
export function useUtmTracking() {
  useEffect(() => {
    if (!INITIAL_UTM_SOURCE) return;

    const trackVisit = async () => {
      try {
        // Fetch ALL candidates with this utm_source, then pick the best fit in code
        const { data: candidates, error } = await supabase
          .from("utm_sources")
          .select("id, utm_source, utm_medium, utm_campaign, base_url")
          .ilike("utm_source", INITIAL_UTM_SOURCE);

        if (error || !candidates || candidates.length === 0) return;

        // Score each candidate
        let best: { id: string; score: number } | null = null;
        for (const c of candidates) {
          const score = scoreCandidate(
            c,
            INITIAL_UTM_SOURCE,
            INITIAL_UTM_MEDIUM,
            INITIAL_UTM_CAMPAIGN,
            INITIAL_PATHNAME
          );
          if (score < 0) continue;
          if (!best || score > best.score) {
            best = { id: c.id, score };
          }
        }

        if (best) {
          localStorage.setItem(UTM_STORAGE_KEY, best.id);
          await recordVisit(best.id);
        }
      } catch (e) {
        console.error("UTM tracking error:", e);
      }
    };

    trackVisit();
  }, []);
}

async function recordVisit(utmSourceId: string) {
  const visitorId = getOrCreateVisitorId();
  
  const { error } = await supabase.from("utm_visits").insert({
    utm_source_id: utmSourceId,
    visitor_id: visitorId,
  });
  
  if (error) {
    console.error("UTM visit insert error:", error);
  }
}
