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

    const encryptionKey = Deno.env.get("SUPPORT_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Encryption key not configured");

    const { action, conversation_id, message, visitor_id, user_id, channel, attachment_url } = await req.json();

    // Helper: encrypt message
    const encrypt = async (text: string) => {
      const { data, error } = await supabase.rpc("encrypt_support_message_edge", {
        content: text,
        enc_key: encryptionKey,
      });
      if (error) throw error;
      return data;
    };

    // Helper: decrypt messages
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
      case "create_conversation": {
        const { data: conv, error } = await supabase
          .from("support_conversations")
          .insert({
            visitor_id: visitor_id || null,
            user_id: user_id || null,
            channel: channel || "widget",
            status: "active",
            ai_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Send system welcome message for dashboard channel
        if (channel === "dashboard") {
          const welcomeText = "Ваше сообщение зафиксировано! Менеджер скоро вам ответит.";
          const { data: encData } = await supabase.rpc("encrypt_support_message_edge", {
            content: welcomeText,
            enc_key: encryptionKey,
          });
          await supabase.from("support_messages").insert({
            conversation_id: conv.id,
            sender_type: "system",
            encrypted_content: encData,
          });
        }

        return new Response(JSON.stringify({ conversation: conv }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_message": {
        if (!conversation_id || !message) throw new Error("Missing conversation_id or message");

        // Encrypt and store user message
        const { data: encData } = await supabase.rpc("encrypt_support_message_edge", {
          content: message,
          enc_key: encryptionKey,
        });

        await supabase.from("support_messages").insert({
          conversation_id,
          sender_type: "user",
          encrypted_content: encData,
          ...(attachment_url ? { attachment_url } : {}),
        });

        // Check if this is the first user message in a dashboard conversation
        const { data: convData } = await supabase
          .from("support_conversations")
          .select("channel, ai_enabled, status")
          .eq("id", conversation_id)
          .single();

        // Count existing user messages
        const { count: msgCount } = await supabase
          .from("support_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation_id)
          .eq("sender_type", "user");

        // If first message in dashboard, send system notification
        if (convData?.channel === "dashboard" && msgCount === 1) {
          const systemMsg = "Ваше сообщение зафиксировано! Менеджер скоро вам ответит.";
          const { data: sysEnc } = await supabase.rpc("encrypt_support_message_edge", {
            content: systemMsg,
            enc_key: encryptionKey,
          });
          await supabase.from("support_messages").insert({
            conversation_id,
            sender_type: "system",
            encrypted_content: sysEnc,
          });
        }

        // If AI is enabled (widget), get AI response
        let aiResponse = null;
        if (convData?.ai_enabled) {
          try {
            // Get conversation history for context
            const { data: history } = await supabase
              .from("support_messages")
              .select("*")
              .eq("conversation_id", conversation_id)
              .order("created_at", { ascending: true })
              .limit(20);

            const decryptedHistory = await decryptMessages(history || []);

            // Get AI prompt from ai_prompts table
            const { data: promptData } = await supabase
              .from("ai_prompts")
              .select("prompt_template")
              .eq("prompt_type", "support_ai")
              .eq("model_type", "support")
              .single();

            const systemPrompt = promptData?.prompt_template || "Ты — ассистент поддержки WBGen. Отвечай кратко и по делу на русском языке.";

            const messages = [
              { role: "system", content: systemPrompt },
              ...decryptedHistory
                .filter((m) => m.sender_type !== "system")
                .map((m) => ({
                  role: m.sender_type === "user" ? "user" : "assistant",
                  content: m.content,
                })),
            ];

            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.1-pro-preview",
                messages,
                stream: false,
              }),
            });

            if (!aiResp.ok) {
              console.error("AI gateway error:", aiResp.status, await aiResp.text());
              throw new Error("AI gateway error");
            }

            const aiData = await aiResp.json();
            const aiContent = aiData.choices?.[0]?.message?.content || "";

            // Check for escalation
            const needsEscalation = aiContent.includes("[ESCALATE]");
            const cleanContent = aiContent.replace(/\[ESCALATE\]/g, "").trim();

            // Store AI response
            if (cleanContent) {
              const { data: aiEnc } = await supabase.rpc("encrypt_support_message_edge", {
                content: cleanContent,
                enc_key: encryptionKey,
              });
              await supabase.from("support_messages").insert({
                conversation_id,
                sender_type: "ai",
                encrypted_content: aiEnc,
              });
              aiResponse = cleanContent;
            }

            // Handle escalation
            if (needsEscalation) {
              await supabase
                .from("support_conversations")
                .update({
                  needs_admin_attention: true,
                  status: "waiting_for_admin",
                  admin_notified_at: new Date().toISOString(),
                })
                .eq("id", conversation_id);

              // Add system message about escalation
              const escalationMsg = "Я передал ваш вопрос менеджеру. Он скоро подключится к чату.";
              const { data: escEnc } = await supabase.rpc("encrypt_support_message_edge", {
                content: escalationMsg,
                enc_key: encryptionKey,
              });
              await supabase.from("support_messages").insert({
                conversation_id,
                sender_type: "system",
                encrypted_content: escEnc,
              });
            }
          } catch (aiError) {
            console.error("AI response error:", aiError);
            // Continue without AI response
          }
        }

        return new Response(JSON.stringify({ success: true, ai_response: aiResponse }), {
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

      case "get_conversation": {
        const query = supabase.from("support_conversations").select("*");
        
        if (conversation_id) {
          const { data, error } = await query.eq("id", conversation_id).single();
          if (error) throw error;
          return new Response(JSON.stringify({ conversation: data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (visitor_id) {
          const { data, error } = await query
            .eq("visitor_id", visitor_id)
            .eq("channel", "widget")
            .neq("status", "closed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return new Response(JSON.stringify({ conversation: data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (user_id) {
          const { data, error } = await query
            .eq("user_id", user_id)
            .eq("channel", "dashboard")
            .neq("status", "closed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return new Response(JSON.stringify({ conversation: data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error("Need conversation_id, visitor_id, or user_id");
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
