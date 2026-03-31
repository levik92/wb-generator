import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLZA_BASE_URL = 'https://polza.ai/api/v1';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const polzaApiKey = Deno.env.get("POLZA_AI_API_KEY");

    if (!polzaApiKey) {
      throw new Error("POLZA_AI_API_KEY not configured");
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { image_url, user_prompt } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pricing
    const { data: pricingData } = await adminClient
      .from("generation_pricing")
      .select("tokens_cost")
      .eq("price_type", "video_generation")
      .single();
    const tokensCost = pricingData?.tokens_cost ?? 10;

    // Check balance
    const { data: profile } = await adminClient
      .from("profiles")
      .select("tokens_balance")
      .eq("id", userId)
      .single();

    if (!profile || profile.tokens_balance < tokensCost) {
      return new Response(
        JSON.stringify({ error: "Insufficient tokens", required: tokensCost, balance: profile?.tokens_balance ?? 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Spend tokens
    const { data: spendResult } = await adminClient.rpc("spend_tokens", {
      user_id_param: userId,
      tokens_amount: tokensCost,
    });
    if (!spendResult) {
      return new Response(JSON.stringify({ error: "Failed to spend tokens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get prompt
    const { data: promptData } = await adminClient
      .from("ai_prompts")
      .select("prompt_template")
      .eq("prompt_type", "video_cover")
      .eq("model_type", "kling")
      .single();
    let prompt = promptData?.prompt_template || "A smooth, cinematic product showcase animation.";
    if (user_prompt && typeof user_prompt === "string" && user_prompt.trim().length > 0) {
      prompt = `${prompt} User wishes: ${user_prompt.trim().slice(0, 150)}`;
    }
    if (prompt.length > 2500) {
      prompt = prompt.slice(0, 2500);
    }

    // Call Polza Media API with Kling model
    console.log("[create-video-job-polza] Calling Polza Media API for video generation");
    const mediaResponse = await fetch(`${POLZA_BASE_URL}/media`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${polzaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling/v3",
        input: {
          prompt,
          images: [{ type: "url", data: image_url }],
          aspect_ratio: "9:16",
          duration: "5",
          mode: "std",
          sound: "false",
        },
        async: true,
      }),
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error("[create-video-job-polza] Polza API error:", mediaResponse.status, errorText);
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: `Ошибка Polza API: ${mediaResponse.status}`,
      });
      return new Response(
        JSON.stringify({ error: "Polza API error", refunded: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaResult = await mediaResponse.json();
    console.log("[create-video-job-polza] Polza response:", JSON.stringify(mediaResult));

    if (!mediaResult.id) {
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: "Нет ID задачи от Polza API",
      });
      return new Response(
        JSON.stringify({ error: "No task ID from Polza", refunded: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save job to DB - store polza generation ID in kling_task_id field
    const { data: job, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .insert({
        user_id: userId,
        status: "processing",
        product_image_url: image_url,
        kling_task_id: mediaResult.id, // Polza generation ID
        tokens_cost: tokensCost,
        prompt,
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("Error saving job:", jobError);
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: "Ошибка сохранения задачи видео (Polza)",
      });
      return new Response(JSON.stringify({ error: "Failed to save job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ job_id: job.id, task_id: mediaResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-video-job-polza:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
