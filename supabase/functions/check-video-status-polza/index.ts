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

    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job and verify ownership
    const { data: job, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", userId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed or failed, return current state
    if (job.status === "completed" || job.status === "failed") {
      return new Response(
        JSON.stringify({
          status: job.status,
          video_url: job.result_video_url,
          error_message: job.error_message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job.kling_task_id) {
      return new Response(JSON.stringify({ error: "No Polza task ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll Polza Media API
    const polzaResponse = await fetch(`${POLZA_BASE_URL}/media/${job.kling_task_id}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${polzaApiKey}` },
    });

    if (!polzaResponse.ok) {
      console.error("[check-video-status-polza] Polza API error:", polzaResponse.status);
      return new Response(
        JSON.stringify({ status: "processing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const polzaResult = await polzaResponse.json();
    console.log("[check-video-status-polza] Status:", polzaResult.status);

    if (polzaResult.status === "completed") {
      // Extract video URL from data
      let videoUrl: string | null = null;
      if (typeof polzaResult.data === 'string') {
        videoUrl = polzaResult.data;
      } else if (Array.isArray(polzaResult.data) && polzaResult.data.length > 0) {
        const first = polzaResult.data[0];
        videoUrl = typeof first === 'string' ? first : first?.url || null;
      } else if (polzaResult.data?.url) {
        videoUrl = polzaResult.data.url;
      }

      await adminClient
        .from("video_generation_jobs")
        .update({
          status: "completed",
          result_video_url: videoUrl,
        })
        .eq("id", job_id);

      return new Response(
        JSON.stringify({ status: "completed", video_url: videoUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (polzaResult.status === "failed" || polzaResult.status === "cancelled") {
      const errorMsg = polzaResult.error?.message || "Video generation failed";

      await adminClient
        .from("video_generation_jobs")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", job_id);

      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: job.tokens_cost,
        reason_text: `Ошибка видеогенерации (Polza): ${errorMsg}`,
      });

      return new Response(
        JSON.stringify({ status: "failed", error_message: errorMsg, refunded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Still processing
    return new Response(
      JSON.stringify({ status: "processing" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-video-status-polza:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
