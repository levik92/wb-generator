import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find messages with attachments older than 7 days
    const { data: oldMessages } = await supabase
      .from("support_messages")
      .select("id, attachment_url")
      .not("attachment_url", "is", null)
      .lt("created_at", cutoff);

    if (!oldMessages || oldMessages.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract storage paths and delete files
    const paths: string[] = [];
    for (const msg of oldMessages) {
      if (msg.attachment_url) {
        const match = msg.attachment_url.match(/support-attachments\/(.+)$/);
        if (match) paths.push(match[1]);
      }
    }

    if (paths.length > 0) {
      await supabase.storage.from("support-attachments").remove(paths);
    }

    // Nullify attachment_url in DB
    const ids = oldMessages.map((m) => m.id);
    await supabase
      .from("support_messages")
      .update({ attachment_url: null })
      .in("id", ids);

    return new Response(JSON.stringify({ deleted: paths.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Cleanup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
