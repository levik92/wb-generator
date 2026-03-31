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

    const { action, conversation_id, message, visitor_id, user_id, channel, attachment_url, before_id, limit: reqLimit } = await req.json();

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
        const convChannel = channel || "widget";
        
        // Get AI default for this channel
        const { data: aiDefault } = await supabase
          .from("support_ai_defaults")
          .select("ai_enabled")
          .eq("channel", convChannel)
          .maybeSingle();
        
        const aiEnabled = aiDefault?.ai_enabled ?? (convChannel === "widget");

        const { data: conv, error } = await supabase
          .from("support_conversations")
          .insert({
            visitor_id: visitor_id || null,
            user_id: user_id || null,
            channel: convChannel,
            status: "active",
            ai_enabled: aiEnabled,
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

        // If conversation was closed, reopen it
        if (convData?.status === "closed") {
          await supabase
            .from("support_conversations")
            .update({
              status: "active",
              needs_admin_attention: true,
            })
            .eq("id", conversation_id);
        } else {
          // Mark as needing attention for active conversations too
          await supabase
            .from("support_conversations")
            .update({ needs_admin_attention: true })
            .eq("id", conversation_id);
        }

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

            // Check API provider setting
            const { data: modelSettings } = await supabase
              .from("ai_model_settings")
              .select("api_provider")
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const apiProvider = (modelSettings as any)?.api_provider || 'direct';
            
            let aiUrl: string;
            let aiHeaders: Record<string, string>;

            if (apiProvider === 'polza') {
              const polzaApiKey = Deno.env.get("POLZA_AI_API_KEY");
              if (!polzaApiKey) throw new Error("POLZA_AI_API_KEY not configured");
              aiUrl = "https://polza.ai/api/v1/chat/completions";
              aiHeaders = {
                Authorization: `Bearer ${polzaApiKey}`,
                "Content-Type": "application/json",
              };
            } else {
              const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
              if (!geminiApiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured");
              aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${geminiApiKey}`;
              aiHeaders = {
                "Content-Type": "application/json",
              };
            }

            let aiResp: Response;

            if (apiProvider === 'direct') {
              // Direct Gemini API uses different format
              const geminiMessages = messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
                parts: [{ text: m.role === 'system' ? `[System Instructions]: ${m.content}` : m.content }],
              }));

              aiResp = await fetch(aiUrl, {
                method: "POST",
                headers: aiHeaders,
                body: JSON.stringify({
                  contents: geminiMessages,
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                  },
                }),
              });
            } else {
              aiResp = await fetch(aiUrl, {
                method: "POST",
                headers: aiHeaders,
                body: JSON.stringify({
                  model: 'google/gemini-3.1-pro-preview',
                  messages,
                  stream: false,
                  provider: {
                    only: ["Google AI Studio"],
                  },
                }),
              });
            }

            if (!aiResp.ok) {
              console.error("AI gateway error:", aiResp.status, await aiResp.text());
              throw new Error("AI gateway error");
            }

            const aiData = await aiResp.json();
            let aiContent = '';
            if (apiProvider === 'direct') {
              aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
              aiContent = aiData.choices?.[0]?.message?.content || '';
            }

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
                  ai_enabled: false,
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

        const pageSize = reqLimit || 15;

        let query = supabase
          .from("support_messages")
          .select("*", { count: "exact" })
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: false })
          .limit(pageSize);

        if (before_id) {
          const { data: refMsg } = await supabase
            .from("support_messages")
            .select("created_at")
            .eq("id", before_id)
            .single();
          if (refMsg) {
            query = query.lt("created_at", refMsg.created_at);
          }
        }

        const { data: msgs, error, count: totalCount } = await query;
        if (error) throw error;

        const sorted = (msgs || []).reverse();
        const decrypted = await decryptMessages(sorted);

        return new Response(JSON.stringify({ messages: decrypted, total: totalCount || 0, hasMore: (msgs?.length || 0) === pageSize }), {
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
