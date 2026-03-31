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

    const { original_job_id, user_prompt } = await req.json();
    if (!original_job_id) {
      return new Response(JSON.stringify({ error: "original_job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get original job and verify ownership
    const { data: originalJob, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .select("product_image_url, user_id, parent_job_id")
      .eq("id", original_job_id)
      .eq("user_id", userId)
      .single();

    if (jobError || !originalJob) {
      return new Response(JSON.stringify({ error: "Original job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = originalJob.product_image_url;
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Original job has no image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get regeneration pricing
    const { data: pricingData } = await adminClient
      .from("generation_pricing")
      .select("tokens_cost")
      .eq("price_type", "video_regeneration")
      .single();
    const tokensCost = pricingData?.tokens_cost ?? 2;

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

    // Get prompt template
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

    // Call Polza Media API
    console.log("[regenerate-video-job-polza] Calling Polza Media API");
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
          images: [{ type: "url", data: imageUrl }],
          aspect_ratio: "9:16",
          duration: 5,
          mode: "std",
          sound: "false",
        },
        async: true,
      }),
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error("[regenerate-video-job-polza] Polza API error:", mediaResponse.status, errorText);
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: `Ошибка Polza API (перегенерация): ${mediaResponse.status}`,
      });
      return new Response(
        JSON.stringify({ error: "Polza API error", refunded: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaResult = await mediaResponse.json();
    console.log("[regenerate-video-job-polza] Polza response:", JSON.stringify(mediaResult));

    if (!mediaResult.id) {
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: "Нет ID задачи от Polza (перегенерация)",
      });
      return new Response(
        JSON.stringify({ error: "No task ID from Polza", refunded: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine root parent for clustering
    const rootParentId = originalJob.parent_job_id || original_job_id;

    // Save new job to DB
    const { data: job, error: saveError } = await adminClient
      .from("video_generation_jobs")
      .insert({
        user_id: userId,
        status: "processing",
        product_image_url: imageUrl,
        kling_task_id: mediaResult.id,
        tokens_cost: tokensCost,
        prompt,
        parent_job_id: rootParentId,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Error saving regeneration job:", saveError);
      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: "Ошибка сохранения задачи перегенерации видео (Polza)",
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
    console.error("Error in regenerate-video-job-polza:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
