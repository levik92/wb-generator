import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  LOVABLE_API_KEY,
  GOOGLE_GEMINI_API_KEY,
  POLZA_AI_API_KEY,
  LOOKUP_AI_PROVIDER,
} from "../_shared/runtime-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_PROMPT = `Найди данные российской организации по ИНН: {inn}. Верни строго JSON без markdown, без комментариев:
{"name":"Полное наименование организации","inn":"{inn}","kpp":"КПП если есть или пустая строка","ogrn":"ОГРН если есть или пустая строка","legal_address":"Юридический адрес если знаешь или пустая строка","director_name":"ФИО руководителя если знаешь или пустая строка"}
Если не можешь найти организацию по этому ИНН, верни: {"error":"not_found"}`;

async function getPromptTemplate(): Promise<string> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_type', 'inn_lookup')
      .maybeSingle();
    
    if (data?.prompt_template) {
      console.log("[lookup-inn] Loaded prompt from DB");
      return data.prompt_template;
    }
  } catch (e) {
    console.error("[lookup-inn] Failed to load prompt from DB:", e);
  }
  console.log("[lookup-inn] Using default prompt");
  return DEFAULT_PROMPT;
}

/** Call AI via the Lovable gateway (backward-compatible default) */
async function callLovableGateway(prompt: string, systemPrompt: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not set");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      tools: [{ google_search_retrieval: {} }],
    }),
  });
  return res;
}

/** Call AI via Google Gemini directly */
async function callGeminiDirect(prompt: string, systemPrompt: string) {
  if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `[System Instructions]: ${systemPrompt}\n\n${prompt}` }] },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        tools: [{ google_search_retrieval: {} }],
      }),
    }
  );
  return res;
}

/** Call AI via Polza */
async function callPolza(prompt: string, systemPrompt: string) {
  if (!POLZA_AI_API_KEY) throw new Error("POLZA_AI_API_KEY is not set");

  const res = await fetch("https://polza.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POLZA_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      provider: { only: ["Google AI Studio"] },
    }),
  });
  return res;
}

/** Extract text content from AI response based on provider format */
function extractContent(provider: string, data: any): string | null {
  if (provider === "gemini") {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }
  // lovable and polza use OpenAI-compatible format
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const inn = body?.inn?.trim();
    console.log("[lookup-inn] Request for INN:", inn);

    if (!inn || !/^\d{10,12}$/.test(inn)) {
      return new Response(JSON.stringify({ error: "Некорректный ИНН. Введите 10 или 12 цифр." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const provider = LOOKUP_AI_PROVIDER; // "lovable" | "gemini" | "polza"
    console.log("[lookup-inn] Using provider:", provider);

    const promptTemplate = await getPromptTemplate();
    const prompt = promptTemplate.replace(/\{inn\}/g, inn);
    const systemPrompt = "Ты помощник для поиска данных организаций РФ. Используй поиск Google чтобы найти актуальные данные. Отвечай строго JSON без markdown.";

    let aiRes: Response;
    if (provider === "gemini") {
      aiRes = await callGeminiDirect(prompt, systemPrompt);
    } else if (provider === "polza") {
      aiRes = await callPolza(prompt, systemPrompt);
    } else {
      // Default: lovable gateway (backward compatible)
      aiRes = await callLovableGateway(prompt, systemPrompt);
    }

    console.log("[lookup-inn] AI response status:", aiRes.status);

    if (!aiRes.ok) {
      const errorBody = await aiRes.text();
      console.error("[lookup-inn] AI error body:", errorBody);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "ai_error", message: `AI returned ${aiRes.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const text = extractContent(provider, aiData);
    console.log("[lookup-inn] Raw AI text:", text);

    if (!text) {
      console.warn("[lookup-inn] AI returned empty content");
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract JSON from response (may have markdown backticks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[lookup-inn] No JSON found in AI response");
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("[lookup-inn] Parsed result:", JSON.stringify(parsed));

    if (parsed.error === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[lookup-inn] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "internal_error", message: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
