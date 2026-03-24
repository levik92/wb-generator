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

export function useUtmTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    
    if (!utmSource) return;

    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";

    const trackVisit = async () => {
      try {
        // Find matching utm_source record
        let query = supabase
          .from("utm_sources")
          .select("id")
          .eq("utm_source", utmSource);
        
        if (utmMedium) query = query.eq("utm_medium", utmMedium);
        if (utmCampaign) query = query.eq("utm_campaign", utmCampaign);
        
        const { data } = await query.limit(1).single();
        
        if (!data) {
          // Fallback: match just by utm_source
          const { data: fallback } = await supabase
            .from("utm_sources")
            .select("id")
            .eq("utm_source", utmSource)
            .limit(1)
            .single();
          
          if (!fallback) return;
          
          localStorage.setItem(UTM_STORAGE_KEY, fallback.id);
          await recordVisit(fallback.id);
          return;
        }

        localStorage.setItem(UTM_STORAGE_KEY, data.id);
        await recordVisit(data.id);
      } catch (e) {
        // Silent fail - tracking should never break the app
        console.error("UTM tracking error:", e);
      }
    };

    trackVisit();
  }, []);
}

async function recordVisit(utmSourceId: string) {
  const visitorId = getOrCreateVisitorId();
  
  await supabase.from("utm_visits").insert({
    utm_source_id: utmSourceId,
    visitor_id: visitorId,
  });
}
