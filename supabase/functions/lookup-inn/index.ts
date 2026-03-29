import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

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

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Найди данные российской организации по ИНН: ${inn}. Верни строго JSON без markdown, без комментариев:
{"name":"Полное наименование организации","inn":"${inn}","kpp":"КПП если есть или пустая строка","ogrn":"ОГРН если есть или пустая строка","legal_address":"Юридический адрес если знаешь или пустая строка","director_name":"ФИО руководителя если знаешь или пустая строка"}
Если не можешь найти организацию по этому ИНН, верни: {"error":"not_found"}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.error("Gemini API error:", geminiRes.status);
      return new Response(JSON.stringify({ error: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

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
