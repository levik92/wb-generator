import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Admin access required");

    const encryptionKey = Deno.env.get("SUPPORT_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Encryption key not configured");

    const { action, conversation_id, message, status, attachment_url, offset, limit: reqLimit, before_id } = await req.json();

    const decryptMessages = async (messages: any[]) => {
      const results = [];
      for (const msg of messages) {
        try {
          const { data, error } = await supabase.rpc("decrypt_support_message_edge", {
            encrypted: msg.encrypted_content,
            enc_key: encryptionKey,
          });
          results.push({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_type: msg.sender_type,
            content: error ? "[Ошибка расшифровки]" : data,
            created_at: msg.created_at,
            attachment_url: msg.attachment_url || null,
          });
        } catch {
          results.push({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_type: msg.sender_type,
            content: "[Ошибка расшифровки]",
            created_at: msg.created_at,
            attachment_url: msg.attachment_url || null,
          });
        }
      }
      return results;
    };

    switch (action) {
      case "list_conversations": {
        const pageSize = reqLimit || 10;
        const pageOffset = offset || 0;

        const { data: conversations, error, count: totalCount } = await supabase
          .from("support_conversations")
          .select("*", { count: "exact" })
          .order("updated_at", { ascending: false })
          .range(pageOffset, pageOffset + pageSize - 1);

        if (error) throw error;

        const enriched = [];
        for (const conv of conversations || []) {
          const { data: lastMsg } = await supabase
            .from("support_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let lastMessageText = "";
          if (lastMsg) {
            const { data: decrypted } = await supabase.rpc("decrypt_support_message_edge", {
              encrypted: lastMsg.encrypted_content,
              enc_key: encryptionKey,
            });
            lastMessageText = decrypted || "";
          }

          let userEmail = null;
          if (conv.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", conv.user_id)
              .single();
            userEmail = profile?.email;
          }

          const { count: msgCount } = await supabase
            .from("support_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id);

          enriched.push({
            ...conv,
            last_message: lastMessageText,
            last_message_sender: lastMsg?.sender_type,
            last_message_at: lastMsg?.created_at,
            user_email: userEmail,
            message_count: msgCount || 0,
          });
        }

        return new Response(JSON.stringify({ conversations: enriched, total: totalCount || 0, hasMore: (pageOffset + pageSize) < (totalCount || 0) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_messages": {
        if (!conversation_id) throw new Error("Missing conversation_id");

        const { data: msgs, error } = await supabase
          .from("support_messages")
          .select("*")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const decrypted = await decryptMessages(msgs || []);

        return new Response(JSON.stringify({ messages: decrypted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_message": {
        if (!conversation_id || !message) throw new Error("Missing data");

        // Encrypt admin message
        const { data: encData } = await supabase.rpc("encrypt_support_message_edge", {
          content: message,
          enc_key: encryptionKey,
        });

        await supabase.from("support_messages").insert({
          conversation_id,
          sender_type: "admin",
          encrypted_content: encData,
          ...(attachment_url ? { attachment_url } : {}),
        });

        // Disable AI when admin responds
        await supabase
          .from("support_conversations")
          .update({
            ai_enabled: false,
            needs_admin_attention: false,
            status: "active",
          })
          .eq("id", conversation_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_status": {
        if (!conversation_id || !status) throw new Error("Missing data");

        await supabase
          .from("support_conversations")
          .update({ status })
          .eq("id", conversation_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_ai": {
        if (!conversation_id) throw new Error("Missing conversation_id");

        const { data: conv } = await supabase
          .from("support_conversations")
          .select("ai_enabled")
          .eq("id", conversation_id)
          .single();

        await supabase
          .from("support_conversations")
          .update({ ai_enabled: !conv?.ai_enabled })
          .eq("id", conversation_id);

        return new Response(JSON.stringify({ ai_enabled: !conv?.ai_enabled }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_attention_count": {
        const { count } = await supabase
          .from("support_conversations")
          .select("id", { count: "exact", head: true })
          .eq("needs_admin_attention", true);

        return new Response(JSON.stringify({ count: count || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("support-admin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
