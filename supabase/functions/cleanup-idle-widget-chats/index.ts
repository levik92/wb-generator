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

    const encryptionKey = Deno.env.get("SUPPORT_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Encryption key not configured");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Get active widget conversations that don't need admin attention
    const { data: candidates, error: fetchErr } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("channel", "widget")
      .eq("needs_admin_attention", false)
      .neq("status", "closed");

    if (fetchErr) throw fetchErr;

    let closedCount = 0;

    for (const conv of candidates || []) {
      // Get last message
      const { data: lastMsg } = await supabase
        .from("support_messages")
        .select("sender_type, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Close if last message is from AI and older than 1 hour
      if (lastMsg && lastMsg.sender_type === "ai" && lastMsg.created_at < oneHourAgo) {
        // Insert system message
        const closeMsg = "Диалог автоматически закрыт — прошло более часа без ответа. Если у вас остались вопросы, просто напишите новое сообщение.";
        const { data: encrypted } = await supabase.rpc("encrypt_support_message_edge", {
          content: closeMsg,
          enc_key: encryptionKey,
        });

        await supabase.from("support_messages").insert({
          conversation_id: conv.id,
          sender_type: "system",
          encrypted_content: encrypted,
        });

        await supabase
          .from("support_conversations")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", conv.id);

        closedCount++;
      }
    }

    console.log(`Auto-closed ${closedCount} idle widget conversations`);

    return new Response(JSON.stringify({ success: true, closed: closedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-idle-widget-chats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
