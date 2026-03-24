import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const UTM_STORAGE_KEY = "wbgen_utm_source_id";
const VISITOR_ID_KEY = "wbgen_visitor_id";

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
 * Track UTM visits. Call on any page that may receive UTM traffic.
 */
export function useUtmTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    
    if (!utmSource) return;

    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";

    const trackVisit = async () => {
      try {
        // Try exact match first (source + medium + campaign)
        const { data: exactMatch } = await supabase
          .from("utm_sources")
          .select("id")
          .eq("utm_source", utmSource)
          .eq("utm_medium", utmMedium)
          .eq("utm_campaign", utmCampaign)
          .limit(1)
          .maybeSingle();
        
        if (exactMatch) {
          localStorage.setItem(UTM_STORAGE_KEY, exactMatch.id);
          await recordVisit(exactMatch.id);
          return;
        }

        // Fallback: match just by utm_source
        const { data: fallback } = await supabase
          .from("utm_sources")
          .select("id")
          .eq("utm_source", utmSource)
          .limit(1)
          .maybeSingle();
        
        if (fallback) {
          localStorage.setItem(UTM_STORAGE_KEY, fallback.id);
          await recordVisit(fallback.id);
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
