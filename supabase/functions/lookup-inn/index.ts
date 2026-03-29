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
    
    if (data?.prompt_template) return data.prompt_template;
  } catch (e) {
    console.error("Failed to load prompt from DB:", e);
  }
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

    if (!inn || !/^\d{10,12}$/.test(inn)) {
      return new Response(JSON.stringify({ error: "Некорректный ИНН. Введите 10 или 12 цифр." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const promptTemplate = await getPromptTemplate();
    const prompt = promptTemplate.replace(/\{inn\}/g, inn);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: "Ты помощник для поиска данных организаций РФ. Отвечай строго JSON без markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!aiRes.ok) {
      console.error("AI gateway error:", aiRes.status);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const text = aiData?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract JSON from response (may have markdown backticks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.error === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("lookup-inn error:", error);
    return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
