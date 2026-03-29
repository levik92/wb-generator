import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    if (!LOVABLE_API_KEY) {
      console.error("[lookup-inn] LOVABLE_API_KEY is not set");
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const promptTemplate = await getPromptTemplate();
    const prompt = promptTemplate.replace(/\{inn\}/g, inn);
    console.log("[lookup-inn] Prompt length:", prompt.length);

    console.log("[lookup-inn] Calling AI gateway...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Ты помощник для поиска данных организаций РФ. Используй поиск Google чтобы найти актуальные данные. Отвечай строго JSON без markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        tools: [{ google_search_retrieval: {} }],
      }),
    });

    console.log("[lookup-inn] AI response status:", aiRes.status);

    if (!aiRes.ok) {
      const errorBody = await aiRes.text();
      console.error("[lookup-inn] AI gateway error body:", errorBody);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "ai_error", message: `AI returned ${aiRes.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const text = aiData?.choices?.[0]?.message?.content?.trim();
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
